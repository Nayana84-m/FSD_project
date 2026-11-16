/** SmartShift platform administration dashboard. */
(function attachAdminDashboard() {
  const escapeHtml = value => String(value ?? "").replace(/[&<>\"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character]));

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function renderOverview(data) {
    setText("adminWorkspaceCount", data.stats.workspaces);
    setText("adminManagerCount", data.stats.managers);
    setText("adminStaffCount", data.stats.staff);
    setText("adminActiveCount", data.stats.activeUsers);

    const users = document.getElementById("adminUsersList");
    users.innerHTML = data.users.length ? data.users.map(user => `
      <article class="admin-user-row">
        <div class="admin-user-avatar">${user.role === "manager" ? "🛡️" : "👤"}</div>
        <div class="admin-user-info"><strong>${escapeHtml(user.name)}</strong><span>${escapeHtml(user.email)}</span><small>${user.role === "manager" ? `Manager · ${escapeHtml(user.businessName)}` : "Staff member"}</small></div>
        <div class="admin-user-actions"><span class="admin-status ${user.status === "suspended" ? "suspended" : "active"}">${user.status === "suspended" ? "Suspended" : "Active"}</span><button class="btn ${user.status === "suspended" ? "btn-primary" : "btn-outline"} admin-status-button" data-user-id="${escapeHtml(user.id)}" data-next-status="${user.status === "suspended" ? "active" : "suspended"}">${user.status === "suspended" ? "Activate" : "Suspend"}</button></div>
      </article>`).join("") : `<p class="admin-empty">No manager or staff accounts yet.</p>`;

    const workspaces = document.getElementById("adminWorkspacesList");
    workspaces.innerHTML = data.workspaces.length ? data.workspaces.map(workspace => `
      <article class="admin-workspace-row"><div><strong>${escapeHtml(workspace.businessName)}</strong><span>${escapeHtml(workspace.managerName)} · ${workspace.staffCount} staff · ${workspace.shiftCount} shifts</span></div><span class="admin-roster-status ${workspace.status}">${workspace.status}</span></article>`).join("") : `<p class="admin-empty">No cafe workspaces yet.</p>`;

    const audit = document.getElementById("adminAuditList");
    audit.innerHTML = data.auditLog.length ? data.auditLog.map(item => `<div class="admin-audit-row"><span class="admin-audit-dot"></span><div><strong>${escapeHtml(String(item.action || "activity").replaceAll(".", " · "))}</strong><small>${escapeHtml(item.at || "")}</small></div></div>`).join("") : `<p class="admin-empty">No activity recorded yet.</p>`;
  }

  async function loadAdminDashboard() {
    const users = document.getElementById("adminUsersList");
    if (!users || !window.SmartShiftAPI) return;
    users.innerHTML = `<p class="admin-loading">Loading platform data…</p>`;
    try {
      renderOverview(await window.SmartShiftAPI.loadAdminOverview());
    } catch (error) {
      users.innerHTML = `<p class="admin-empty">${escapeHtml(error.message || "Admin data could not be loaded.")}</p>`;
      window.showToast?.("Admin data could not be loaded.", "danger");
    }
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest(".admin-status-button");
    if (!button) return;
    button.disabled = true;
    try {
      await window.SmartShiftAPI.updateAdminUserStatus(button.dataset.userId, button.dataset.nextStatus);
      await loadAdminDashboard();
      window.showToast?.(`Account ${button.dataset.nextStatus === "active" ? "activated" : "suspended"}.`, "success");
    } catch (error) {
      window.showToast?.(error.message || "Could not update the account.", "danger");
      button.disabled = false;
    }
  });

  window.initAdminDashboard = loadAdminDashboard;
})();
