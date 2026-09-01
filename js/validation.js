/**
 * SMART MIDDLEWARE ASSISTANT - CUTE & FRIENDLY VALIDATION ENGINE
 * Author: Member 4 (Middleware & Data Architect)
 */

const SmartValidator = {
  /**
   * Check 1: Skill / Certification
   */
  checkSkill: function (worker, shift) {
    const hasSkill = worker.certifications.includes(shift.requiredRole);
    return {
      rule: "Skill Match Check 🎯",
      passed: hasSkill,
      icon: hasSkill ? "✅" : "❌",
      detail: hasSkill
        ? `Worker has '${shift.requiredRole}' certification. Ready for this role!`
        : `Worker lacks '${shift.requiredRole}' certification. Needs training first.`
    };
  },

  /**
   * Check 2: Availability
   */
  checkAvailability: function (worker, shift) {
    const dayAvailability = worker.availability[shift.day];
    const slotStatus = dayAvailability ? dayAvailability[shift.timeSlot] : "unavailable";

    const isAvailable = slotStatus === "available" || slotStatus === "preferred";
    return {
      rule: "Staff Free Time Check 📅",
      passed: isAvailable,
      icon: isAvailable ? (slotStatus === "preferred" ? "⭐" : "✅") : "❌",
      detail: isAvailable
        ? `Worker marked ${shift.dayName} (${shift.timeSlot}) as '${slotStatus === "preferred" ? "Loved Shift ⭐" : "Available 🟢"}'.`
        : `Worker marked ${shift.dayName} (${shift.timeSlot}) as 'Busy / Can't Work 🔴'.`
    };
  },

  /**
   * Check 3: Overtime Limit
   */
  checkOvertime: function (worker, shift) {
    const projectedHours = worker.currentAssignedHours + shift.duration;
    const isUnderLimit = projectedHours <= worker.maxWeeklyHours;
    
    return {
      rule: "Max Hours Balance ⏰",
      passed: isUnderLimit,
      icon: isUnderLimit ? "✅" : "⚠️",
      detail: isUnderLimit
        ? `Projected hours: ${projectedHours}h / ${worker.maxWeeklyHours}h max (Balanced & Safe 👍).`
        : `Projected hours (${projectedHours}h) exceeds weekly limit (${worker.maxWeeklyHours}h)! Overtime risk.`
    };
  },

  /**
   * Run All 3 Checks
   */
  validateAssignment: function (workerId, shiftId) {
    const worker = window.mockDatabase.workers.find(w => w.id === workerId);
    const shift = window.mockDatabase.shifts.find(s => s.id === shiftId);

    if (!worker || !shift) {
      return {
        isValid: false,
        summary: "Invalid worker or shift selection.",
        checks: []
      };
    }

    const check1 = this.checkSkill(worker, shift);
    const check2 = this.checkAvailability(worker, shift);
    const check3 = this.checkOvertime(worker, shift);

    const checks = [check1, check2, check3];
    const allPassed = checks.every(c => c.passed);

    return {
      isValid: allPassed,
      workerName: worker.name,
      shiftLabel: `${shift.dayName} ${shift.timeLabel} (${shift.requiredRole})`,
      checks: checks,
      statusMessage: allPassed 
        ? "✨ All 3 Checks Passed! Assignment is safe and conflict-free." 
        : "🚫 Shift Blocked! Please resolve the conflict above before assigning."
    };
  }
};

window.SmartValidator = SmartValidator;
