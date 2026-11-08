const fs = require("node:fs");
const path = require("node:path");

const dbPath = path.join(__dirname, "data", "db.json");

function readDb() {
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`);
}

function seedFromPrototype(db) {
  if (db.workers.length || db.shifts.length) return db;
  db.workers = [
    { id: "emp1", name: "Alex Rivera", role: "Part-Time Barista", certifications: ["Barista", "Cashier", "Food Safety"], maxWeeklyHours: 25, currentAssignedHours: 18, hourlyRate: 250 },
    { id: "emp2", name: "Sam Wilson", role: "Part-Time Barista", certifications: ["Barista", "Kitchen Prep"], maxWeeklyHours: 20, currentAssignedHours: 10, hourlyRate: 220 },
    { id: "emp3", name: "Jordan Lee", role: "Part-Time Cashier", certifications: ["Cashier", "Food Safety"], maxWeeklyHours: 25, currentAssignedHours: 12, hourlyRate: 200 },
    { id: "emp4", name: "Taylor Swift", role: "Lead Barista", certifications: ["Barista", "Cashier", "Shift Lead", "Food Safety"], maxWeeklyHours: 25, currentAssignedHours: 24, hourlyRate: 300 }
  ];
  db.shifts = [
    { id: "shift_fri_pm", day: "friday", dayName: "Friday", timeSlot: "evening", timeLabel: "4:00 PM - 9:00 PM", duration: 5, requiredRole: "Barista", department: "Cafe Floor", assignedWorkerId: null },
    { id: "shift_sat_am", day: "saturday", dayName: "Saturday", timeSlot: "morning", timeLabel: "8:00 AM - 1:00 PM", duration: 5, requiredRole: "Cashier", department: "Front Register", assignedWorkerId: null },
    { id: "shift_sat_pm", day: "saturday", timeSlot: "afternoon", dayName: "Saturday", timeLabel: "1:00 PM - 6:00 PM", duration: 5, requiredRole: "Barista", department: "Espresso Bar", assignedWorkerId: null },
    { id: "shift_sun_am", day: "sunday", dayName: "Sunday", timeSlot: "morning", timeLabel: "8:00 AM - 1:00 PM", duration: 5, requiredRole: "Food Safety", department: "Kitchen Prep", assignedWorkerId: null }
  ];
  writeDb(db);
  return db;
}

module.exports = { dbPath, readDb, writeDb, seedFromPrototype };
