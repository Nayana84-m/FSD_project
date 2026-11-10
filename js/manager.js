/**
 * MANAGER ROSTER & SHIFT MATRIX - CUTE & FRIENDLY LOGIC
 * Author: Member 3 (Manager Roster Specialist)
 */

document.addEventListener("DOMContentLoaded", () => {
  initRosterGrid();
  initFilterPills();
  initAssignModal();
  initPublishButton();
  initShiftTimeInputs();
});

let currentFilter = "all";
let activeShiftToAssign = null;

function parseShiftTimeRange(startValue, endValue) {
  const toMinutes = value => {
    const match = String(value).match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour <= 23 && minute <= 59 ? hour * 60 + minute : null;
  };
  const start = toMinutes(startValue);
  let end = toMinutes(endValue);
  if (start === null || end === null) return null;
  if (end <= start) end += 24 * 60;
  const hours = (end - start) / 60;
  if (hours <= 0 || hours > 12) return null;
  return { start, end, hours, timeSlot: start < 12 * 60 ? 'morning' : start < 18 * 60 ? 'afternoon' : 'evening' };
}

function formatShiftClock(minutes) {
  const clockMinutes = minutes % (24 * 60);
  const hour24 = Math.floor(clockMinutes / 60);
  const minute = String(clockMinutes % 60).padStart(2, '0');
  const period = hour24 < 12 ? 'AM' : 'PM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

function initShiftTimeInputs() {
  const startInput = document.getElementById('newShiftStartTime');
  const endInput = document.getElementById('newShiftEndTime');
  const durationInput = document.getElementById('newShiftDuration');
  if (!startInput || !endInput || !durationInput || durationInput.dataset.bound === 'true') return;
  durationInput.dataset.bound = 'true';
  const updateDuration = () => {
    const range = parseShiftTimeRange(startInput.value, endInput.value);
    durationInput.value = range ? Number(range.hours.toFixed(2)) : '';
  };
  startInput.addEventListener('input', updateDuration);
  endInput.addEventListener('input', updateDuration);
}

function recommendationScore(worker, shift) {
  const result = window.SmartValidator.validateAssignment(worker.id, shift.id);
  const preferred = worker.availability?.[shift.day]?.[shift.timeSlot] === 'preferred' ? 1 : 0;
  return (result.isValid ? 100 : 0) + preferred * 10 - (worker.currentAssignedHours || 0);
}

function initRosterGrid() {
  const container = document.getElementById("managerRosterGrid");
  if (!container) return;

  container.innerHTML = "";

  const shifts = window.mockDatabase.shifts;
  const filteredShifts = currentFilter === "all" 
    ? shifts 
    : shifts.filter(s => String(s.requiredRole).trim().toLowerCase() === currentFilter.trim().toLowerCase());

  if (!filteredShifts.length) {
    container.innerHTML = `<div class="filter-empty"><strong>No ${currentFilter} shifts yet.</strong><span>Create a shift with this skill to see it here.</span></div>`;
    updateStatsCounters();
    return;
  }

  const groupedByDay = {};
  filteredShifts.forEach(s => {
    if (!groupedByDay[s.dayName]) groupedByDay[s.dayName] = [];
    groupedByDay[s.dayName].push(s);
  });

  Object.keys(groupedByDay).forEach(dayName => {
    const dayCol = document.createElement("div");
    dayCol.className = "day-column";

    const dayHeader = document.createElement("div");
    dayHeader.className = "day-column-header";
    dayHeader.innerHTML = `
      <h4>${dayName} 📅</h4>
      <span class="badge badge-info">${groupedByDay[dayName].length} Shift(s)</span>
    `;
    dayCol.appendChild(dayHeader);

    const shiftStack = document.createElement("div");
    shiftStack.className = "shifts-stack";

    groupedByDay[dayName].forEach(shift => {
      const card = document.createElement("div");
      const isAssigned = !!shift.assignedWorkerId;
      const worker = isAssigned ? window.mockDatabase.workers.find(w => w.id === shift.assignedWorkerId) : null;

      card.className = `shift-matrix-card ${isAssigned ? 'assigned' : 'unassigned'}`;
      card.innerHTML = `
        <div class="shift-role-tag">
          <span class="badge badge-info">${shift.requiredRole}</span>
          <span>🕒 ${shift.timeLabel}</span>
        </div>
        <div style="font-size:0.88rem; font-weight:700; margin-bottom:0.25rem;">
          ${shift.department} &bull; ${shift.duration} hrs (Rs. ${shift.duration * 250})
        </div>
        ${
          isAssigned 
            ? `
              <div class="assigned-staff-badge">
                <span style="font-size:1.4rem;">${worker.avatar}</span>
                <div style="flex:1;">
                  <strong style="font-size:0.88rem;">${worker.name}</strong>
                  <div style="font-size:0.75rem; color:#059669; font-weight:600;">✓ Assigned &amp; Verified</div>
                </div>
                <button class="btn btn-outline btn-sm btn-reassign" data-shift-id="${shift.id}" style="padding:0.25rem 0.6rem; font-size:0.75rem;">Edit</button>
              </div>
            `
            : `
              <div style="margin: 0.5rem 0; font-size:0.82rem; color:#d97706; font-weight:600;">
                ⚠️ Open Slot (Needs Staff)
              </div>
              <button class="btn btn-primary btn-sm assign-action-btn" data-shift-id="${shift.id}">
                ✨ Assign Staff
              </button>
            `
        }
      `;

      shiftStack.appendChild(card);
    });

    dayCol.appendChild(shiftStack);
    container.appendChild(dayCol);
  });

  attachAssignButtonListeners();
  updateStatsCounters();
}

function initFilterPills() {
  const pills = document.querySelectorAll(".filter-pill");
  pills.forEach(pill => {
    const isActive = pill.dataset.filter === currentFilter;
    pill.classList.toggle("active", isActive);
    pill.setAttribute("aria-pressed", String(isActive));
  });
  pills.forEach(pill => {
    if (pill.dataset.filterBound === "true") return;
    pill.dataset.filterBound = "true";
    pill.addEventListener("click", () => {
      currentFilter = pill.dataset.filter;
      pills.forEach(p => {
        const isActive = p === pill;
        p.classList.toggle("active", isActive);
        p.setAttribute("aria-pressed", String(isActive));
      });
      initRosterGrid();
      document.getElementById('managerSidebar')?.classList.remove('open');
      document.getElementById('managerSidebarOverlay')?.classList.remove('open');
      document.getElementById('managerSidebarToggle')?.setAttribute('aria-expanded', 'false');
      document.getElementById('managerRosterGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function updateStatsCounters() {
  const shifts = window.mockDatabase.shifts;
  const assignedCount = shifts.filter(s => s.assignedWorkerId).length;
  const unassignedCount = shifts.length - assignedCount;

  const statTotal = document.getElementById("statTotalShifts");
  const statAssigned = document.getElementById("statAssigned");
  const statUnassigned = document.getElementById("statUnassigned");

  if (statTotal) statTotal.innerText = shifts.length;
  if (statAssigned) statAssigned.innerText = assignedCount;
  if (statUnassigned) statUnassigned.innerText = unassignedCount;
}

function initAssignModal() {
  const modal = document.getElementById("assignModal");
  const btnClose = document.getElementById("btnCloseAssignModal");
  const btnCancel = document.getElementById("btnCancelModal");
  const btnConfirm = document.getElementById("btnConfirmAssign");
  const workerSelect = document.getElementById("modalWorkerSelect");
  const feedbackContent = document.getElementById("validationFeedbackArea");

  const closeModal = () => {
    if (modal) modal.classList.remove("active");
    activeShiftToAssign = null;
  };

  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCancel) btnCancel.addEventListener("click", closeModal);

  if (workerSelect) {
    workerSelect.addEventListener("change", () => {
      if (!activeShiftToAssign) return;
      const selectedWorkerId = workerSelect.value;
      const result = window.SmartValidator.validateAssignment(selectedWorkerId, activeShiftToAssign.id);
      renderValidationFeedbackInModal(result, feedbackContent, btnConfirm);
    });
  }

  if (btnConfirm) {
    btnConfirm.addEventListener("click", async () => {
      if (!activeShiftToAssign) return;
      const selectedWorkerId = workerSelect.value;
      const assignedWorker = window.mockDatabase.workers.find(worker => worker.id === selectedWorkerId);
      const shift = activeShiftToAssign;
      const assignedDay = shift.dayName;
      const previousWorker = window.mockDatabase.workers.find(worker => worker.id === shift.assignedWorkerId);
      btnConfirm.disabled = true;
      try {
        if (window.SmartShiftAPI) await window.SmartShiftAPI.assignShift(shift.id, selectedWorkerId);
        if (previousWorker && previousWorker.id !== selectedWorkerId) previousWorker.currentAssignedHours = Math.max(0, previousWorker.currentAssignedHours - shift.duration);
        shift.assignedWorkerId = selectedWorkerId;
        if (assignedWorker && previousWorker?.id !== selectedWorkerId) assignedWorker.currentAssignedHours += shift.duration;
        window.persistMockDatabase?.({ sync: !window.SmartShiftAPI });

        closeModal();
        initRosterGrid();
        window.showToast?.(`Shift assigned for ${assignedDay}.`, "success");
      } catch (error) {
        window.showToast?.(error.message || "Could not assign this shift.", "danger");
      } finally {
        btnConfirm.disabled = false;
      }
    });
  }
}

function attachAssignButtonListeners() {
  const assignBtns = document.querySelectorAll(".assign-action-btn, .btn-reassign");
  const modal = document.getElementById("assignModal");
  const modalShiftBanner = document.getElementById("modalShiftBanner");
  const workerSelect = document.getElementById("modalWorkerSelect");
  const feedbackContent = document.getElementById("validationFeedbackArea");
  const btnConfirm = document.getElementById("btnConfirmAssign");

  assignBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const shiftId = btn.dataset.shiftId;
      activeShiftToAssign = window.mockDatabase.shifts.find(s => s.id === shiftId);

      if (!activeShiftToAssign) return;

      if (modalShiftBanner) {
        modalShiftBanner.innerHTML = `
          <div style="font-weight:700; font-size:1rem; margin-bottom:0.2rem;">${activeShiftToAssign.dayName} Shift &bull; ${activeShiftToAssign.department}</div>
          <div style="font-size:0.85rem; color:#475569;">Time: ${activeShiftToAssign.timeLabel} (${activeShiftToAssign.duration} hrs) &bull; Required Role: <strong>${activeShiftToAssign.requiredRole}</strong></div>
        `;
      }

      if (workerSelect) {
        const rankedWorkers = window.mockDatabase.workers.slice().sort((a, b) => recommendationScore(b, activeShiftToAssign) - recommendationScore(a, activeShiftToAssign));
        workerSelect.innerHTML = rankedWorkers.map((w, index) => {
          const recommendation = recommendationScore(w, activeShiftToAssign) >= 100 ? (index === 0 ? 'Recommended' : 'Eligible') : 'Conflict';
          return `<option value="${w.id}">${index === 0 && recommendation === 'Recommended' ? '⭐ ' : ''}${w.avatar || '👤'} ${w.name} — ${recommendation} (${w.role} • ${w.currentAssignedHours}/${w.maxWeeklyHours} hrs • Rs. ${w.hourlyRate}/hr)</option>`;
        }).join("");

        const initialWorkerId = workerSelect.value;
        const result = window.SmartValidator.validateAssignment(initialWorkerId, activeShiftToAssign.id);
        renderValidationFeedbackInModal(result, feedbackContent, btnConfirm);
      }

      if (modal) modal.classList.add("active");
    });
  });
}

function renderValidationFeedbackInModal(result, container, confirmBtn) {
  if (!container) return;

  let checksHtml = result.checks.map(check => {
    const statusClass = check.passed ? "rule-status-pass" : "rule-status-fail";
    return `
      <div class="rule-check-item">
        <span class="rule-status-icon ${statusClass}">${check.icon}</span>
        <div>
          <strong>${check.rule}:</strong> ${check.detail}
        </div>
      </div>
    `;
  }).join("");

  const alertClass = result.isValid ? "success" : "danger";

  container.innerHTML = `
    <div style="background:white; border-radius:10px; border:1px solid #eceae3; padding:0.6rem 0.85rem;">
      ${checksHtml}
    </div>
    <div class="validation-summary-alert ${alertClass}">
      ${result.statusMessage}
    </div>
  `;

  if (confirmBtn) {
    confirmBtn.disabled = !result.isValid;
  }
}

function initPublishButton() {
  const publishBtn = document.getElementById("btnPublishRoster");
  if (!publishBtn) return;
  const currentStatus = document.getElementById('managerRosterStatus');
  if (window.mockDatabase.rosterStatus === 'published') {
    if (currentStatus) { currentStatus.textContent = 'Published roster'; currentStatus.className = 'roster-status published'; }
    const label = publishBtn.querySelector('span');
    if (label) label.textContent = '✓ Roster Published';
  }

  if (publishBtn.dataset.bound === 'true') return;
  publishBtn.dataset.bound = 'true';
  publishBtn.addEventListener("click", async () => {
    const previousStatus = window.mockDatabase.rosterStatus;
    const previousPublishedAt = window.mockDatabase.publishedAt;
    window.mockDatabase.rosterStatus = 'published';
    window.mockDatabase.publishedAt = new Date().toISOString();
    publishBtn.disabled = true;
    const saved = await window.persistMockDatabase?.();
    publishBtn.disabled = false;
    if (saved === false) {
      window.mockDatabase.rosterStatus = previousStatus;
      window.mockDatabase.publishedAt = previousPublishedAt;
      return;
    }
    const status = document.getElementById('managerRosterStatus');
    if (status) {
      status.textContent = 'Published roster';
      status.className = 'roster-status published';
    }
    publishBtn.querySelector('span').textContent = '✓ Roster Published';
    window.showToast?.("🚀 Roster published. Staff can now view their confirmed shifts.", "success");
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function renderStaffDirectory() {
  const container = document.getElementById('staffDirectory');
  const badge = document.getElementById('staffCountBadge');
  if (!container) return;
  const workers = window.mockDatabase.workers;
  if (badge) badge.textContent = `${workers.length} ${workers.length === 1 ? 'person' : 'people'}`;
  container.innerHTML = workers.map(worker => `
    <div class="staff-directory-row">
      <div class="staff-directory-avatar">${worker.avatar || '👤'}</div>
      <div class="staff-directory-info"><strong>${escapeHtml(worker.name)}</strong><span>${escapeHtml(worker.role)} · ${(worker.certifications || []).map(escapeHtml).join(', ') || 'Skills pending'}</span><span>${(window.mockDatabase.leaveRequests || []).filter(request => request.workerId === worker.id && request.status === 'pending').length ? '⏳ Leave request pending' : '✓ No pending leave'}</span></div>
      <div class="staff-directory-hours"><strong>${worker.currentAssignedHours || 0}/${worker.maxWeeklyHours || 0}h</strong><span>Rs. ${worker.hourlyRate || 0}/hr</span></div>
    </div>`).join('');
}

function renderLeaveApprovals() {
  const container = document.getElementById('managerLeaveRequests');
  const badge = document.getElementById('pendingLeaveBadge');
  if (!container) return;
  const requests = window.mockDatabase.leaveRequests || [];
  const pending = requests.filter(request => request.status === 'pending');
  if (badge) badge.textContent = `${pending.length} pending`;
  if (!pending.length) {
    container.innerHTML = '<p class="empty-state">No pending leave requests. Your team is up to date.</p>';
    return;
  }
  container.innerHTML = pending.map(request => {
    const worker = window.mockDatabase.workers.find(item => item.id === request.workerId);
    return `<div class="manager-leave-row"><div class="manager-leave-info"><strong>${escapeHtml(worker?.name || 'Team member')}</strong><span>${request.startDate} → ${request.endDate} · ${escapeHtml(request.reason)}</span></div><div class="manager-leave-actions"><button class="btn btn-outline leave-action" data-leave-id="${request.id}" data-leave-action="rejected">Reject</button><button class="btn btn-primary leave-action" data-leave-id="${request.id}" data-leave-action="approved">Approve</button></div></div>`;
  }).join('');
}

async function processLeaveRequest(requestId, action) {
  const request = (window.mockDatabase.leaveRequests || []).find(item => item.id === requestId);
  if (!request) return;
  try {
    if (window.SmartShiftAPI) await window.SmartShiftAPI.updateLeaveRequest(requestId, action);
  request.status = action;
  if (action === 'approved') {
    const worker = window.mockDatabase.workers.find(item => item.id === request.workerId);
    const start = new Date(`${request.startDate}T12:00:00`);
    const end = new Date(`${request.endDate}T12:00:00`);
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
    if (worker) worker.leaveBalance = Math.max(0, (worker.leaveBalance ?? 12) - days);
  }
    if (!window.SmartShiftAPI) window.persistMockDatabase?.();
  renderLeaveApprovals();
  renderStaffDirectory();
  window.showToast?.(`Leave request ${action}.`, action === 'approved' ? 'success' : 'info');
  } catch (error) {
    window.showToast?.(error.message || 'Could not update the leave request.', 'danger');
  }
}

function initManagerSetup() {
  if (window.managerSetupInitialized) {
    renderStaffDirectory();
    renderLeaveApprovals();
    return;
  }
  window.managerSetupInitialized = true;
  renderStaffDirectory();
  renderLeaveApprovals();
  const shiftCard = document.getElementById('shiftFormCard');
  const staffFormCard = document.getElementById('staffFormCard');
  const directoryCard = document.getElementById('staffDirectoryCard');
  const toggle = (card, open) => { if (card) card.hidden = !open; };
  document.getElementById('btnOpenShiftForm')?.addEventListener('click', () => toggle(shiftCard, true));
  document.getElementById('btnCloseShiftForm')?.addEventListener('click', () => toggle(shiftCard, false));
  document.getElementById('btnOpenStaffForm')?.addEventListener('click', () => {
    toggle(staffFormCard, true);
    document.getElementById('newStaffName')?.focus();
  });
  document.getElementById('btnCloseStaffForm')?.addEventListener('click', () => toggle(staffFormCard, false));
  document.getElementById('btnToggleStaffDirectory')?.addEventListener('click', event => {
    const open = directoryCard.classList.toggle('is-collapsed') === false;
    event.currentTarget.textContent = open ? 'Hide team' : 'Show team';
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('managerLeaveRequests')?.addEventListener('click', event => {
    const button = event.target.closest('.leave-action');
    if (button) processLeaveRequest(button.dataset.leaveId, button.dataset.leaveAction);
  });

  document.getElementById('createShiftForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const date = document.getElementById('newShiftDate').value;
    const role = document.getElementById('newShiftRole').value;
    const duration = Number(document.getElementById('newShiftDuration').value);
    const startTime = document.getElementById('newShiftStartTime').value;
    const endTime = document.getElementById('newShiftEndTime').value;
    const timeRange = parseShiftTimeRange(startTime, endTime);
    if (!timeRange) {
      window.showToast?.('Choose a valid shift up to 12 hours long.', 'danger');
      document.getElementById('newShiftStartTime').focus();
      return;
    }
    const timeLabel = `${formatShiftClock(timeRange.start)} - ${formatShiftClock(timeRange.end)}`;
    const dayName = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    const shift = {
      id: `shift_${Date.now()}`, day: dayName.toLowerCase(), dayName, timeSlot: timeRange.timeSlot,
      timeLabel, duration, requiredRole: role,
      department: role === 'Cashier' ? 'Front Register' : role === 'Food Safety' ? 'Kitchen Prep' : 'Cafe Floor', assignedWorkerId: null
    };
    window.mockDatabase.shifts.push(shift);
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const saved = await window.persistMockDatabase?.();
    if (submitButton) submitButton.disabled = false;
    if (saved === false) {
      window.mockDatabase.shifts = window.mockDatabase.shifts.filter(item => item.id !== shift.id);
      return;
    }
    initRosterGrid();
    toggle(shiftCard, false);
    event.target.reset();
    window.showToast?.('Shift added to this week’s roster.', 'success');
  });

  document.getElementById('addStaffForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (form.dataset.submitting === 'true') return;
    const name = document.getElementById('newStaffName').value.trim();
    const email = document.getElementById('newStaffEmail').value.trim().toLowerCase();
    const role = document.getElementById('newStaffRole').value;
    const skills = document.getElementById('newStaffSkills').value.split(',').map(skill => skill.trim()).filter(Boolean);
    const duplicate = window.mockDatabase.workers.some(worker =>
      worker.name.trim().toLowerCase() === name.toLowerCase() && worker.role === role
      || String(worker.email || '').trim().toLowerCase() === email
    );
    if (duplicate) {
      window.showToast?.('This team member or email is already listed.', 'danger');
      document.getElementById('newStaffName').focus();
      return;
    }
    form.dataset.submitting = 'true';
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Adding…'; }
    const worker = {
      id: `emp_${Date.now()}`, name, email, role,
      certifications: skills, maxWeeklyHours: Number(document.getElementById('newStaffMaxHours').value), currentAssignedHours: 0,
      hourlyRate: Number(document.getElementById('newStaffRate').value), availability: {}
    };
    window.mockDatabase.workers.push(worker);
    const saved = await window.persistMockDatabase?.();
    if (saved === false) {
      window.mockDatabase.workers = window.mockDatabase.workers.filter(item => item.id !== worker.id);
      form.dataset.submitting = 'false';
      if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Add team member'; }
      return;
    }
    renderStaffDirectory();
    form.reset();
    toggle(staffFormCard, false);
    form.dataset.submitting = 'false';
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Add team member'; }
    window.showToast?.(`${worker.name} was added to your team.`, 'success');
    document.getElementById('staffDirectoryCard')?.classList.remove('is-collapsed');
    const teamToggle = document.getElementById('btnToggleStaffDirectory');
    if (teamToggle) { teamToggle.textContent = 'Hide team'; teamToggle.setAttribute('aria-expanded', 'true'); }
  });
}

window.refreshManagerWorkspace = function refreshManagerWorkspace() {
  const assignModal = document.getElementById('assignModal');
  if (assignModal?.classList.contains('active')) return;
  initRosterGrid();
  renderStaffDirectory();
  renderLeaveApprovals();
  initPublishButton();
};

window.initRosterGrid = initRosterGrid;
window.initFilterPills = initFilterPills;
window.initAssignModal = initAssignModal;
window.initPublishButton = initPublishButton;
window.initManagerSetup = initManagerSetup;
