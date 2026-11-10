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
});
