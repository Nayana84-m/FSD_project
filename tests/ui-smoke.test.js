const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");

test("core role-based screens and workflow controls exist", () => {
  ["view-login", "view-employee", "view-manager", "view-profile", "loginForm", "createShiftForm", "addStaffForm", "leaveRequestForm", "managerLeaveRequests", "employeeUpcomingShifts"].forEach(id => {
    assert.match(html, new RegExp(`id=["']${id}["']`), `missing #${id}`);
  });
});

test("application scripts load in dependency order", () => {
  const scriptOrder = ["mockData.js", "auth.js", "api.js", "validation.js", "employee.js", "manager.js", "interactions.js"];
  const indexes = scriptOrder.map(script => html.indexOf(`js/${script}`));
  assert.ok(indexes.every(index => index >= 0));
  assert.deepEqual(indexes, [...indexes].sort((a, b) => a - b));
});
