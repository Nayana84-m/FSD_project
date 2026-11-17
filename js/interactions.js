/**
 * SMARTSHIFT — interactions.js
 * Single Page Application (SPA) View Router & Component Handlers
 */

'use strict';

// SPA View Switcher
function switchView(targetView, scrollToSectionId = null) {
  const views = ['landing', 'login', 'employee', 'manager', 'profile', 'admin'];
  const session = window.SmartShiftAuth?.getSession();

  let wrongRole = false;
  if (targetView === 'employee' && session && session.role !== 'employee') wrongRole = true;
  if (targetView === 'manager' && session && !['manager', 'admin'].includes(session.role)) wrongRole = true;
  if (targetView === 'admin' && session && session.role !== 'admin') wrongRole = true;

  if (wrongRole) {
    window.SmartShiftAuth.clearSession();
    window.localStorage.removeItem('smartshift-token');
    updateAuthNav();
    setLoginRole(targetView === 'admin' ? 'admin' : targetView);
    targetView = 'login';
  } else if ((targetView === 'employee' || targetView === 'manager' || targetView === 'admin') && !session) {
    setLoginRole(targetView);
    targetView = 'login';
  } else if (targetView === 'profile' && !session) {
    targetView = 'login';
  }
  
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) {
      if (v === targetView) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  });

  // Update active state in nav links
  document.querySelectorAll('.spa-nav-link').forEach(link => {
    if (link.dataset.targetView === targetView) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Close mobile menu if open
  const mobileMenu = document.getElementById('mobileMenu');
  const hamburger = document.getElementById('hamburger');
  if (mobileMenu) mobileMenu.classList.remove('open');
  if (hamburger) hamburger.classList.remove('open');

  // Scroll logic
  if (scrollToSectionId) {
    setTimeout(() => {
      const section = document.getElementById(scrollToSectionId);
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Re-initialize view specific grids/components
  if (targetView === 'employee' && typeof window.initAvailabilityGrid === 'function') {
    window.initAvailabilityGrid();
    if (typeof window.initSaveButton === 'function') window.initSaveButton();
  } else if (targetView === 'manager' && typeof window.initRosterGrid === 'function') {
    updateManagerBusinessBranding(session);
    window.initRosterGrid();
    if (typeof window.initManagerSetup === 'function') window.initManagerSetup();
    if (typeof window.initAssignModal === 'function') window.initAssignModal();
    if (typeof window.initFilterPills === 'function') window.initFilterPills();
    if (typeof window.initPublishButton === 'function') window.initPublishButton();
  } else if (targetView === 'admin' && typeof window.initAdminDashboard === 'function') {
    window.initAdminDashboard();
  } else if (targetView === 'profile') {
    renderProfile();
  }
}

window.switchView = switchView;

function setLoginRole(role) {
  window.smartShiftSelectedRole = role;
  document.querySelectorAll('.auth-role-card').forEach(card => {
    const active = card.dataset.role === role;
    card.classList.toggle('active', active);
    card.setAttribute('aria-pressed', String(active));
  });
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  if (email) {
    email.value = role === 'admin' ? 'admin@smartshift.local' : role === 'manager' ? 'manager@smartshift.local' : 'alex.rivera@smartshift.com';
  }
  if (password) {
    password.value = role === 'admin' ? 'admin123' : role === 'manager' ? 'manager123' : 'employee123';
  }
  const helper = document.getElementById('authHelper');
  if (helper) {
    helper.textContent = role === 'admin'
      ? 'Welcome back. Log in to your cafe administration console.'
      : `Welcome back. Log in to continue to your ${role === 'manager' ? 'manager' : 'staff'} workspace.`;
  }
}

// Global Toast Notification Helper
function showToast(msg, type = 'info', duration = 5000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.textContent = msg;
  toastEl.setAttribute('role', type === 'danger' ? 'alert' : 'status');
  if (type === 'danger') toastEl.style.background = '#991b1b';
  if (type === 'success') toastEl.style.background = '#065f46';
  container.appendChild(toastEl);
  requestAnimationFrame(() => toastEl.classList.add('show'));
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.remove(), 250);
  }, duration);
}

window.showToast = showToast;

function updateAuthNav() {
  const session = window.SmartShiftAuth?.getSession();
  const profileButton = document.getElementById('btnProfile');
  const loginButton = document.getElementById('btnLogin');
  const signupButton = document.getElementById('btnSignup');
  const mobileLoginButton = document.getElementById('btnLoginM');
  const mobileSignupButton = document.getElementById('btnSignupM');
  if (profileButton) profileButton.hidden = !session;
  if (loginButton) loginButton.hidden = Boolean(session);
  if (signupButton) signupButton.hidden = Boolean(session);
  if (mobileLoginButton) mobileLoginButton.hidden = Boolean(session);
  if (mobileSignupButton) mobileSignupButton.hidden = Boolean(session);
  document.body.classList.toggle('workspace-mode', Boolean(session));
  document.querySelectorAll('[data-public-nav="true"]').forEach(link => { link.hidden = Boolean(session); });
  document.querySelectorAll('[data-role-nav]').forEach(link => {
    if (!session) {
      link.hidden = true;
    } else if (session.role === 'admin') {
      link.hidden = !['admin', 'manager'].includes(link.dataset.roleNav);
    } else {
      link.hidden = link.dataset.roleNav !== session.role;
    }
  });
}

let workspacePollingTimer = null;
let lastWorkspaceSnapshot = '';
let workspaceRefreshInFlight = false;

async function refreshWorkspaceFromServer() {
  const session = window.SmartShiftAuth?.getSession();
  if (!session || !window.SmartShiftAPI || document.hidden || workspaceRefreshInFlight || window.hasPendingWorkspaceSave?.()) return;
  if (session.role === 'employee' && window.hasUnsavedAvailabilityChanges?.()) return;
  const assignModal = document.getElementById('assignModal');
  if (session.role === 'manager' && assignModal?.classList.contains('active')) return;

  workspaceRefreshInFlight = true;
  try {
    const workspace = await window.SmartShiftAPI.loadWorkspace();
    const snapshot = JSON.stringify(workspace);
    if (snapshot === lastWorkspaceSnapshot) return;
    lastWorkspaceSnapshot = snapshot;
    Object.assign(window.mockDatabase, workspace);
    const updatedSession = { ...session, businessName: workspace.businessName || session.businessName || '' };
    window.SmartShiftAuth.setSession(updatedSession);

    const activeView = session.role === 'admin' ? 'admin' : session.role === 'manager' ? 'manager' : 'employee';
    if (document.getElementById(`view-${activeView}`)?.classList.contains('active')) {
      if (session.role === 'admin') {
        window.refreshAdminDashboard?.();
      } else if (session.role === 'manager') {
        updateManagerBusinessBranding(updatedSession);
        window.refreshManagerWorkspace?.();
      } else {
        window.refreshEmployeeWorkspace?.();
      }
    } else if (document.getElementById('view-manager')?.classList.contains('active') && session.role === 'admin') {
      window.refreshManagerWorkspace?.();
    } else if (document.getElementById('view-profile')?.classList.contains('active')) {
      renderProfile();
    }
  } catch (error) {
    if (/authentication required/i.test(error.message || '')) {
      clearInterval(workspacePollingTimer);
      workspacePollingTimer = null;
    }
  } finally {
    workspaceRefreshInFlight = false;
  }
}

function startWorkspacePolling() {
  clearInterval(workspacePollingTimer);
  const session = window.SmartShiftAuth?.getSession();
  if (!session || !window.SmartShiftAPI) return;
  lastWorkspaceSnapshot = JSON.stringify({
    id: window.mockDatabase.workspaceId,
    workers: window.mockDatabase.workers,
    shifts: window.mockDatabase.shifts,
    leaveRequests: window.mockDatabase.leaveRequests,
    rosterStatus: window.mockDatabase.rosterStatus,
    publishedAt: window.mockDatabase.publishedAt
  });
  workspacePollingTimer = setInterval(refreshWorkspaceFromServer, 4000);
}

function getManagerBusinessName(session) {
  return String(session?.businessName || `${session?.name || 'My'}'s Cafe`).trim();
}

function updateManagerBusinessBranding(session) {
  const businessName = getManagerBusinessName(session);
  const nameLabel = document.getElementById('managerBusinessName');
  const titleLabel = document.getElementById('managerBusinessTitle');
  if (nameLabel) nameLabel.textContent = businessName;
  if (titleLabel) titleLabel.textContent = businessName;
}

function renderProfile() {
  const session = window.SmartShiftAuth?.getSession();
  if (!session) return;
  const admin = session.role === 'admin';
  const manager = session.role === 'manager';
  const isBusinessLeader = admin || manager;
  const worker = !isBusinessLeader ? window.mockDatabase.workers.find(item => item.id === (session.workerId || session.id)) : null;

  document.getElementById('profileName').textContent = session.name || 'SmartShift user';
  document.getElementById('profileSubtitle').textContent = admin
    ? 'Cafe Owner & Administrator · Full Workspace Authority'
    : manager
    ? 'Store Manager · Shift & Roster Planner'
    : `Staff account · ${session.businessName || 'Cafe'} team member`;

  document.getElementById('profileDetailName').textContent = session.name || '—';
  document.getElementById('profileDetailEmail').textContent = session.email || '—';
  document.getElementById('profileDetailRole').textContent = admin ? 'Cafe Admin' : manager ? 'Manager' : 'Staff';
  document.getElementById('profileWorkspaceTitle').textContent = isBusinessLeader ? `${session.businessName || 'Cafe'} Workspace` : (session.businessName || 'Staff workspace');
  document.getElementById('profileWorkspaceText').textContent = admin
    ? 'Full administrative control over managers, staff, cafe settings, and roster policies.'
    : manager
    ? 'Create shifts, manage your team, and publish conflict-free rosters.'
    : 'You are connected to this cafe. Share availability, request leave, and view your confirmed shifts here.';

  const savedBusinessName = getManagerBusinessName(session);
  if (isBusinessLeader) updateManagerBusinessBranding(session);

  const workspaceButton = document.getElementById('btnProfileWorkspace');
  if (workspaceButton) {
    workspaceButton.textContent = admin ? 'Open admin portal' : manager ? 'Open manager dashboard' : 'Open staff portal';
  }

  document.getElementById('profileAvatar').textContent = admin ? '👑' : manager ? '🛡️' : '👤';
  document.getElementById('profileEditName').value = session.name || '';
  document.getElementById('profileEditEmail').value = session.email || '';
  document.getElementById('profileStaffFields').hidden = isBusinessLeader;
  document.getElementById('profileManagerFields').hidden = !isBusinessLeader;

  if (isBusinessLeader) {
    document.getElementById('profileEditBusiness').value = savedBusinessName;
    document.getElementById('profileInviteCode').value = session.joinCode || '';
  }
  if (worker) {
    document.getElementById('profileEditSkills').value = (worker.certifications || []).join(', ');
    document.getElementById('profileEditMaxHours').value = worker.maxWeeklyHours || 25;
    document.getElementById('profileEditRate').value = worker.hourlyRate || 200;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateAuthNav();
  if (window.SmartShiftAuth?.getSession()) startWorkspacePolling();
  // Bind all nav links with data-target-view
  document.addEventListener('click', (e) => {
    const targetLink = e.target.closest('[data-target-view]');
    if (targetLink) {
      e.preventDefault();
      const view = targetLink.dataset.targetView;
      switchView(view);
      if (targetLink.dataset.authMode) window.setSmartShiftAuthMode?.(targetLink.dataset.authMode);
      return;
    }

    // Handle section anchor links (e.g., #features, #how-it-works)
    const anchorLink = e.target.closest('a[href^="#"]');
    if (anchorLink) {
      const href = anchorLink.getAttribute('href');
      if (href && href.length > 1 && href !== '#') {
        const sectionId = href.slice(1);
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
          e.preventDefault();
          // Ensure landing view is active when viewing landing sections
          switchView('landing', sectionId);
        }
      }
    }
  });

  const sidebar = document.getElementById('managerSidebar');
  const sidebarOverlay = document.getElementById('managerSidebarOverlay');
  const sidebarToggle = document.getElementById('managerSidebarToggle');
  const closeSidebar = () => {
    sidebar?.classList.remove('open');
    sidebarOverlay?.classList.remove('open');
    sidebarToggle?.setAttribute('aria-expanded', 'false');
  };
  sidebarToggle?.addEventListener('click', () => {
    const open = sidebar?.classList.toggle('open');
    sidebarOverlay?.classList.toggle('open', open);
    sidebarToggle.setAttribute('aria-expanded', String(Boolean(open)));
  });
  document.getElementById('managerSidebarClose')?.addEventListener('click', closeSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  document.getElementById('btnProfileWorkspace')?.addEventListener('click', () => {
    const session = window.SmartShiftAuth?.getSession();
    switchView(session?.role || 'login');
  });
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    window.SmartShiftAuth?.clearSession();
    window.localStorage.removeItem('smartshift-token');
    updateAuthNav();
    showToast('You have been logged out safely.', 'success');
    switchView('login');
  });
  document.getElementById('profileEditForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const session = window.SmartShiftAuth?.getSession();
    if (!session) return switchView('login');
    const payload = {
      name: document.getElementById('profileEditName').value.trim(),
      email: document.getElementById('profileEditEmail').value.trim()
    };
    if (session.role === 'manager') {
      payload.businessName = document.getElementById('profileEditBusiness').value.trim();
    } else {
      payload.certifications = document.getElementById('profileEditSkills').value.split(',').map(skill => skill.trim()).filter(Boolean);
      payload.maxWeeklyHours = Number(document.getElementById('profileEditMaxHours').value);
      payload.hourlyRate = Number(document.getElementById('profileEditRate').value);
    }

    const saveButton = document.querySelector('#profileEditForm button[type="submit"]');
    if (saveButton) saveButton.disabled = true;
    try {
      const updatedUser = window.SmartShiftAPI
        ? await window.SmartShiftAPI.updateProfile(payload)
        : { ...session, ...payload };
      window.SmartShiftAuth.setSession(updatedUser);
      if (session.role === 'employee') {
        const worker = window.mockDatabase.workers.find(item => item.id === (session.workerId || session.id));
        if (worker) {
          worker.name = updatedUser.name;
          worker.certifications = payload.certifications;
          worker.maxWeeklyHours = payload.maxWeeklyHours;
          worker.hourlyRate = payload.hourlyRate;
          window.persistMockDatabase?.();
        }
      } else {
        updateManagerBusinessBranding(updatedUser);
      }
      updateAuthNav();
      renderProfile();
      window.showToast?.('Profile details saved.', 'success');
    } catch (error) {
      window.showToast?.(error.message || 'Could not save your profile. Please try again.', 'danger');
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  });

  // Authentication mode, role selection, login and signup.
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const fullNameInput = document.getElementById('fullName');
    const businessNameInput = document.getElementById('businessName');
    const businessNameSignupGroup = document.getElementById('businessNameSignupGroup');
    const joinCodeInput = document.getElementById('joinCode');
    const joinCodeSignupGroup = document.getElementById('joinCodeSignupGroup');
    const authHelper = document.getElementById('authHelper');
    const authFeedback = document.getElementById('authFeedback');
    const authSubmit = loginForm.querySelector('.auth-submit');
    let selectedRole = 'employee';
    let authMode = 'login';

    const updateAuthForm = () => {
      const signup = authMode === 'signup';
      document.querySelectorAll('.auth-role-card').forEach(card => {
        const active = card.dataset.role === selectedRole;
        card.classList.toggle('active', active);
        card.setAttribute('aria-pressed', String(active));
      });
      document.querySelectorAll('.auth-tab').forEach(tab => {
        const active = tab.dataset.authMode === authMode;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('.signup-only').forEach(field => { field.hidden = !signup; });
      const adminSignup = signup && selectedRole === 'admin';
      const managerSignup = signup && selectedRole === 'manager';
      const staffSignup = signup && selectedRole === 'employee';
      businessNameSignupGroup.hidden = !(adminSignup || managerSignup);
      joinCodeSignupGroup.hidden = !staffSignup;
      businessNameInput.required = adminSignup || managerSignup;
      joinCodeInput.required = staffSignup;
      fullNameInput.required = signup;
      authSubmit.textContent = signup ? 'Create account' : 'Log in to SmartShift';
      authHelper.textContent = signup
        ? (adminSignup ? 'Set up your cafe workspace as Cafe Administrator & Owner.' : managerSignup ? 'Set up your cafe workspace or join with manager code.' : staffSignup ? 'Join your cafe with the invite code from your manager or admin.' : 'Create your account.')
        : (selectedRole === 'admin' ? 'Welcome back. Log in to your cafe administration console.' : `Welcome back. Log in to continue to your ${selectedRole === 'manager' ? 'manager' : 'staff'} workspace.`);
      if (!signup) {
        emailInput.value = selectedRole === 'admin' ? 'admin@smartshift.local' : selectedRole === 'manager' ? 'manager@smartshift.local' : 'alex.rivera@smartshift.com';
        passwordInput.value = selectedRole === 'admin' ? 'admin123' : selectedRole === 'manager' ? 'manager123' : 'employee123';
      } else {
        emailInput.value = '';
        passwordInput.value = '';
      }
      authFeedback.hidden = true;
      authFeedback.textContent = '';
    };

    window.setSmartShiftAuthMode = mode => {
      if (!['login', 'signup'].includes(mode)) return;
      authMode = mode;
      updateAuthForm();
    };

    const localAuthentication = () => {
      const localUsers = JSON.parse(localStorage.getItem('smartshift-users') || '[]');
      if (authMode === 'signup') {
        if (localUsers.some(item => item.email.toLowerCase() === emailInput.value.toLowerCase())) throw new Error('An account with this email already exists.');
        const user = { id: `local-${Date.now()}`, name: fullNameInput.value.trim(), email: emailInput.value.trim().toLowerCase(), role: selectedRole };
        if (selectedRole === 'admin' || selectedRole === 'manager') user.businessName = businessNameInput.value.trim();
        if (selectedRole === 'employee') user.joinCode = joinCodeInput.value.trim().toUpperCase();
        localUsers.push({ ...user, password: passwordInput.value });
        localStorage.setItem('smartshift-users', JSON.stringify(localUsers));
        return user;
      }
      const user = localUsers.find(item => item.email === emailInput.value && item.password === passwordInput.value && item.role === selectedRole);
      const isDemo = (emailInput.value === 'admin@smartshift.local' && passwordInput.value === 'admin123' && selectedRole === 'admin') ||
        (emailInput.value === 'manager@smartshift.local' && passwordInput.value === 'manager123' && selectedRole === 'manager') ||
        (emailInput.value === 'alex.rivera@smartshift.com' && passwordInput.value === 'employee123' && selectedRole === 'employee');
      if (user) return user;
      if (isDemo) {
        if (selectedRole === 'admin') return { id: 'admin-1', name: 'Elena Vance', email: emailInput.value, role: 'admin', businessName: "Downtown Cafe & Bistro", joinCode: 'CAFE1234', managerJoinCode: 'MGR1234' };
        if (selectedRole === 'manager') return { id: 'manager-1', name: 'Maya Chen', email: emailInput.value, role: 'manager', businessName: "Downtown Cafe & Bistro" };
        return { id: 'emp1', name: 'Alex Rivera', email: emailInput.value, role: 'employee', businessName: "Downtown Cafe & Bistro" };
      }
      throw new Error('Invalid email, password, or selected role.');
    };

    document.querySelectorAll('.auth-role-card').forEach(card => card.addEventListener('click', () => {
      selectedRole = card.dataset.role;
      window.smartShiftSelectedRole = selectedRole;
      updateAuthForm();
    }));
    document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => {
      authMode = tab.dataset.authMode;
      updateAuthForm();
    }));
    updateAuthForm();

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      selectedRole = window.smartShiftSelectedRole || selectedRole;
      const email = document.getElementById('email')?.value.trim();
      const password = document.getElementById('password')?.value;
      const submitButton = loginForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      try {
        let user;
        const isBusinessLeader = ['admin', 'manager'].includes(selectedRole);
        if (window.SmartShiftAPI) {
          user = authMode === 'signup'
            ? await window.SmartShiftAPI.signup({ name: fullNameInput.value.trim(), email, password, role: selectedRole, ...(isBusinessLeader ? { businessName: businessNameInput.value.trim() } : { joinCode: joinCodeInput.value.trim().toUpperCase() }) })
            : await window.SmartShiftAPI.login({ email, password, role: selectedRole });
          const workspace = await window.SmartShiftAPI.loadWorkspace();
          Object.assign(window.mockDatabase, workspace);
          user.businessName = workspace.businessName || user.businessName || '';
        } else {
          user = localAuthentication();
        }
        window.SmartShiftAuth.setSession(user);
        updateAuthNav();
        startWorkspacePolling();
        if (selectedRole === 'employee' && !window.mockDatabase.workers.some(worker => worker.id === user.id)) {
          window.mockDatabase.workers.push({ id: user.id, name: user.name, role: 'Staff member', certifications: [], maxWeeklyHours: 25, currentAssignedHours: 0, hourlyRate: 200, availability: {} });
          window.persistMockDatabase?.();
        }
        showToast(`${authMode === 'signup' ? 'Account created' : 'Welcome back'}! Opening your ${selectedRole === 'admin' ? 'admin portal' : selectedRole === 'manager' ? 'manager' : 'staff'} workspace.`, 'success');
        switchView(selectedRole);
      } catch (error) {
        const networkError = error instanceof TypeError || /fetch|network|failed to fetch/i.test(error.message || '');
        try {
          const offlineUser = networkError ? localAuthentication() : null;
          if (!offlineUser) throw error;
          window.SmartShiftAuth.setSession(offlineUser);
          updateAuthNav();
          if (selectedRole === 'employee' && !window.mockDatabase.workers.some(worker => worker.id === offlineUser.id)) {
            window.mockDatabase.workers.push({ id: offlineUser.id, name: offlineUser.name, role: 'Staff member', certifications: [], maxWeeklyHours: 25, currentAssignedHours: 0, hourlyRate: 200, availability: {} });
            window.persistMockDatabase?.();
          }
          showToast('API is offline. Local demo mode is enabled and this account is saved in your browser.', 'info');
          switchView(selectedRole);
        } catch (fallbackError) {
          authFeedback.textContent = fallbackError.message || 'Unable to complete authentication.';
          authFeedback.hidden = false;
          showToast(authFeedback.textContent, 'danger');
        }
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
});
