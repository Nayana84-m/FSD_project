/**
 * SmartShift API adapter. The interface is intentionally small so the UI can
 * run from a file during review and transparently sync when the API is online.
 */
(function attachSmartShiftAPI() {
  const pageUsesHttp = window.location.protocol === "http:" || window.location.protocol === "https:";
  const baseUrl = window.SMARTSHIFT_API_URL || (pageUsesHttp
    ? `${window.location.origin}/api`
    : "http://localhost:3000/api");
  let token = window.localStorage.getItem("smartshift-token");

  async function request(path, options = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
    });
    if (!response.ok) throw new Error((await response.json()).error || "API request failed");
    return response.json();
  }

  window.SmartShiftAPI = {
    async login(credentials) {
      const result = await request("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
      token = result.data.token;
      window.localStorage.setItem("smartshift-token", token);
      return result.data.user;
    },
    async signup(credentials) {
      const result = await request("/auth/signup", { method: "POST", body: JSON.stringify(credentials) });
      token = result.data.token;
      window.localStorage.setItem("smartshift-token", token);
      return result.data.user;
    },
    async updateProfile(profile) {
      const result = await request("/profile", { method: "PUT", body: JSON.stringify(profile) });
      return result.data.user;
    },
    async loadWorkspace() {
      const result = await request("/workspace");
      return result.data.workspace;
    },
    async saveWorkspace(workspace) {
      return request("/workspace", { method: "PUT", body: JSON.stringify(workspace) });
    },
    async createLeaveRequest(requestData) {
      const result = await request("/leave-requests", { method: "POST", body: JSON.stringify(requestData) });
      return result.data;
    },
    async updateLeaveRequest(requestId, status) {
      const result = await request(`/leave-requests/${requestId}`, { method: "PUT", body: JSON.stringify({ status }) });
      return result.data;
    },
    async saveAvailability(workerId, availability) {
      return request(`/workers/${workerId}/availability`, { method: "PUT", body: JSON.stringify({ availability }) });
    },
    async assignShift(shiftId, workerId) {
      return request(`/shifts/${shiftId}/assign`, { method: "POST", body: JSON.stringify({ workerId }) });
    },
    async isHealthy() {
      try { await request("/health"); return true; } catch { return false; }
    }
  };
})();
