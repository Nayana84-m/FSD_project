const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "smartshift-test-"));
process.env.SMARTSHIFT_DATA_FILE = path.join(testDirectory, "db.json");
process.env.MONGODB_URI = "";
fs.writeFileSync(process.env.SMARTSHIFT_DATA_FILE, JSON.stringify({ users: [], workers: [{}], shifts: [{}], leaveRequests: [], auditLog: [], workspaces: [] }));

const { server, validateAssignment } = require("../server/server");
const database = require("../server/db");

test("assignment policy checks every time block covered by a shift", () => {
  const worker = { certifications: ["Barista"], currentAssignedHours: 4, maxWeeklyHours: 20, availability: { friday: { afternoon: "unavailable" } } };
  const result = validateAssignment(worker, { day: "friday", timeSlot: "morning", timeSlots: ["morning", "afternoon"], requiredRole: "Barista", duration: 5 });
  assert.equal(result.valid, false);
  assert.match(result.message, /availability/);
});

test("signup, workspace isolation, assignment, and staff-only roster access work end to end", async t => {
  await database.connectDatabase();
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await database.closeDatabase();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const appPage = await fetch(`${baseUrl}/`);
  assert.equal(appPage.status, 200);
  assert.match(await appPage.text(), /SmartShift/);
  for (const privatePath of ["/.env", "/.env.example", "/server/data/db.json", "/README.md", "/package.json"]) {
    assert.equal((await fetch(`${baseUrl}${privatePath}`)).status, 404, `${privatePath} must not be publicly served`);
  }
  assert.equal((await fetch(`${baseUrl}/js/api.js`)).status, 200);

  async function api(route, { token, method = "GET", body } = {}) {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    return { status: response.status, payload: await response.json() };
  }

  const health = await api("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.payload.ok, true);

  const managerSignup = await api("/api/auth/signup", { method: "POST", body: {
    name: "Cafe Manager", email: "manager@example.test", password: "secure-pass-123", role: "manager", businessName: "Little Fern Cafe"
  } });
  assert.equal(managerSignup.status, 201);
  const managerToken = managerSignup.payload.data.token;
  const workspaceId = managerSignup.payload.data.user.workspaceId;
  const worker = { id: "worker-1", name: "Ari Staff", email: "ari@example.test", role: "Barista", certifications: ["Barista"], maxWeeklyHours: 20, currentAssignedHours: 0, hourlyRate: 200, availability: {} };
  const shift = { id: "shift-1", day: "friday", dayName: "Friday", timeSlot: "afternoon", timeSlots: ["afternoon"], timeLabel: "1:00 PM - 6:00 PM", duration: 5, requiredRole: "Barista", department: "Cafe Floor", assignedWorkerId: worker.id };
  const saveWorkspace = await api("/api/workspace", { token: managerToken, method: "PUT", body: { workers: [worker], shifts: [shift], rosterStatus: "draft" } });
  assert.equal(saveWorkspace.status, 200);
  assert.equal((await api("/api/workspace", { token: managerToken })).payload.data.workspace.shifts[0].assignedWorkerId, null, "a workspace save cannot bypass shift assignment checks");

  const staffSignup = await api("/api/auth/signup", { method: "POST", body: {
    name: "Ari Staff", email: "ari@example.test", password: "secure-pass-456", role: "employee", joinCode: managerSignup.payload.data.user.joinCode
  } });
  assert.equal(staffSignup.status, 201);
  const staffToken = staffSignup.payload.data.token;
  const managerAssign = await api("/api/shifts/shift-1/assign", { token: managerToken, method: "POST", body: { workerId: worker.id } });
  assert.equal(managerAssign.status, 200);
  const beforePublish = await api("/api/shifts", { token: staffToken });
  assert.equal(beforePublish.payload.data.length, 0, "staff should not see a draft roster");
  const currentWorkspace = (await api("/api/workspace", { token: managerToken })).payload.data.workspace;
  const publish = await api("/api/workspace", { token: managerToken, method: "PUT", body: { ...currentWorkspace, rosterStatus: "published", publishedAt: new Date().toISOString() } });
  assert.equal(publish.status, 200);
  const staffShifts = await api("/api/shifts", { token: staffToken });
  assert.equal(staffShifts.status, 200);
  assert.equal(staffShifts.payload.data.length, 1);

  const leaveRequest = await api("/api/leave-requests", { token: staffToken, method: "POST", body: {
    startDate: "2026-11-20", endDate: "2026-11-21", reason: "Family plans"
  } });
  assert.equal(leaveRequest.status, 201);
  const review = await api(`/api/leave-requests/${leaveRequest.payload.data.request.id}`, { token: managerToken, method: "PUT", body: { status: "approved" } });
  assert.equal(review.status, 200);
  assert.equal(review.payload.data.request.status, "approved");
  const updatedManagerWorkspace = (await api("/api/workspace", { token: managerToken })).payload.data.workspace;
  assert.equal(updatedManagerWorkspace.workers[0].leaveBalance, 10);

  const otherManager = await api("/api/auth/signup", { method: "POST", body: {
    name: "Other Manager", email: "other@example.test", password: "secure-pass-789", role: "manager", businessName: "Other Cafe"
  } });
  assert.equal(otherManager.status, 201);
  const otherWorkspace = await api("/api/workspace", { token: otherManager.payload.data.token });
  assert.notEqual(otherWorkspace.payload.data.workspace.id, workspaceId);
  assert.equal(otherWorkspace.payload.data.workspace.workers.length, 0);

  const wrongRoleLogin = await api("/api/auth/login", { method: "POST", body: { email: "ari@example.test", password: "secure-pass-456", role: "manager" } });
  assert.equal(wrongRoleLogin.status, 401);

  // Admin (Cafe Administrator / Owner) testing
  const adminSignup = await api("/api/auth/signup", { method: "POST", body: {
    name: "Elena Vance", email: "elena.admin@example.test", password: "secure-admin-123", role: "admin", businessName: "Seaside Roasters"
  } });
  assert.equal(adminSignup.status, 201);
  const adminToken = adminSignup.payload.data.token;
  const adminWorkspaceId = adminSignup.payload.data.user.workspaceId;
  assert.equal(adminSignup.payload.data.user.role, "admin");
  assert.ok(adminSignup.payload.data.user.joinCode, "admin must receive staff join code");
  assert.ok(adminSignup.payload.data.user.managerJoinCode, "admin must receive manager join code");

  // Non-admins must be blocked from admin overview
  const forbiddenOverview = await api("/api/admin/overview", { token: managerToken });
  assert.equal(forbiddenOverview.status, 403);

  // Admin accesses cafe overview
  const adminOverview = await api("/api/admin/overview", { token: adminToken });
  assert.equal(adminOverview.status, 200);
  assert.equal(adminOverview.payload.data.cafe.businessName, "Seaside Roasters");
  assert.ok(Array.isArray(adminOverview.payload.data.shifts), "admin overview must contain shifts for oversight");
  assert.ok(Array.isArray(adminOverview.payload.data.leaveRequests), "admin overview must contain leave requests for oversight");

  // Admin directly creates a manager for this cafe
  const addManager = await api("/api/admin/managers", { token: adminToken, method: "POST", body: {
    name: "Sub Manager", email: "sub.manager@example.test", password: "sub-manager-pass-123"
  } });
  assert.equal(addManager.status, 201);
  assert.equal(addManager.payload.data.manager.role, "manager");

  // Store manager can also join this cafe using admin's manager invite code
  const invitedManager = await api("/api/auth/signup", { method: "POST", body: {
    name: "Invited Shift Lead", email: "invited.lead@example.test", password: "lead-secure-456", role: "manager", joinCode: adminSignup.payload.data.user.managerJoinCode
  } });
  assert.equal(invitedManager.status, 201);
  assert.equal(invitedManager.payload.data.user.workspaceId, adminWorkspaceId);

  // Admin updates cafe business settings and policies
  const updateSettings = await api("/api/admin/settings", { token: adminToken, method: "PUT", body: {
    businessName: "Seaside Roasters & Bakery", maxWeeklyHoursDefault: 30, defaultHourlyRate: 280
  } });
  assert.equal(updateSettings.status, 200);
  assert.equal(updateSettings.payload.data.businessName, "Seaside Roasters & Bakery");

  // Admin regenerates invite codes
  const regenCode = await api("/api/admin/codes/regenerate", { token: adminToken, method: "POST", body: { type: "staff" } });
  assert.equal(regenCode.status, 200);
  assert.ok(regenCode.payload.data.code);

  // Admin can modify personnel roles
  const promoteUser = await api(`/api/admin/users/${addManager.payload.data.manager.id}/role`, { token: adminToken, method: "PUT", body: { role: "employee" } });
  assert.equal(promoteUser.status, 200);
  assert.equal(promoteUser.payload.data.role, "employee");
});
