const http = require("node:http");
const crypto = require("node:crypto");
const { readDb, writeDb, seedFromPrototype } = require("./db");

const port = Number(process.env.PORT || 3000);
const sessions = new Map();

function sendJson(response, status, payload) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": process.env.CLIENT_ORIGIN || "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  });
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

function validateAssignment(worker, shift) {
  if (!worker || !shift) return { valid: false, message: "Worker or shift not found." };
  const skillMatch = worker.certifications.includes(shift.requiredRole);
  const withinHours = worker.currentAssignedHours + shift.duration <= worker.maxWeeklyHours;
  return {
    valid: skillMatch && withinHours,
    message: skillMatch && withinHours ? "Assignment approved." : "Assignment blocked by skill or hours policy."
  };
}

async function handle(request, response) {
  if (request.method === "OPTIONS") return sendJson(response, 204, {});
  const db = seedFromPrototype(readDb());
  const url = new URL(request.url, `http://${request.headers.host}`);
  const parts = url.pathname.split("/").filter(Boolean);

  if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { ok: true, service: "smartshift-api" });
  if (request.method === "GET" && url.pathname === "/api/workers") return sendJson(response, 200, { data: db.workers });
  if (request.method === "GET" && url.pathname === "/api/shifts") return sendJson(response, 200, { data: db.shifts });

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readBody(request);
    const user = db.users.find(item => item.email === body.email && item.password === body.password && item.role === body.role);
    if (!user) return sendJson(response, 401, { error: "Invalid email, password, or role." });
    const token = crypto.randomBytes(24).toString("hex");
    sessions.set(token, { userId: user.id, role: user.role, expiresAt: Date.now() + 8 * 60 * 60 * 1000 });
    return sendJson(response, 200, { data: { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } } });
  }

  const auth = request.headers.authorization?.replace("Bearer ", "");
  if (!auth || !sessions.has(auth) || sessions.get(auth).expiresAt < Date.now()) return sendJson(response, 401, { error: "Authentication required." });

  if (request.method === "PUT" && parts[0] === "api" && parts[1] === "workers" && parts[3] === "availability") {
    const worker = db.workers.find(item => item.id === parts[2]);
    if (!worker) return sendJson(response, 404, { error: "Worker not found." });
    const body = await readBody(request);
    worker.availability = body.availability;
    db.auditLog.push({ action: "availability.updated", workerId: worker.id, at: new Date().toISOString() });
    writeDb(db);
    return sendJson(response, 200, { data: worker });
  }

  if (request.method === "POST" && parts[0] === "api" && parts[1] === "shifts" && parts[3] === "assign") {
    const shift = db.shifts.find(item => item.id === parts[2]);
    const body = await readBody(request);
    const worker = db.workers.find(item => item.id === body.workerId);
    const result = validateAssignment(worker, shift);
    if (!result.valid) return sendJson(response, 422, { error: result.message });
    shift.assignedWorkerId = worker.id;
    worker.currentAssignedHours += shift.duration;
    db.auditLog.push({ action: "shift.assigned", shiftId: shift.id, workerId: worker.id, at: new Date().toISOString() });
    writeDb(db);
    return sendJson(response, 200, { data: shift });
  }

  return sendJson(response, 404, { error: "Route not found." });
}

const server = http.createServer((request, response) => {
  handle(request, response).catch(error => sendJson(response, 400, { error: error.message }));
});

if (require.main === module) server.listen(port, () => console.log(`SmartShift API running at http://localhost:${port}`));
module.exports = { server, validateAssignment };
