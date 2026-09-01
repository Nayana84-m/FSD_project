/**
 * SMART WORKSITE ROSTER & SHIFT MANAGER (ShiftFlow)
 * Mock Database Layer (Frontend Prototype)
 * Author: Member 4 (Middleware & Data Architect)
 */

const mockDatabase = {
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

window.mockDatabase = mockDatabase;
