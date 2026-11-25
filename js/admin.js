/**
 * SMARTSHIFT — admin.js
 * Cafe & Small Business Administration Controller
 * Author: Full Stack Architect
 * Description: Manages cafe-level administration overseeing both managers and staff.
 */

'use strict';

(function attachAdminController() {
  let adminOverviewData = null;

  async function loadAdminOverview() {
    try {
      if (window.SmartShiftAPI) {
        adminOverviewData = await window.SmartShiftAPI.loadAdminOverview();
        return adminOverviewData;
      }
    } catch (err) {
      console.warn('API overview fetch failed, falling back to local workspace data:', err);
    }

    // Local / Offline Fallback
    const session = window.SmartShiftAuth?.getSession();
    const mock = window.mockDatabase || {};
    const localUsers = JSON.parse(localStorage.getItem('smartshift-users') || '[]');
    const workers = mock.workers || [];
    const shifts = mock.shifts || [];

    const totalScheduledHours = shifts
      .filter(s => s.assignedWorkerId)
      .reduce((sum, s) => sum + Number(s.duration || 0), 0);

    const estimatedPayroll = shifts
      .filter(s => s.assignedWorkerId)
      .reduce((sum, s) => {
        const worker = workers.find(w => w.id === s.assignedWorkerId);
        return sum + Number(s.duration || 0) * Number(worker?.hourlyRate || 200);
      }, 0);

    adminOverviewData = {
      cafe: {
        id: session?.workspaceId || 'admin-1',
        businessName: session?.businessName || "Downtown Cafe & Bistro",
        staffJoinCode: session?.joinCode || "CAFE1234",
        managerJoinCode: session?.managerJoinCode || "MGR1234",
        businessSettings: { maxWeeklyHoursDefault: 25, defaultHourlyRate: 250, businessPhone: "", businessAddress: "" }
      },
      stats: {
        totalStaff: workers.length,
        totalManagers: 1,
        totalShifts: shifts.length,
        assignedShifts: shifts.filter(s => s.assignedWorkerId).length,
        scheduledHours: totalScheduledHours,
        estimatedPayroll,
        pendingLeaves: (mock.leaveRequests || []).filter(l => l.status === "pending").length,
        rosterStatus: mock.rosterStatus || 'draft'
      },
      managers: [
        { id: 'manager-1', name: 'Maya Chen', email: 'manager@smartshift.local', role: 'manager' }
      ],
      staff: workers,
      shifts: shifts,
      leaveRequests: mock.leaveRequests || [],
      recentActivity: [
        { action: 'system.ready', at: new Date().toISOString() }
      ]
    };

    return adminOverviewData;
  }

  function renderAdminKPIs(data) {
    const stats = data.stats || {};
    const cafe = data.cafe || {};

    const elBizName = document.getElementById('adminBusinessName');
    const elSub = document.getElementById('adminBusinessSubtitle');
    const elStaffCount = document.getElementById('adminStatStaff');
    const elManagerCount = document.getElementById('adminStatManagers');
    const elHours = document.getElementById('adminStatHours');
    const elPayroll = document.getElementById('adminStatPayroll');
    const elRosterBadge = document.getElementById('adminRosterBadge');

    if (elBizName) elBizName.textContent = cafe.businessName || 'Your Business';
    if (elSub) elSub.textContent = `${cafe.businessName || 'Business'} · Cafe Administration & Oversight`;
    if (elStaffCount) elStaffCount.textContent = stats.totalStaff ?? 0;
    if (elManagerCount) elManagerCount.textContent = stats.totalManagers ?? 0;
    if (elHours) elHours.textContent = `${stats.scheduledHours ?? 0} hrs`;
    if (elPayroll) elPayroll.textContent = `Rs. ${(stats.estimatedPayroll || 0).toLocaleString()}`;
    if (elRosterBadge) {
      elRosterBadge.textContent = stats.rosterStatus === 'published' ? 'Roster Published 🚀' : 'Roster in Draft 📝';
      elRosterBadge.className = `badge ${stats.rosterStatus === 'published' ? 'badge-success' : 'badge-warning'}`;
    }
  }

  function renderPersonnelTable(data) {
    const tbody = document.getElementById('adminPersonnelTableBody');
    if (!tbody) return;

    const session = window.SmartShiftAuth?.getSession();
    const rows = [];

    // 1. Current Admin
    rows.push(`
      <tr>
        <td>
          <div style="font-weight:700;">${session?.name || 'Administrator'}</div>
          <small style="color:var(--text-secondary);">${session?.email || 'admin@smartshift.local'}</small>
        </td>
        <td><span class="role-pill role-admin">👑 Cafe Admin (Owner)</span></td>
        <td>Executive Oversight</td>
        <td>All</td>
        <td>—</td>
        <td><span class="badge badge-info">Workspace Owner</span></td>
      </tr>
    `);

    // 2. Managers
    (data.managers || []).forEach(mgr => {
      rows.push(`
        <tr>
          <td>
            <div style="font-weight:700;">${mgr.name}</div>
            <small style="color:var(--text-secondary);">${mgr.email}</small>
          </td>
          <td><span class="role-pill role-manager">🛡️ Store Manager</span></td>
          <td>Shift Planning & Leaves</td>
          <td>40 hrs</td>
          <td>Salaried / Hourly</td>
          <td>
            <div class="admin-action-group">
              <button class="btn btn-outline btn-xs" onclick="window.adminChangeRole('${mgr.id}', 'employee')">Demote to Staff</button>
              <button class="btn btn-outline btn-xs" style="color:#ef4444; border-color:#fca5a5;" onclick="window.adminRemoveMember('${mgr.id}')">Remove</button>
            </div>
          </td>
        </tr>
      `);
    });

    // 3. Staff members
    (data.staff || []).forEach(stf => {
      const skills = Array.isArray(stf.certifications) ? stf.certifications.join(', ') : 'Barista';
      const hours = `${stf.currentAssignedHours || 0} / ${stf.maxWeeklyHours || 25} hrs`;
      const rate = `Rs. ${stf.hourlyRate || 200}/hr`;

      rows.push(`
        <tr>
          <td>
            <div style="font-weight:700;">${stf.name}</div>
            <small style="color:var(--text-secondary);">${stf.email || '—'}</small>
          </td>
          <td><span class="role-pill role-staff">👨‍🍳 Staff</span></td>
          <td>${skills}</td>
          <td>${hours}</td>
          <td>${rate}</td>
          <td>
            <div class="admin-action-group">
              <button class="btn btn-outline btn-xs" onclick="window.adminChangeRole('${stf.id}', 'manager')">Promote to Manager</button>
              <button class="btn btn-outline btn-xs" style="color:#ef4444; border-color:#fca5a5;" onclick="window.adminRemoveMember('${stf.id}')">Remove</button>
            </div>
          </td>
        </tr>
      `);
    });

    tbody.innerHTML = rows.join('');
  }

  function renderInviteCodes(data) {
    const cafe = data.cafe || {};
    const staffCodeEl = document.getElementById('adminStaffCodeDisplay');
    const managerCodeEl = document.getElementById('adminManagerCodeDisplay');

    if (staffCodeEl) staffCodeEl.textContent = cafe.staffJoinCode || 'CAFE1234';
    if (managerCodeEl) managerCodeEl.textContent = cafe.managerJoinCode || 'MGR1234';

    // Populate Settings form fields
    const bizNameInput = document.getElementById('adminSettingBizName');
    const maxHoursInput = document.getElementById('adminSettingMaxHours');
    const rateInput = document.getElementById('adminSettingRate');
    const phoneInput = document.getElementById('adminSettingPhone');
    const addressInput = document.getElementById('adminSettingAddress');

    if (bizNameInput) bizNameInput.value = cafe.businessName || '';
    if (maxHoursInput) maxHoursInput.value = cafe.businessSettings?.maxWeeklyHoursDefault || 25;
    if (rateInput) rateInput.value = cafe.businessSettings?.defaultHourlyRate || 250;
    if (phoneInput) phoneInput.value = cafe.businessSettings?.businessPhone || '';
    if (addressInput) addressInput.value = cafe.businessSettings?.businessAddress || '';
  }

  function renderActivityLog(data) {
    const container = document.getElementById('adminActivityList');
    if (!container) return;

    const list = data.recentActivity || [];
    if (!list.length) {
      container.innerHTML = `<div style="color:var(--text-secondary); padding:1rem; text-align:center;">No recent actions recorded.</div>`;
      return;
    }

    container.innerHTML = list.map(item => {
      const dateStr = item.at ? new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';
      let title = item.action || 'Activity event';
      if (item.action === 'shift.assigned') title = 'Shift assigned';
      else if (item.action === 'workspace.updated') title = 'Roster / workspace updated';
      else if (item.action === 'leave.requested') title = 'Staff leave requested';
      else if (item.action === 'leave.approved') title = 'Leave request approved';
      else if (item.action === 'leave.rejected') title = 'Leave request rejected';
      else if (item.action === 'admin.manager_created') title = 'New store manager appointed';
      else if (item.action === 'admin.role_changed') title = `Personnel role changed to ${item.newRole}`;
      else if (item.action === 'admin.user_removed') title = 'Personnel member removed';
      else if (item.action === 'admin.settings_updated') title = 'Cafe policies updated';

      return `
        <div class="admin-activity-item">
          <div>
            <strong>${title}</strong>
            <span class="admin-activity-badge">${item.action}</span>
          </div>
          <small style="color:var(--text-secondary);">${dateStr}</small>
        </div>
      `;
    }).join('');
  }

  function renderRosterOverview(data) {
    const tbody = document.getElementById('adminRosterTableBody');
    if (!tbody) return;

    const shifts = data.shifts || window.mockDatabase?.shifts || [];
    const workers = data.staff || window.mockDatabase?.workers || [];

    if (!shifts.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary); padding:2rem;">No shifts scheduled yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = shifts.map(shift => {
      const assigned = workers.find(w => w.id === shift.assignedWorkerId);
      const isAssigned = Boolean(assigned);
      return `
        <tr>
          <td>
            <strong>${shift.day}</strong>
            <div style="font-size:0.8rem; color:var(--text-secondary);">${shift.startTime} – ${shift.endTime}</div>
          </td>
          <td><span class="badge badge-info">${shift.type || 'Standard'}</span></td>
          <td>${shift.requiredSkill || 'General'}</td>
          <td>
            ${isAssigned
              ? `<div style="font-weight:700;">👨‍🍳 ${assigned.name}</div><small style="color:var(--text-secondary);">${assigned.role || 'Staff'}</small>`
              : `<span style="color:#d97706; font-weight:600;">⚠️ Unassigned</span>`}
          </td>
          <td>${shift.duration || 5} hrs</td>
          <td>
            <span class="badge ${isAssigned ? 'badge-success' : 'badge-warning'}">
              ${isAssigned ? 'Assigned' : 'Open Shift'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderLeaveRequests(data) {
    const container = document.getElementById('adminLeaveList');
    if (!container) return;

    const leaves = data.leaveRequests || window.mockDatabase?.leaveRequests || [];
    const workers = data.staff || window.mockDatabase?.workers || [];

    if (!leaves.length) {
      container.innerHTML = `<div style="color:var(--text-secondary); padding:1.5rem; text-align:center;">No leave requests submitted.</div>`;
      return;
    }

    container.innerHTML = leaves.map(req => {
      const worker = workers.find(w => w.id === req.workerId) || { name: req.workerName || 'Staff Member' };
      const isPending = req.status === 'pending';
      return `
        <div class="admin-activity-item" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; padding:0.85rem; border:1px solid var(--border); border-radius:10px;">
          <div>
            <div style="font-weight:700; display:flex; align-items:center; gap:0.4rem;">
              <span>👨‍🍳 ${worker.name}</span>
              <span class="badge ${req.status === 'approved' ? 'badge-success' : req.status === 'rejected' ? 'badge-danger' : 'badge-warning'}">
                ${req.status.toUpperCase()}
              </span>
            </div>
            <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:0.2rem;">
              <strong>Days:</strong> ${(req.days || [req.day]).filter(Boolean).join(', ')} &bull; <em>"${req.reason || 'No reason provided'}"</em>
            </div>
          </div>
          ${isPending ? `
            <div style="display:flex; gap:0.4rem;">
              <button class="btn btn-outline btn-xs" style="color:#059669; border-color:#a7f3d0;" onclick="window.adminDecideLeave('${req.id}', 'approved')">✓ Approve</button>
              <button class="btn btn-outline btn-xs" style="color:#dc2626; border-color:#fecaca;" onclick="window.adminDecideLeave('${req.id}', 'rejected')">✕ Reject</button>
            </div>
          ` : `
            <small style="color:var(--text-secondary);">${req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : 'Reviewed'}</small>
          `}
        </div>
      `;
    }).join('');
  }

  async function initAdminDashboard() {
    const data = await loadAdminOverview();
    renderAdminKPIs(data);
    renderPersonnelTable(data);
    renderRosterOverview(data);
    renderLeaveRequests(data);
    renderInviteCodes(data);
    renderActivityLog(data);
  }

  window.initAdminDashboard = initAdminDashboard;
  window.refreshAdminDashboard = initAdminDashboard;

  window.adminDecideLeave = async function(leaveId, status) {
    try {
      if (window.SmartShiftAPI) {
        await window.SmartShiftAPI.updateLeaveRequest(leaveId, status);
      } else {
        const item = (window.mockDatabase.leaveRequests || []).find(r => r.id === leaveId);
        if (item) {
          item.status = status;
          item.reviewedAt = new Date().toISOString();
        }
      }
      window.showToast?.(`Leave request ${status}.`, 'success');
      await initAdminDashboard();
    } catch (err) {
      window.showToast?.(err.message || 'Could not update leave request.', 'danger');
    }
  };

  // Global Actions for Table Rows
  window.adminChangeRole = async function(userId, newRole) {
    if (!confirm(`Are you sure you want to change this member's role to ${newRole}?`)) return;
    try {
      if (window.SmartShiftAPI) {
        await window.SmartShiftAPI.updateUserRole(userId, newRole);
      } else {
        const worker = (window.mockDatabase.workers || []).find(w => w.id === userId);
        if (worker) worker.role = newRole === 'manager' ? 'Store Manager' : 'Staff member';
      }
      window.showToast?.(`Role updated to ${newRole} successfully.`, 'success');
      await initAdminDashboard();
    } catch (err) {
      window.showToast?.(err.message || 'Failed to update role.', 'danger');
    }
  };

  window.adminRemoveMember = async function(userId) {
    if (!confirm('Are you sure you want to remove this team member from this cafe? Any assigned shifts will be unassigned.')) return;
    try {
      if (window.SmartShiftAPI) {
        await window.SmartShiftAPI.deleteUser(userId);
      } else {
        const idx = (window.mockDatabase.workers || []).findIndex(w => w.id === userId);
        if (idx >= 0) window.mockDatabase.workers.splice(idx, 1);
      }
      window.showToast?.('Team member removed from cafe workspace.', 'success');
      await initAdminDashboard();
    } catch (err) {
      window.showToast?.(err.message || 'Failed to remove team member.', 'danger');
    }
  };

  // DOM Event Bindings
  document.addEventListener('DOMContentLoaded', () => {
    // Tab switching in Admin View
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.adminTab;
        document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.admin-section').forEach(sec => {
          sec.classList.toggle('active', sec.id === `adminSec-${target}`);
        });
      });
    });

    // Copy Invite Codes
    document.getElementById('btnCopyStaffCode')?.addEventListener('click', () => {
      const code = document.getElementById('adminStaffCodeDisplay')?.textContent;
      if (code) {
        navigator.clipboard?.writeText(code);
        window.showToast?.(`Staff invite code ${code} copied to clipboard!`, 'success');
      }
    });

    document.getElementById('btnCopyManagerCode')?.addEventListener('click', () => {
      const code = document.getElementById('adminManagerCodeDisplay')?.textContent;
      if (code) {
        navigator.clipboard?.writeText(code);
        window.showToast?.(`Manager invite code ${code} copied to clipboard!`, 'success');
      }
    });

    // Regenerate Codes
    document.getElementById('btnRegenStaffCode')?.addEventListener('click', async () => {
      if (!confirm('Regenerate Staff Invite Code? The previous code will no longer work for new signups.')) return;
      try {
        if (window.SmartShiftAPI) {
          const res = await window.SmartShiftAPI.regenerateInviteCode('staff');
          document.getElementById('adminStaffCodeDisplay').textContent = res.code;
        }
        window.showToast?.('Staff invite code regenerated.', 'success');
        await initAdminDashboard();
      } catch (err) {
        window.showToast?.(err.message || 'Could not regenerate code.', 'danger');
      }
    });

    document.getElementById('btnRegenManagerCode')?.addEventListener('click', async () => {
      if (!confirm('Regenerate Manager Invite Code? The previous code will no longer work for new signups.')) return;
      try {
        if (window.SmartShiftAPI) {
          const res = await window.SmartShiftAPI.regenerateInviteCode('manager');
          document.getElementById('adminManagerCodeDisplay').textContent = res.code;
        }
        window.showToast?.('Manager invite code regenerated.', 'success');
        await initAdminDashboard();
      } catch (err) {
        window.showToast?.(err.message || 'Could not regenerate code.', 'danger');
      }
    });

    // Add Manager Modal Controls
    const addManagerModal = document.getElementById('adminAddManagerModal');
    const openAddMgrBtn = document.getElementById('btnAdminOpenAddManager');
    const closeAddMgrBtn = document.getElementById('btnAdminCloseAddManager');
    const cancelAddMgrBtn = document.getElementById('btnAdminCancelAddManager');

    const openMgrModal = () => addManagerModal?.classList.add('active');
    const closeMgrModal = () => addManagerModal?.classList.remove('active');

    openAddMgrBtn?.addEventListener('click', openMgrModal);
    closeAddMgrBtn?.addEventListener('click', closeMgrModal);
    cancelAddMgrBtn?.addEventListener('click', closeMgrModal);

    document.getElementById('adminAddManagerForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('newManagerName')?.value.trim();
      const email = document.getElementById('newManagerEmail')?.value.trim();
      const password = document.getElementById('newManagerPassword')?.value;

      try {
        if (window.SmartShiftAPI) {
          await window.SmartShiftAPI.addManager({ name, email, password });
        }
        window.showToast?.(`Store Manager ${name} added to your cafe!`, 'success');
        closeMgrModal();
        document.getElementById('adminAddManagerForm')?.reset();
        await initAdminDashboard();
      } catch (err) {
        window.showToast?.(err.message || 'Failed to add manager.', 'danger');
      }
    });

    // Cafe Settings Form
    document.getElementById('adminSettingsForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const businessName = document.getElementById('adminSettingBizName')?.value.trim();
      const maxWeeklyHoursDefault = Number(document.getElementById('adminSettingMaxHours')?.value);
      const defaultHourlyRate = Number(document.getElementById('adminSettingRate')?.value);
      const businessPhone = document.getElementById('adminSettingPhone')?.value.trim();
      const businessAddress = document.getElementById('adminSettingAddress')?.value.trim();

      try {
        if (window.SmartShiftAPI) {
          await window.SmartShiftAPI.updateAdminSettings({
            businessName, maxWeeklyHoursDefault, defaultHourlyRate, businessPhone, businessAddress
          });
        }
        const session = window.SmartShiftAuth?.getSession();
        if (session) {
          session.businessName = businessName;
          window.SmartShiftAuth.setSession(session);
        }
        window.showToast?.('Cafe business settings and policies saved.', 'success');
        await initAdminDashboard();
      } catch (err) {
        window.showToast?.(err.message || 'Failed to save cafe settings.', 'danger');
      }
    });

    document.getElementById('btnAdminQuickRoster')?.addEventListener('click', () => {
      const tabBtn = document.querySelector('.admin-tab-btn[data-admin-tab="roster"]');
      if (tabBtn) tabBtn.click();
    });
  });
})();
