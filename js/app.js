/**
 * SHIFTFLOW - CUTE & FRIENDLY APPLICATION CONTROLLER
 * Author: Team Lead (Frontend Architect)
 */

document.addEventListener("DOMContentLoaded", () => {
  initLiveDemoModal();
  initToastSystem();
});

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast`;
  
  const icon = type === "success" ? "🎉" : type === "danger" ? "🚫" : "ℹ️";
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  
  if (type === "danger") {
    toast.style.background = "#991b1b";
  } else if (type === "success") {
    toast.style.background = "#065f46";
  }

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

window.showToast = showToast;

function initLiveDemoModal() {
  const btnOpen = document.getElementById("btnOpenDemo");
  const btnQuickTest = document.getElementById("btnRunQuickTest");
  const modal = document.getElementById("demoModal");
  const btnClose = document.getElementById("btnCloseModal");
  const btnCloseBtn = document.getElementById("btnCloseModalBtn");
  const btnRunValidation = document.getElementById("btnRunValidationAction");
  
  const workerSelect = document.getElementById("demoWorkerSelect");
  const shiftSelect = document.getElementById("demoShiftSelect");
  const feedbackContent = document.getElementById("demoFeedbackContent");

  const openModal = () => {
    if (modal) modal.classList.add("active");
  };

  const closeModal = () => {
    if (modal) modal.classList.remove("active");
  };

  if (btnOpen) btnOpen.addEventListener("click", openModal);
  if (btnQuickTest) btnQuickTest.addEventListener("click", openModal);
  if (btnClose) btnClose.addEventListener("click", closeModal);
  if (btnCloseBtn) btnCloseBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (btnRunValidation) {
    btnRunValidation.addEventListener("click", () => {
      const workerId = workerSelect.value;
      const shiftId = shiftSelect.value;

      const result = window.SmartValidator.validateAssignment(workerId, shiftId);

      renderValidationFeedback(result, feedbackContent);

      if (result.isValid) {
        showToast("Yay! Shift assignment passed all 3 rules! ✨", "success");
      } else {
        showToast("Conflict detected! Assignment blocked to keep things safe. 🚫", "danger");
      }
    });
  }
}

function renderValidationFeedback(result, container) {
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
    <div style="margin-bottom: 0.65rem; font-weight:700; font-size:0.9rem;">
      Assignment Target: ${result.workerName} &rarr; ${result.shiftLabel}
    </div>
    <div style="background:white; border-radius:10px; border:1px solid #eceae3; padding:0.6rem 0.85rem;">
      ${checksHtml}
    </div>
    <div class="validation-summary-alert ${alertClass}">
      ${result.statusMessage}
    </div>
  `;
}
