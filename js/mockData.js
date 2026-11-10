/**
 * SMART WORKSITE ROSTER & SHIFT MANAGER (ShiftFlow)
 * Mock Database Layer (Frontend Prototype)
 * Author: Member 4 (Middleware & Data Architect)
 */

const mockDatabase = {
  leaveRequests: [],
  rosterStatus: "draft",
  publishedAt: null,
  // Workers / Part-Time Employees Collection
  workers: [
    {
      id: "emp1",
      name: "Alex Rivera",
      avatar: "👨‍🍳",
      role: "Part-Time Barista",
      certifications: ["Barista", "Cashier", "Food Safety"],
      maxWeeklyHours: 25,
      currentAssignedHours: 18,
      hourlyRate: 250, // Rs. 250/hr
      availability: {
        monday: { morning: "available", afternoon: "available", evening: "unavailable" },
        tuesday: { morning: "available", afternoon: "preferred", evening: "unavailable" },
        wednesday: { morning: "available", afternoon: "available", evening: "available" },
        thursday: { morning: "preferred", afternoon: "available", evening: "unavailable" },
        friday: { morning: "available", afternoon: "preferred", evening: "available" },
        saturday: { morning: "preferred", afternoon: "available", evening: "available" },
        sunday: { morning: "unavailable", afternoon: "unavailable", evening: "unavailable" }
      }
    },
    {
      id: "emp2",
      name: "Sam Wilson",
      avatar: "👨‍💻",
      role: "Part-Time Barista",
      certifications: ["Barista", "Kitchen Prep"],
      maxWeeklyHours: 20,
      currentAssignedHours: 10,
      hourlyRate: 220, // Rs. 220/hr
      availability: {
        monday: { morning: "preferred", afternoon: "available", evening: "available" },
        tuesday: { morning: "available", afternoon: "available", evening: "available" },
        wednesday: { morning: "unavailable", afternoon: "unavailable", evening: "unavailable" },
        thursday: { morning: "available", afternoon: "available", evening: "unavailable" },
        friday: { morning: "available", afternoon: "unavailable", evening: "unavailable" }, // Friday PM unavailable!
        saturday: { morning: "available", afternoon: "preferred", evening: "available" },
        sunday: { morning: "available", afternoon: "available", evening: "available" }
      }
    },
    {
      id: "emp3",
      name: "Jordan Lee",
      avatar: "👩‍💼",
      role: "Part-Time Cashier",
      certifications: ["Cashier", "Food Safety"], // Lacks Barista cert!
      maxWeeklyHours: 25,
      currentAssignedHours: 12,
      hourlyRate: 200, // Rs. 200/hr
      availability: {
        monday: { morning: "available", afternoon: "available", evening: "available" },
        tuesday: { morning: "preferred", afternoon: "preferred", evening: "available" },
        wednesday: { morning: "available", afternoon: "available", evening: "available" },
        thursday: { morning: "available", afternoon: "available", evening: "available" },
        friday: { morning: "preferred", afternoon: "preferred", evening: "preferred" },
        saturday: { morning: "available", afternoon: "available", evening: "available" },
        sunday: { morning: "available", afternoon: "available", evening: "available" }
      }
    },
    {
      id: "emp4",
      name: "Taylor Swift",
      avatar: "👩‍🍳",
      role: "Lead Barista",
      certifications: ["Barista", "Cashier", "Shift Lead", "Food Safety"],
      maxWeeklyHours: 25,
      currentAssignedHours: 24, // Already 24/25 hrs -> Overtime breach on 5hr shift!
      hourlyRate: 300, // Rs. 300/hr
      availability: {
        monday: { morning: "available", afternoon: "available", evening: "available" },
        tuesday: { morning: "available", afternoon: "available", evening: "available" },
        wednesday: { morning: "available", afternoon: "available", evening: "available" },
        thursday: { morning: "available", afternoon: "available", evening: "available" },
        friday: { morning: "available", afternoon: "preferred", evening: "preferred" },
        saturday: { morning: "available", afternoon: "available", evening: "available" },
        sunday: { morning: "available", afternoon: "available", evening: "available" }
      }
    }
  ],

  // Store Shift Slots Collection
  shifts: [
    {
      id: "shift_fri_pm",
      day: "friday",
      dayName: "Friday",
      timeSlot: "evening",
      timeLabel: "4:00 PM - 9:00 PM",
      duration: 5,
      requiredRole: "Barista",
      department: "Cafe Floor ☕",
      assignedWorkerId: null
    },
    {
      id: "shift_sat_am",
      day: "saturday",
      dayName: "Saturday",
      timeSlot: "morning",
      timeLabel: "8:00 AM - 1:00 PM",
      duration: 5,
      requiredRole: "Cashier",
      department: "Front Register 💳",
      assignedWorkerId: null
    },
    {
      id: "shift_sat_pm",
      day: "saturday",
      dayName: "Saturday",
      timeSlot: "afternoon",
      timeLabel: "1:00 PM - 6:00 PM",
      duration: 5,
      requiredRole: "Barista",
      department: "Espresso Bar ☕",
      assignedWorkerId: null
    },
    {
      id: "shift_sun_am",
      day: "sunday",
      dayName: "Sunday",
      timeSlot: "morning",
      timeLabel: "8:00 AM - 1:00 PM",
      duration: 5,
      requiredRole: "Food Safety",
      department: "Kitchen Prep 🧁",
      assignedWorkerId: null
    }
  ]
};

// Keep the prototype usable without a server while preserving user changes
// between page refreshes. The API adapter can replace this data when the
// Node service is running locally.
const STORAGE_KEY = "smartshift-demo-data-v1";
try {
  const savedData = window.localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    const parsedData = JSON.parse(savedData);
    if (Array.isArray(parsedData.workers) && Array.isArray(parsedData.shifts)) {
      mockDatabase.workers = parsedData.workers;
      mockDatabase.shifts = parsedData.shifts;
    }
  }
} catch (error) {
  console.warn("SmartShift could not restore local demo data.", error);
}

// Demo requests make the manager approval workflow easy to review locally.
if (!mockDatabase.leaveRequests.length) {
  mockDatabase.leaveRequests = [
    { id: "leave_demo_1", workerId: "emp1", startDate: "2026-11-12", endDate: "2026-11-13", reason: "Personal leave", status: "pending" },
    { id: "leave_demo_2", workerId: "emp3", startDate: "2026-11-18", endDate: "2026-11-19", reason: "Medical leave", status: "pending" }
  ];
}

let workspaceSaveQueue = Promise.resolve();
let workspaceSavePending = 0;
window.persistMockDatabase = function persistMockDatabase(options = {}) {
  const session = window.SmartShiftAuth?.getSession();
  const storageKey = session?.workspaceId ? `${STORAGE_KEY}:${session.workspaceId}` : STORAGE_KEY;
  const snapshot = {
    workers: mockDatabase.workers,
    shifts: mockDatabase.shifts,
    leaveRequests: mockDatabase.leaveRequests || [],
    rosterStatus: mockDatabase.rosterStatus || "draft",
    publishedAt: mockDatabase.publishedAt || null
  };
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch (error) {
    console.warn("SmartShift could not save local demo data.", error);
  }

  if (options.sync === false || session?.role !== "manager" || !window.SmartShiftAPI) return Promise.resolve(true);
  const requestSnapshot = JSON.parse(JSON.stringify(snapshot));
  workspaceSavePending += 1;
  workspaceSaveQueue = workspaceSaveQueue
    .catch(() => {})
    .then(() => window.SmartShiftAPI.saveWorkspace(requestSnapshot))
    .then(() => true)
    .catch(error => {
      window.showToast?.(error.message || "Could not sync this cafe workspace to the database.", "danger");
      return false;
    })
    .finally(() => {
      workspaceSavePending = Math.max(0, workspaceSavePending - 1);
    });
  return workspaceSaveQueue;
};
window.hasPendingWorkspaceSave = () => workspaceSavePending > 0;

window.mockDatabase = mockDatabase;
