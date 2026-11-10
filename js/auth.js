/** Shared client-side session state for role-based route protection. */
(function attachSmartShiftAuth() {
  const key = 'smartshift-session';
  window.SmartShiftAuth = {
    getSession() {
      try { return JSON.parse(window.localStorage.getItem(key)); } catch { return null; }
    },
    setSession(user) {
      window.localStorage.setItem(key, JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.businessName || '',
        workspaceId: user.workspaceId || '',
        joinCode: user.joinCode || '',
        workerId: user.workerId || ''
      }));
    },
    clearSession() { window.localStorage.removeItem(key); }
  };
})();
