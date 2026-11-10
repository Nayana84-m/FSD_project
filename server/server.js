const http = require("node:http");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { connectDatabase, readDb, writeDb, closeDatabase, databaseStatus, secureUserPassword, verifyUserPassword } = require("./db");

const port = Number(process.env.PORT || 3000);
const sessions = new Map();
const projectRoot = path.join(__dirname, "..");
const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".ico": "image/x-icon" };

function serveApp(request, response, pathname) {
  const requestedPath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.resolve(projectRoot, `.${requestedPath}`);
  const relativePath = path.relative(projectRoot, filePath);
  const pathParts = relativePath.split(path.sep);
  const publicAsset = ["assets", "css", "js"].includes(pathParts[0]) && pathParts.every(part => part && !part.startsWith("."));
  if (relativePath !== "index.html" && !publicAsset) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" });
    return response.end("Not found");
  }
  fs.readFile(filePath, (error, contents) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain; charset=utf-8" });
      return response.end(error.code === "ENOENT" ? "Not found" : "Unable to load the application");
    }
    response.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY"
    });
    response.end(contents);
  });
}

function sendJson(response, status, payload) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  };
  if (process.env.CLIENT_ORIGIN) headers["Access-Control-Allow-Origin"] = process.env.CLIENT_ORIGIN;
  response.writeHead(status, headers);
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 100_000) reject(new Error("Request body too large"));
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("Request body must be valid JSON")); }
    });
    request.on("error", reject);
  });
}

const AVAILABILITY_BLOCKS = [
  { key: "morning", start: 8 * 60, end: 13 * 60 },
  { key: "afternoon", start: 13 * 60, end: 18 * 60 },
  { key: "evening", start: 18 * 60, end: 22 * 60 }
];

function shiftAvailabilitySlots(shift) {
  if (Array.isArray(shift?.timeSlots) && shift.timeSlots.length) return shift.timeSlots;
  const start = Number(shift?.startMinutes);
  const end = Number(shift?.endMinutes);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const slots = AVAILABILITY_BLOCKS.filter(block => start < block.end && end > block.start).map(block => block.key);
    if (slots.length) return slots;
  }
  return [shift?.timeSlot].filter(Boolean);
}

function validateAssignment(worker, shift) {
  if (!worker || !shift) return { valid: false, message: "Worker or shift not found." };
  const skillMatch = (worker.certifications || []).includes(shift.requiredRole);
  const slotStatuses = shiftAvailabilitySlots(shift).map(slot => worker.availability?.[shift.day]?.[slot] || "available");
  const available = slotStatuses.every(status => status === "available" || status === "preferred");
  const withinHours = Number(worker.currentAssignedHours || 0) + Number(shift.duration) <= Number(worker.maxWeeklyHours || 0);
  const failedChecks = [!skillMatch && "required skill", !available && "availability", !withinHours && "weekly hours"].filter(Boolean);
  return {
    valid: failedChecks.length === 0,
    message: failedChecks.length === 0 ? "Assignment approved." : `Assignment blocked by ${failedChecks.join(", ")} policy.`
  };
}

function publicUser(user, db) {
  const result = { id: user.id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId || "" };
  if (user.role === "employee") {
    result.workerId = user.workerId || user.id;
    result.businessName = findUserWorkspace(db, user)?.businessName || "";
  }
  if (user.role === "manager") {
    result.businessName = user.businessName || `${user.name}'s Cafe`;
    result.joinCode = user.joinCode || "";
  }
  return result;
}

function findUserWorkspace(db, user) {
  return db.workspaces?.find(item => item.id === user.workspaceId || item.managerId === user.id);
}

function targetWorkspaceWorker(db, user) {
  const workspace = findUserWorkspace(db, user);
  return workspace?.workers.find(worker => worker.userId === user.id || worker.id === user.workerId || worker.id === user.id);
}

function makeInviteCode(db) {
  const usedCodes = new Set((db.users || []).map(user => user.joinCode).filter(Boolean));
  let code;
  do { code = crypto.randomBytes(4).toString("hex").toUpperCase(); } while (usedCodes.has(code));
  return code;
}

function cloneWorkspaceData(db, manager) {
  return {
    id: manager.workspaceId,
    managerId: manager.id,
    businessName: manager.businessName,
    joinCode: manager.joinCode,
    workers: [],
    shifts: [],
    leaveRequests: [],
    rosterStatus: "draft",
    publishedAt: null
  };
}

async function handle(request, response) {
  if (request.method === "OPTIONS") return sendJson(response, 204, {});
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (request.method === "GET" && !url.pathname.startsWith("/api/")) return serveApp(request, response, url.pathname);
  const parts = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/api/health") {
    try {
      return sendJson(response, 200, { ok: true, service: "smartshift-api", database: await databaseStatus() });
    } catch {
      return sendJson(response, 503, { ok: false, service: "smartshift-api", database: "unavailable" });
    }
  }
  const db = await readDb();

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(request);
    const user = db.users.find(item => item.email.toLowerCase() === String(body.email || "").toLowerCase() && item.role === body.role);
    if (!user || !(await verifyUserPassword(user, body.password || ""))) return sendJson(response, 401, { error: "Invalid email, password, or role." });
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, { userId: user.id, workerId: user.workerId || user.id, role: user.role, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return sendJson(response, 200, { data: { token, user: publicUser(user, db) } });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/signup") {
    const body = await readBody(request);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!name || !email || !password || !["employee", "manager"].includes(body.role)) return sendJson(response, 400, { error: "Name, email, password, and role are required." });
    if (name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(response, 400, { error: "Enter a valid name and email address." });
    if (body.role === "manager" && !String(body.businessName || "").trim()) return sendJson(response, 400, { error: "Enter your cafe or business name." });
    if (body.role === "employee" && !String(body.joinCode || "").trim()) return sendJson(response, 400, { error: "Enter the invite code from your manager." });
    if (password.length < 8) return sendJson(response, 400, { error: "Password must be at least 8 characters." });
    if (db.users.some(item => item.email.toLowerCase() === email)) return sendJson(response, 409, { error: "An account with this email already exists." });
    const user = { id: `${body.role}-${crypto.randomUUID()}`, name, email, role: body.role, password };
    if (body.role === "manager") {
      user.businessName = String(body.businessName).trim();
      user.workspaceId = user.id;
      user.joinCode = makeInviteCode(db);
    } else {
      const manager = db.users.find(item => item.role === "manager" && item.joinCode === String(body.joinCode || "").trim().toUpperCase());
      if (!manager) return sendJson(response, 400, { error: "That invite code was not recognized. Ask your manager for the current code." });
      user.workspaceId = manager.workspaceId;
      const targetWorkspace = findUserWorkspace(db, manager);
      const email = user.email;
      const invitedWorker = targetWorkspace?.workers.find(worker => String(worker.email || "").trim().toLowerCase() === email && !worker.userId);
      user.workerId = invitedWorker?.id || user.id;
      if (invitedWorker) invitedWorker.userId = user.id;
    }
    await secureUserPassword(user);
    db.users.push(user);
    if (body.role === "manager") {
      db.workspaces ||= [];
      db.workspaces.push(cloneWorkspaceData(db, user));
    } else {
      const worker = targetWorkspaceWorker(db, user) || { id: user.workerId || user.id, name: user.name, role: "Staff member", certifications: [], maxWeeklyHours: 25, currentAssignedHours: 0, hourlyRate: 200, availability: {} };
      worker.userId = user.id;
      worker.name = user.name;
      const workspace = findUserWorkspace(db, user);
      if (workspace && !workspace.workers.some(item => item.id === worker.id)) workspace.workers.push(worker);
      const legacyWorkerIndex = db.workers.findIndex(item => item.id === worker.id);
      if (legacyWorkerIndex >= 0) db.workers[legacyWorkerIndex] = structuredClone(worker);
      else db.workers.push(structuredClone(worker));
    }
    db.auditLog.push({ action: "user.created", userId: user.id, role: user.role, at: new Date().toISOString() });
    await writeDb(db);
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, { userId: user.id, workerId: user.workerId || user.id, role: user.role, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return sendJson(response, 201, { data: { token, user: publicUser(user, db) } });
  }

  const auth = request.headers.authorization?.replace("Bearer ", "");
  if (!auth || !sessions.has(auth) || sessions.get(auth).expiresAt < Date.now()) return sendJson(response, 401, { error: "Authentication required." });
  const session = sessions.get(auth);
  const sessionUser = db.users.find(item => item.id === session.userId);
  const workspace = sessionUser && findUserWorkspace(db, sessionUser);

  if (request.method === "GET" && url.pathname === "/api/workspace") {
    if (!workspace) return sendJson(response, 404, { error: "Your cafe workspace was not found." });
    if (session.role === "manager") return sendJson(response, 200, { data: { workspace } });
    return sendJson(response, 200, { data: { workspace: {
      id: workspace.id,
      businessName: workspace.businessName,
      workers: workspace.workers.filter(worker => worker.userId === session.userId || worker.id === session.workerId),
      shifts: workspace.rosterStatus === "published" ? workspace.shifts.filter(shift => shift.assignedWorkerId === session.workerId) : [],
      leaveRequests: workspace.leaveRequests.filter(item => item.workerId === session.workerId),
      rosterStatus: workspace.rosterStatus,
      publishedAt: workspace.publishedAt
    } } });
  }

  if (request.method === "GET" && url.pathname === "/api/workers") {
    if (!workspace) return sendJson(response, 404, { error: "Your cafe workspace was not found." });
    const workers = session.role === "manager" ? workspace.workers : workspace.workers.filter(worker => worker.userId === session.userId || worker.id === session.workerId);
    return sendJson(response, 200, { data: workers });
  }

  if (request.method === "GET" && url.pathname === "/api/shifts") {
    if (!workspace) return sendJson(response, 404, { error: "Your cafe workspace was not found." });
    const shifts = session.role === "manager" ? workspace.shifts : workspace.rosterStatus === "published" ? workspace.shifts.filter(shift => shift.assignedWorkerId === session.workerId) : [];
    return sendJson(response, 200, { data: shifts });
  }

  if (request.method === "PUT" && url.pathname === "/api/workspace") {
    if (session.role !== "manager" || !workspace) return sendJson(response, 403, { error: "Only a manager can update this cafe workspace." });
    const body = await readBody(request);
    if (!Array.isArray(body.workers) || !Array.isArray(body.shifts)) return sendJson(response, 400, { error: "Workspace data is incomplete." });
    const currentWorkers = new Map(workspace.workers.map(worker => [worker.id, worker]));
    const workerIds = new Set();
    if (body.workers.length > 250 || body.shifts.length > 1000) return sendJson(response, 400, { error: "This cafe has reached the supported team or roster size." });
    for (const worker of body.workers) {
      if (!worker || typeof worker.id !== "string" || !worker.id.trim() || workerIds.has(worker.id)) return sendJson(response, 400, { error: "A team member has invalid or duplicate details." });
      workerIds.add(worker.id);
    }
    workspace.workers = body.workers.map(worker => {
      const current = currentWorkers.get(worker.id);
      if (!current) return worker;
      return {
        ...worker,
        userId: current.userId || worker.userId,
        name: current.name,
        email: current.email || worker.email,
        role: current.role,
        certifications: current.certifications,
        maxWeeklyHours: current.maxWeeklyHours,
        currentAssignedHours: current.currentAssignedHours,
        hourlyRate: current.hourlyRate,
        availability: current.availability,
        leaveBalance: current.leaveBalance
      };
    });
    const currentShifts = new Map(workspace.shifts.map(shift => [shift.id, shift]));
    const allowedDays = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
    const allowedRoles = new Set(["Barista", "Cashier", "Food Safety", "Shift Lead", "Kitchen Prep"]);
    const shiftIds = new Set();
    for (const shift of body.shifts) {
      if (!shift || typeof shift.id !== "string" || !shift.id.trim() || shiftIds.has(shift.id) || !allowedDays.has(shift.day) || !allowedRoles.has(shift.requiredRole) || !Number.isFinite(Number(shift.duration)) || Number(shift.duration) <= 0 || Number(shift.duration) > 12 || typeof shift.timeLabel !== "string" || shift.timeLabel.length > 80 || (shift.timeSlots && (!Array.isArray(shift.timeSlots) || shift.timeSlots.some(slot => !["morning", "afternoon", "evening"].includes(slot))))) {
        return sendJson(response, 400, { error: "A shift has invalid or incomplete details." });
      }
      shiftIds.add(shift.id);
      shift.duration = Number(shift.duration);
      const savedShift = currentShifts.get(shift.id);
      shift.assignedWorkerId = savedShift?.assignedWorkerId && workerIds.has(savedShift.assignedWorkerId) ? savedShift.assignedWorkerId : null;
    }
    workspace.shifts = body.shifts;
    workspace.rosterStatus = body.rosterStatus === "published" ? "published" : "draft";
    workspace.publishedAt = workspace.rosterStatus === "published" ? body.publishedAt || new Date().toISOString() : null;
    db.auditLog.push({ action: "workspace.updated", workspaceId: workspace.id, userId: session.userId, at: new Date().toISOString() });
    await writeDb(db);
    return sendJson(response, 200, { data: { saved: true } });
  }

  if (request.method === "POST" && url.pathname === "/api/leave-requests") {
    if (session.role !== "employee" || !workspace || !workspace.workers.some(worker => worker.userId === session.userId || worker.id === session.workerId)) return sendJson(response, 403, { error: "Only staff in a cafe workspace can request leave." });
    const body = await readBody(request);
    const startDate = String(body.startDate || "");
    const endDate = String(body.endDate || "");
    const reason = String(body.reason || "").trim();
    const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
    if (!validDate(startDate) || !validDate(endDate) || endDate < startDate || !reason || reason.length > 500) {
      return sendJson(response, 400, { error: "Enter valid leave dates and a reason." });
    }
    const leaveRequest = { id: `leave_${crypto.randomUUID()}`, workerId: session.workerId, startDate, endDate, reason, status: "pending" };
    workspace.leaveRequests.push(leaveRequest);
    db.auditLog.push({ action: "leave.requested", userId: session.userId, workspaceId: workspace.id, at: new Date().toISOString() });
    await writeDb(db);
    return sendJson(response, 201, { data: { request: leaveRequest } });
  }

  if (request.method === "PUT" && parts[0] === "api" && parts[1] === "leave-requests" && parts.length === 3) {
    if (session.role !== "manager" || !workspace) return sendJson(response, 403, { error: "Only this cafe's manager can review leave." });
    const body = await readBody(request);
    if (!["approved", "rejected"].includes(body.status)) return sendJson(response, 400, { error: "Choose approve or reject." });
    const leaveRequest = workspace.leaveRequests.find(item => item.id === parts[2]);
    if (!leaveRequest) return sendJson(response, 404, { error: "Leave request not found in this cafe." });
    if (leaveRequest.status !== "pending") return sendJson(response, 409, { error: "This leave request has already been reviewed." });
    leaveRequest.status = body.status;
    if (body.status === "approved") {
      const worker = workspace.workers.find(item => item.id === leaveRequest.workerId);
      const start = new Date(`${leaveRequest.startDate}T12:00:00Z`);
      const end = new Date(`${leaveRequest.endDate}T12:00:00Z`);
      const days = Math.max(1, Math.floor((end - start) / 86400000) + 1);
      if (worker) worker.leaveBalance = Math.max(0, (worker.leaveBalance ?? 12) - days);
    }
    db.auditLog.push({ action: `leave.${body.status}`, leaveRequestId: leaveRequest.id, userId: session.userId, workspaceId: workspace.id, at: new Date().toISOString() });
    await writeDb(db);
    return sendJson(response, 200, { data: { request: leaveRequest } });
  }

  if (request.method === "PUT" && url.pathname === "/api/profile") {
    const body = await readBody(request);
    const user = db.users.find(item => item.id === session.userId);
    if (!user) return sendJson(response, 404, { error: "Account not found." });
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(response, 400, { error: "Enter a valid name and email address." });
    if (db.users.some(item => item.id !== user.id && item.email.toLowerCase() === email)) return sendJson(response, 409, { error: "An account with this email already exists." });
    const businessName = user.role === "manager" ? String(body.businessName || "").trim() : "";
    if (user.role === "manager" && !businessName) return sendJson(response, 400, { error: "Enter your cafe or business name." });
    user.name = name;
    user.email = email;
    if (user.role === "manager") {
      user.businessName = businessName;
      if (workspace) workspace.businessName = businessName;
    } else {
      const worker = workspace?.workers.find(item => item.userId === user.id || item.id === (user.workerId || user.id));
      if (worker) {
        worker.name = name;
        worker.email = email;
        if (Array.isArray(body.certifications)) worker.certifications = body.certifications.map(skill => String(skill).trim()).filter(Boolean);
        if (Number.isFinite(Number(body.maxWeeklyHours)) && Number(body.maxWeeklyHours) >= 1 && Number(body.maxWeeklyHours) <= 60) worker.maxWeeklyHours = Number(body.maxWeeklyHours);
        if (Number.isFinite(Number(body.hourlyRate)) && Number(body.hourlyRate) >= 1) worker.hourlyRate = Number(body.hourlyRate);
      }
    }
    db.auditLog.push({ action: "profile.updated", userId: user.id, at: new Date().toISOString() });
    await writeDb(db);
    return sendJson(response, 200, { data: { user: publicUser(user, db) } });
  }

  if (request.method === "PUT" && parts[0] === "api" && parts[1] === "workers" && parts[3] === "availability") {
    if (session.role !== "employee" || session.workerId !== parts[2]) return sendJson(response, 403, { error: "Only the matching staff member can update availability." });
    const worker = workspace?.workers.find(item => item.userId === session.userId || item.id === session.workerId);
    if (!worker) return sendJson(response, 404, { error: "Worker not found." });
    const body = await readBody(request);
    const allowedDays = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
    const allowedSlots = new Set(["morning", "afternoon", "evening"]);
    const allowedStatuses = new Set(["available", "preferred", "unavailable"]);
    if (!body.availability || typeof body.availability !== "object" || Array.isArray(body.availability)) return sendJson(response, 400, { error: "Availability must be a day and time-slot schedule." });
    for (const [day, slots] of Object.entries(body.availability)) {
      if (!allowedDays.has(day) || !slots || typeof slots !== "object" || Array.isArray(slots)) return sendJson(response, 400, { error: "Availability contains an invalid day or time slot." });
      for (const [slot, status] of Object.entries(slots)) {
        if (!allowedSlots.has(slot) || !allowedStatuses.has(status)) return sendJson(response, 400, { error: "Availability contains an invalid day or time slot." });
      }
    }
    worker.availability = body.availability;
    db.auditLog.push({ action: "availability.updated", workerId: worker.id, at: new Date().toISOString() });
    await writeDb(db);
    return sendJson(response, 200, { data: worker });
  }

  if (request.method === "POST" && parts[0] === "api" && parts[1] === "shifts" && parts[3] === "assign") {
    if (session.role !== "manager") return sendJson(response, 403, { error: "Only managers can assign shifts." });
    const shift = workspace?.shifts.find(item => item.id === parts[2]);
    const body = await readBody(request);
    const worker = workspace?.workers.find(item => item.id === body.workerId);
    if (!shift || !worker) return sendJson(response, 404, { error: "Choose an existing shift and team member." });
    if (shift?.assignedWorkerId === worker?.id) return sendJson(response, 200, { data: shift });
    const result = validateAssignment(worker, shift);
    if (!result.valid) return sendJson(response, 422, { error: result.message });
    const previousWorker = workspace.workers.find(item => item.id === shift.assignedWorkerId);
    if (previousWorker) previousWorker.currentAssignedHours = Math.max(0, previousWorker.currentAssignedHours - shift.duration);
    shift.assignedWorkerId = worker.id;
    worker.currentAssignedHours += shift.duration;
    db.auditLog.push({ action: "shift.assigned", shiftId: shift.id, workerId: worker.id, at: new Date().toISOString() });
    await writeDb(db);
    return sendJson(response, 200, { data: shift });
  }

  return sendJson(response, 404, { error: "Route not found." });
}

const server = http.createServer((request, response) => {
  handle(request, response).catch(error => sendJson(response, 400, { error: error.message }));
});

if (require.main === module) {
  Promise.resolve()
    .then(() => {
      if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI?.trim()) {
        throw new Error("MONGODB_URI is required in production so hosted data is stored persistently.");
      }
      return connectDatabase();
    })
    .then(() => server.listen(port, "0.0.0.0", () => console.log(`SmartShift API running on port ${port}`)))
    .catch(error => {
      console.error(`Database connection failed: ${error.message}`);
      process.exitCode = 1;
    });
  process.on("SIGINT", async () => { await closeDatabase(); process.exit(0); });
  process.on("SIGTERM", async () => { await closeDatabase(); process.exit(0); });
}
module.exports = { server, validateAssignment };
