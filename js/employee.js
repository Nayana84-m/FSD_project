/**
 * EMPLOYEE AVAILABILITY PORTAL - CUTE & FRIENDLY LOGIC
 * Author: Member 2 (Employee Experience Engineer)
 */

document.addEventListener("DOMContentLoaded", () => {
  initAvailabilityGrid();
  initSaveButton();
  initLeaveRequestForm();
});

const daysOfWeek = [
  { key: "monday", label: "Mon ☕" },
  { key: "tuesday", label: "Tue 🌱" },
  { key: "wednesday", label: "Wed 🧁" },
  { key: "thursday", label: "Thu ☀️" },
  { key: "friday", label: "Fri 🎉" },
  { key: "saturday", label: "Sat 🌸" },
  { key: "sunday", label: "Sun 🌿" }
];

const timeSlots = [
  { key: "morning", label: "Morning (8am - 1pm)" },
  { key: "afternoon", label: "Afternoon (1pm - 6pm)" },
  { key: "evening", label: "Evening (6pm - 10pm)" }
];

function escapeEmployeeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

// Current logged-in worker (Alex Rivera)
let currentWorker = window.mockDatabase.workers[0];
let availabilityHasUnsavedChanges = false;

function resolveCurrentWorker() {
  const session = window.SmartShiftAuth?.getSession();
  if (session?.role === 'employee') {
    currentWorker = window.mockDatabase.workers.find(worker => worker.id === (session.workerId || session.id)) || currentWorker;
  }
  return currentWorker;
}

function renderEmployeeSummary() {
  const worker = resolveCurrentWorker();
  const name = document.getElementById('employeeName');
  const role = document.getElementById('employeeRole');
  const certifications = document.getElementById('employeeCertifications');
  const hours = document.getElementById('empConfirmedHours');
  const maxHours = document.getElementById('empMaxHours');
  const pay = document.getElementById('empEstimatedPay');
  const leaveBalance = document.getElementById('empLeaveBalance');
  if (name) name.textContent = worker.name;
  if (role) role.textContent = worker.role;
  if (certifications) certifications.innerHTML = (worker.certifications || []).length
    ? worker.certifications.map(skill => `<span class="badge badge-info">${escapeEmployeeText(skill)}</span>`).join(' ')
    : '<span class="badge">Skills pending</span>';
  if (hours) hours.textContent = worker.currentAssignedHours || 0;
  if (maxHours) maxHours.textContent = worker.maxWeeklyHours || 25;
  if (pay) pay.textContent = ((worker.currentAssignedHours || 0) * (worker.hourlyRate || 0)).toLocaleString('en-IN');
  if (leaveBalance) leaveBalance.textContent = worker.leaveBalance ?? 12;
  renderLeaveRequests(worker);
  renderUpcomingShifts(worker);
}

function renderUpcomingShifts(worker) {
  const list = document.getElementById('employeeUpcomingShifts');
  const status = document.getElementById('employeeRosterStatus');
  const message = document.getElementById('employeeRosterMessage');
  if (!list) return;
  const published = window.mockDatabase.rosterStatus === 'published';
  if (status) {
    status.textContent = published ? 'Published' : 'Draft';
    status.className = `roster-status ${published ? 'published' : 'draft'}`;
  }
  const shifts = published ? window.mockDatabase.shifts.filter(shift => shift.assignedWorkerId === worker.id) : [];
  if (message) message.textContent = published ? 'Here are the shifts your manager has confirmed for you.' : 'Your manager has not published this roster yet.';
  list.innerHTML = shifts.length ? shifts.map(shift => `<div class="upcoming-shift-row"><strong class="upcoming-shift-day">${shift.dayName}</strong><div class="upcoming-shift-info"><strong>${shift.timeLabel}</strong><span>${shift.department} · ${shift.requiredRole} · ${shift.duration} hours</span></div><strong class="upcoming-shift-pay">Rs. ${(shift.duration * (worker.hourlyRate || 0)).toLocaleString('en-IN')}</strong></div>`).join('') : '<p class="empty-state">No confirmed shifts to show yet.</p>';
}

function renderLeaveRequests(worker) {
  const list = document.getElementById('employeeLeaveRequests');
  if (!list) return;
  const requests = (window.mockDatabase.leaveRequests || []).filter(request => request.workerId === worker.id).slice().reverse();
  list.innerHTML = requests.length ? requests.map(request => `<div class="leave-request-row"><span>${request.startDate} → ${request.endDate}<small>${request.reason}</small></span><strong class="leave-status ${request.status}">${request.status}</strong></div>`).join('') : '<p class="empty-state">No leave requests yet.</p>';
}

function initLeaveRequestForm() {
  const form = document.getElementById('leaveRequestForm');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const worker = resolveCurrentWorker();
    const startDate = document.getElementById('leaveStartDate').value;
    const endDate = document.getElementById('leaveEndDate').value;
    if (endDate < startDate) return window.showToast?.('Leave end date must be after the start date.', 'danger', 9000);
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    const requestData = { startDate, endDate, reason: document.getElementById('leaveReason').value.trim() };
    try {
      let savedRequest;
      if (window.SmartShiftAPI) {
        const result = await window.SmartShiftAPI.createLeaveRequest(requestData);
        savedRequest = result.request;
      } else {
        savedRequest = { id: `leave_${Date.now()}`, workerId: worker.id, ...requestData, status: 'pending' };
      }
    window.mockDatabase.leaveRequests = window.mockDatabase.leaveRequests || [];
      if (!window.mockDatabase.leaveRequests.some(item => item.id === savedRequest.id)) window.mockDatabase.leaveRequests.push(savedRequest);
      if (!window.SmartShiftAPI) window.persistMockDatabase?.();
    renderLeaveRequests(worker);
    form.reset();
    window.showToast?.('Leave request sent to your manager.', 'success');
    } catch (error) {
      window.showToast?.(error.message || 'Could not send your leave request.', 'danger');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

function initAvailabilityGrid() {
  renderEmployeeSummary();
  const gridContainer = document.getElementById("availabilityGrid");
  if (!gridContainer) return;

  gridContainer.innerHTML = "";

  // 1. Top-Left Corner
  const cornerHeader = document.createElement("div");
  cornerHeader.className = "time-col-header";
  cornerHeader.innerText = "Time Slot ⏰";
  gridContainer.appendChild(cornerHeader);

  // 2. Day Headers (Mon - Sun)
  daysOfWeek.forEach(day => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "day-col-header";
    dayHeader.innerText = day.label;
    gridContainer.appendChild(dayHeader);
  });

  // 3. Slot Rows
  timeSlots.forEach(slot => {
    const slotLabel = document.createElement("div");
    slotLabel.className = "time-slot-label";
    slotLabel.innerText = slot.label;
    gridContainer.appendChild(slotLabel);

    daysOfWeek.forEach(day => {
      const cell = document.createElement("div");
      const currentStatus = (currentWorker.availability[day.key] && currentWorker.availability[day.key][slot.key]) || "available";

      cell.className = `slot-cell ${currentStatus}`;
      cell.dataset.day = day.key;
      cell.dataset.slot = slot.key;
      cell.dataset.status = currentStatus;

      cell.setAttribute("role", "button");
      cell.setAttribute("tabindex", "0");
      cell.setAttribute("aria-label", `${day.label} ${slot.label}: ${formatStatusLabel(currentStatus)}`);
      cell.innerHTML = `<span>${formatStatusLabel(currentStatus)}</span>`;

      // Tap to cycle status
      cell.addEventListener("click", () => handleSlotClick(cell, day.key, slot.key));
      cell.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSlotClick(cell, day.key, slot.key);
        }
      });

      gridContainer.appendChild(cell);
    });
  });
}

function handleSlotClick(cell, dayKey, slotKey) {
  availabilityHasUnsavedChanges = true;
  const statusCycle = {
    available: "preferred",
    preferred: "unavailable",
    unavailable: "available"
  };

  const currentStatus = cell.dataset.status;
  const nextStatus = statusCycle[currentStatus] || "available";

  cell.classList.remove("available", "preferred", "unavailable");
  cell.classList.add(nextStatus);
  cell.dataset.status = nextStatus;
  cell.setAttribute("aria-label", `${cell.dataset.day} ${cell.dataset.slot}: ${formatStatusLabel(nextStatus)}`);
  cell.innerHTML = `<span>${formatStatusLabel(nextStatus)}</span>`;

  if (!currentWorker.availability[dayKey]) {
    currentWorker.availability[dayKey] = {};
  }
  currentWorker.availability[dayKey][slotKey] = nextStatus;
}

function formatStatusLabel(status) {
  if (status === "preferred") return "Loved ⭐";
  if (status === "unavailable") return "Busy ✕";
  return "Free ✓";
}

function initSaveButton() {
  const saveBtn = document.getElementById("btnSaveAvailability");
  if (!saveBtn || saveBtn.dataset.bound === "true") return;
  saveBtn.dataset.bound = "true";

  saveBtn.addEventListener("click", async () => {
    saveBtn.innerText = "⏳ Saving...";
    saveBtn.disabled = true;
    try {
      if (window.SmartShiftAPI) await window.SmartShiftAPI.saveAvailability(currentWorker.id, currentWorker.availability);
      if (window.persistMockDatabase && !window.SmartShiftAPI) window.persistMockDatabase();
      availabilityHasUnsavedChanges = false;
      saveBtn.innerText = "💾 Save My Schedule";
      saveBtn.disabled = false;
      window.showToast?.("Your availability was saved for your manager.", "success");
    } catch (error) {
      saveBtn.innerText = "💾 Save My Schedule";
      window.showToast?.(error.message || "Could not save your availability.", "danger");
    } finally {
      saveBtn.disabled = false;
    }
  });
}

window.initAvailabilityGrid = initAvailabilityGrid;
window.initSaveButton = initSaveButton;
window.initLeaveRequestForm = initLeaveRequestForm;
window.hasUnsavedAvailabilityChanges = () => availabilityHasUnsavedChanges;
window.refreshEmployeeWorkspace = function refreshEmployeeWorkspace() {
  renderEmployeeSummary();
};

