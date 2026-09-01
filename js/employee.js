/**
 * EMPLOYEE AVAILABILITY PORTAL - CUTE & FRIENDLY LOGIC
 * Author: Member 2 (Employee Experience Engineer)
 */

document.addEventListener("DOMContentLoaded", () => {
  initAvailabilityGrid();
  initSaveButton();
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

// Current logged-in worker (Alex Rivera)
let currentWorker = window.mockDatabase.workers[0];

function initAvailabilityGrid() {
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

      cell.innerHTML = `<span>${formatStatusLabel(currentStatus)}</span>`;

      // Tap to cycle status
      cell.addEventListener("click", () => handleSlotClick(cell, day.key, slot.key));

      gridContainer.appendChild(cell);
    });
  });
}

function handleSlotClick(cell, dayKey, slotKey) {
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
  if (!saveBtn) return;

  saveBtn.addEventListener("click", () => {
    saveBtn.innerText = "⏳ Saving...";
    saveBtn.disabled = true;

    setTimeout(() => {
      saveBtn.innerText = "💾 Save My Schedule";
      saveBtn.disabled = false;
      if (window.showToast) {
        window.showToast("Your weekly schedule was saved and synced to your manager! 🎉", "success");
      }
    }, 500);
  });
}

window.initAvailabilityGrid = initAvailabilityGrid;
window.initSaveButton = initSaveButton;

