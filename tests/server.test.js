const test = require("node:test");
const assert = require("node:assert/strict");
const { server, validateAssignment } = require("../server/server");

test("assignment policy blocks a missing certification", () => {
  const result = validateAssignment(
    { certifications: ["Cashier"], currentAssignedHours: 4, maxWeeklyHours: 20 },
    { requiredRole: "Barista", duration: 5 }
  );
  assert.equal(result.valid, false);
});

test("health endpoint and login endpoint respond with API contracts", async () => {
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const health = await fetch(`http://localhost:${port}/api/health`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const login = await fetch(`http://localhost:${port}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "manager@smartshift.local", password: "manager123", role: "manager" })
  });
  const payload = await login.json();
  assert.equal(login.status, 200);
  assert.equal(payload.data.user.role, "manager");
  assert.ok(payload.data.token);
  await new Promise(resolve => server.close(resolve));
});
