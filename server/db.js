const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dns = require("node:dns");
const { promisify } = require("node:util");
const { MongoClient } = require("mongodb");
const scrypt = promisify(crypto.scrypt);

const dbPath = process.env.SMARTSHIFT_DATA_FILE || path.join(__dirname, "data", "db.json");
let client;
let mongoDb;
let useMongo = false;
let memoryState;

function readLocalDb() {
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeLocalDb(data) {
  fs.writeFileSync(dbPath, `${JSON.stringify(data, null, 2)}\n`);
}

function defaultBusinessName(user) {
  const name = String(user?.name || "My").trim();
  return `${name}'s Cafe`;
}

function ensureWorkspaces(state) {
  let changed = false;
  if (!Array.isArray(state.workspaces)) {
    state.workspaces = [];
    changed = true;
  }

  const managers = (state.users || []).filter(user => user.role === "manager");
  const usedCodes = new Set(managers.map(user => user.joinCode).filter(Boolean));
  const template = {
    workers: state.workers || [],
    shifts: state.shifts || [],
    leaveRequests: state.leaveRequests || [],
    rosterStatus: state.rosterStatus || "draft",
    publishedAt: state.publishedAt || null
  };

  for (const [managerIndex, manager] of managers.entries()) {
    if (!manager.businessName) {
      manager.businessName = defaultBusinessName(manager);
      changed = true;
    }
    if (!manager.workspaceId) {
      manager.workspaceId = manager.id;
      changed = true;
    }
    if (!manager.joinCode) {
      let code;
      do { code = crypto.randomBytes(4).toString("hex").toUpperCase(); } while (usedCodes.has(code));
      manager.joinCode = code;
      usedCodes.add(code);
      changed = true;
    }
    let workspace = state.workspaces.find(item => item.id === manager.workspaceId || item.managerId === manager.id);
    if (!workspace) {
      workspace = {
        id: manager.workspaceId,
        managerId: manager.id,
        businessName: manager.businessName,
        joinCode: manager.joinCode,
        ...(managerIndex === 0
          ? structuredClone(template)
          : { workers: [], shifts: [], leaveRequests: [], rosterStatus: "draft", publishedAt: null })
      };
      state.workspaces.push(workspace);
      changed = true;
    } else {
      workspace.id = manager.workspaceId;
      workspace.managerId = manager.id;
      workspace.businessName = manager.businessName;
      workspace.joinCode = manager.joinCode;
    }
  }

  for (const workspace of state.workspaces) {
    workspace.workers ||= [];
    workspace.shifts ||= [];
    workspace.leaveRequests ||= [];
    workspace.rosterStatus ||= "draft";
    workspace.publishedAt ||= null;
    for (const worker of workspace.workers) {
      if (!Array.isArray(worker.certifications)) { worker.certifications = []; changed = true; }
      if (!worker.availability || typeof worker.availability !== "object") { worker.availability = {}; changed = true; }
      if (!Number.isFinite(Number(worker.maxWeeklyHours))) { worker.maxWeeklyHours = 25; changed = true; }
      if (!Number.isFinite(Number(worker.currentAssignedHours))) { worker.currentAssignedHours = 0; changed = true; }
      if (!Number.isFinite(Number(worker.hourlyRate))) { worker.hourlyRate = 200; changed = true; }
    }
  }

  const defaultWorkspaceId = managers[0]?.workspaceId;
  for (const employee of (state.users || []).filter(user => user.role === "employee")) {
    if (!employee.workspaceId && defaultWorkspaceId) {
      employee.workspaceId = defaultWorkspaceId;
      changed = true;
    }
    const workspace = state.workspaces.find(item => item.id === employee.workspaceId);
    if (workspace) {
      const linkedWorker = workspace.workers.find(worker =>
        worker.userId === employee.id || worker.id === employee.workerId || worker.id === employee.id
      );
      const worker = linkedWorker || (state.workers || []).find(item => item.id === employee.id) || {
        id: employee.id,
        name: employee.name,
        role: "Staff member",
        certifications: [],
        maxWeeklyHours: 25,
        currentAssignedHours: 0,
        hourlyRate: 200,
        availability: {}
      };
      if (!linkedWorker) {
        worker.userId = employee.id;
        workspace.workers.push(structuredClone(worker));
        changed = true;
      }
      if (!employee.workerId) {
        employee.workerId = worker.id;
        changed = true;
      }
    }
  }
  return changed;
}

function makePrototypeState() {
  const data = readLocalDb();
  if (!data.workers.length || !data.shifts.length) {
    data.workers = [
      { id: "emp1", name: "Alex Rivera", role: "Part-Time Barista", certifications: ["Barista", "Cashier", "Food Safety"], maxWeeklyHours: 25, currentAssignedHours: 18, hourlyRate: 250, availability: {} },
      { id: "emp2", name: "Sam Wilson", role: "Part-Time Barista", certifications: ["Barista", "Kitchen Prep"], maxWeeklyHours: 20, currentAssignedHours: 10, hourlyRate: 220, availability: {} },
      { id: "emp3", name: "Jordan Lee", role: "Part-Time Cashier", certifications: ["Cashier", "Food Safety"], maxWeeklyHours: 25, currentAssignedHours: 12, hourlyRate: 200, availability: {} },
      { id: "emp4", name: "Taylor Swift", role: "Lead Barista", certifications: ["Barista", "Cashier", "Shift Lead", "Food Safety"], maxWeeklyHours: 25, currentAssignedHours: 24, hourlyRate: 300, availability: {} }
    ];
  }
  data.leaveRequests ||= [];
  data.rosterStatus ||= "draft";
  data.publishedAt ||= null;
  data.auditLog ||= [];
  for (const user of data.users || []) {
    if (user.role === "manager" && !user.businessName) user.businessName = defaultBusinessName(user);
  }
  ensureWorkspaces(data);
  return data;
}

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    memoryState = makePrototypeState();
    console.log("DATABASE_MODE=local-json");
    return { connected: false, mode: "local-json" };
  }

  const dnsServers = (process.env.MONGODB_DNS_SERVERS || "8.8.8.8").split(",").map(value => value.trim()).filter(Boolean);
  if (dnsServers.length) dns.setServers(dnsServers);

  client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  mongoDb = client.db(process.env.MONGODB_DB_NAME || "smartshift");
  useMongo = true;
  const stateCollection = mongoDb.collection("application_state");
  const existing = await stateCollection.findOne({ _id: "smartshift" });
  if (!existing) {
    const initial = makePrototypeState();
    ensureWorkspaces(initial);
    for (const user of initial.users) await secureUserPassword(user);
    await stateCollection.insertOne({ _id: "smartshift", ...initial, updatedAt: new Date() });
  } else {
    const { _id, updatedAt, ...state } = existing;
    let changed = ensureWorkspaces(state);
    for (const user of state.users || []) {
      if (user.role === "manager" && !user.businessName) {
        user.businessName = defaultBusinessName(user);
        changed = true;
      }
      if (user.password && !user.passwordHash) {
        await secureUserPassword(user);
        changed = true;
      }
    }
    if (changed) await stateCollection.replaceOne({ _id: "smartshift" }, { _id: "smartshift", ...state, updatedAt: new Date() });
  }
  await stateCollection.createIndex({ "users.email": 1 });
  console.log(`DATABASE_MODE=atlas database=${mongoDb.databaseName}`);
  return { connected: true, mode: "atlas", database: mongoDb.databaseName };
}

async function secureUserPassword(user) {
  const salt = crypto.randomBytes(16).toString("hex");
  user.passwordHash = (await scrypt(user.password, salt, 64)).toString("hex");
  user.passwordSalt = salt;
  delete user.password;
}

async function verifyUserPassword(user, password) {
  if (user.passwordHash && user.passwordSalt) {
    const candidate = await scrypt(password, user.passwordSalt, 64);
    return crypto.timingSafeEqual(candidate, Buffer.from(user.passwordHash, "hex"));
  }
  // Legacy local demo data is supported only in local mode.
  return !useMongo && user.password === password;
}

async function readDb() {
  if (useMongo) {
    const state = await mongoDb.collection("application_state").findOne({ _id: "smartshift" });
    const { _id, updatedAt, ...data } = state;
    return data;
  }
  return memoryState || makePrototypeState();
}

async function writeDb(data) {
  if (useMongo) {
    await mongoDb.collection("application_state").replaceOne(
      { _id: "smartshift" },
      { _id: "smartshift", ...data, updatedAt: new Date() },
      { upsert: true }
    );
    return;
  }
  memoryState = data;
  writeLocalDb(data);
}

async function closeDatabase() {
  if (client) await client.close();
}

async function databaseStatus() {
  if (!useMongo) return "local-json";
  await mongoDb.command({ ping: 1 });
  return "atlas";
}

module.exports = { dbPath, connectDatabase, readDb, writeDb, closeDatabase, databaseStatus, secureUserPassword, verifyUserPassword };
