/**
 * MANAGER ROSTER & SHIFT MATRIX - CUTE & FRIENDLY LOGIC
 * Author: Member 3 (Manager Roster Specialist)
 */

document.addEventListener("DOMContentLoaded", () => {
  initRosterGrid();
  initFilterPills();
  initAssignModal();
  initPublishButton();
});

let currentFilter = "all";
let activeShiftToAssign = null;

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
    btnConfirm.addEventListener("click", () => {
      if (!activeShiftToAssign) return;
      const selectedWorkerId = workerSelect.value;

      activeShiftToAssign.assignedWorkerId = selectedWorkerId;
      const assignedDay = activeShiftToAssign.dayName;
      const assignedWorker = window.mockDatabase.workers.find(worker => worker.id === selectedWorkerId);
      if (assignedWorker) assignedWorker.currentAssignedHours += activeShiftToAssign.duration;
      if (window.persistMockDatabase) window.persistMockDatabase();
      if (window.SmartShiftAPI) window.SmartShiftAPI.assignShift(activeShiftToAssign.id, selectedWorkerId);

      closeModal();
      initRosterGrid();
      if (window.showToast) {
        window.showToast(`Yay! Shift successfully assigned to ${assignedDay}! 🎉`, "success");
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

  publishBtn.addEventListener("click", () => {
    if (window.showToast) {
      window.showToast("🚀 Roster Published! All staff have been notified.", "success");
    }
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
      <div class="staff-directory-info"><strong>${escapeHtml(worker.name)}</strong><span>${escapeHtml(worker.role)} · ${(worker.certifications || []).join(', ') || 'Skills pending'}</span><span>${(window.mockDatabase.leaveRequests || []).filter(request => request.workerId === worker.id && request.status === 'pending').length ? '⏳ Leave request pending' : '✓ No pending leave'}</span></div>
      <div class="staff-directory-hours"><strong>${worker.currentAssignedHours || 0}/${worker.maxWeeklyHours || 0}h</strong><span>Rs. ${worker.hourlyRate || 0}/hr</span></div>
    </div>`).join('');
}

function initManagerSetup() {
  if (window.managerSetupInitialized) {
    renderStaffDirectory();
    return;
  }
  window.managerSetupInitialized = true;
  renderStaffDirectory();
  const shiftCard = document.getElementById('shiftFormCard');
  const staffCard = document.getElementById('staffFormCard');
  const toggle = (card, open) => { if (card) card.hidden = !open; };
  document.getElementById('btnOpenShiftForm')?.addEventListener('click', () => toggle(shiftCard, true));
  document.getElementById('btnCloseShiftForm')?.addEventListener('click', () => toggle(shiftCard, false));
  document.getElementById('btnOpenStaffForm')?.addEventListener('click', () => toggle(staffCard, true));
  document.getElementById('btnCloseStaffForm')?.addEventListener('click', () => toggle(staffCard, false));

  document.getElementById('createShiftForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const date = document.getElementById('newShiftDate').value;
    const role = document.getElementById('newShiftRole').value;
    const duration = Number(document.getElementById('newShiftDuration').value);
    const dayName = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    window.mockDatabase.shifts.push({
      id: `shift_${Date.now()}`, day: dayName.toLowerCase(), dayName, timeSlot: 'morning',
      timeLabel: document.getElementById('newShiftTime').value, duration, requiredRole: role,
      department: role === 'Cashier' ? 'Front Register' : role === 'Food Safety' ? 'Kitchen Prep' : 'Cafe Floor', assignedWorkerId: null
    });
    window.persistMockDatabase?.();
    initRosterGrid();
    toggle(shiftCard, false);
    event.target.reset();
    window.showToast?.('Shift added to this week’s roster.', 'success');
  });

  document.getElementById('addStaffForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const skills = document.getElementById('newStaffSkills').value.split(',').map(skill => skill.trim()).filter(Boolean);
    const worker = {
      id: `emp_${Date.now()}`, name: document.getElementById('newStaffName').value.trim(), role: document.getElementById('newStaffRole').value,
      certifications: skills, maxWeeklyHours: Number(document.getElementById('newStaffMaxHours').value), currentAssignedHours: 0,
      hourlyRate: Number(document.getElementById('newStaffRate').value), availability: {}
    };
    window.mockDatabase.workers.push(worker);
    window.persistMockDatabase?.();
    renderStaffDirectory();
    toggle(staffCard, false);
    event.target.reset();
    window.showToast?.(`${worker.name} was added to your team.`, 'success');
  });
}

window.initRosterGrid = initRosterGrid;
window.initFilterPills = initFilterPills;
window.initAssignModal = initAssignModal;
window.initPublishButton = initPublishButton;
window.initManagerSetup = initManagerSetup;
