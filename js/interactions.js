/**
 * SMARTSHIFT — interactions.js
 * Single Page Application (SPA) View Router & Component Handlers
 */

'use strict';

// SPA View Switcher
function switchView(targetView, scrollToSectionId = null) {
  const views = ['landing', 'login', 'employee', 'manager'];
  const session = window.SmartShiftAuth?.getSession();

  if ((targetView === 'employee' || targetView === 'manager') && (!session || session.role !== targetView)) {
    targetView = 'login';
    if (window.showToast) window.showToast('Please log in with the matching role to continue.', 'info');
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
    window.initRosterGrid();
    if (typeof window.initAssignModal === 'function') window.initAssignModal();
    if (typeof window.initFilterPills === 'function') window.initFilterPills();
    if (typeof window.initPublishButton === 'function') window.initPublishButton();
  }
}

window.switchView = switchView;

// Global Toast Notification Helper
function showToast(msg, duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toastEl = document.createElement('div');
  toastEl.className = 'toast';
  toastEl.textContent = msg;
  toastEl.setAttribute('role', 'status');
  container.appendChild(toastEl);
  requestAnimationFrame(() => toastEl.classList.add('show'));
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.remove(), 250);
  }, duration);
}

window.showToast = showToast;

document.addEventListener('DOMContentLoaded', () => {
  // Bind all nav links with data-target-view
  document.addEventListener('click', (e) => {
    const targetLink = e.target.closest('[data-target-view]');
    if (targetLink) {
      e.preventDefault();
      const view = targetLink.dataset.targetView;
      switchView(view);
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

  // Authentication mode, role selection, login and signup.
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const fullNameInput = document.getElementById('fullName');
    const authHelper = document.getElementById('authHelper');
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
      fullNameInput.required = signup;
      authSubmit.textContent = signup ? 'Create account' : 'Log in to SmartShift';
      authHelper.textContent = signup
        ? `Create your ${selectedRole === 'manager' ? 'manager' : 'staff'} workspace in seconds.`
        : `Welcome back. Log in to continue to your ${selectedRole === 'manager' ? 'manager' : 'staff'} workspace.`;
      if (!signup) {
        emailInput.value = selectedRole === 'manager' ? 'manager@smartshift.local' : 'alex.rivera@smartshift.com';
        passwordInput.value = selectedRole === 'manager' ? 'manager123' : 'employee123';
      } else {
        emailInput.value = '';
        passwordInput.value = '';
      }
    };

    document.querySelectorAll('.auth-role-card').forEach(card => card.addEventListener('click', () => {
      selectedRole = card.dataset.role;
      updateAuthForm();
    }));
    document.querySelectorAll('.auth-tab').forEach(tab => tab.addEventListener('click', () => {
      authMode = tab.dataset.authMode;
      updateAuthForm();
    }));
    updateAuthForm();

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email')?.value.trim();
      const password = document.getElementById('password')?.value;
      const submitButton = loginForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;
      try {
        let user;
        if (window.SmartShiftAPI) {
          user = authMode === 'signup'
            ? await window.SmartShiftAPI.signup({ name: fullNameInput.value.trim(), email, password, role: selectedRole })
            : await window.SmartShiftAPI.login({ email, password, role: selectedRole });
        } else {
          const localUsers = JSON.parse(localStorage.getItem('smartshift-users') || '[]');
          if (authMode === 'signup') {
            if (localUsers.some(item => item.email === email)) throw new Error('An account with this email already exists.');
            user = { id: `local-${Date.now()}`, name: fullNameInput.value.trim(), email, role: selectedRole };
            localUsers.push({ ...user, password });
            localStorage.setItem('smartshift-users', JSON.stringify(localUsers));
          } else {
            user = localUsers.find(item => item.email === email && item.password === password && item.role === selectedRole);
            if (!user && ((email === 'manager@smartshift.local' && password === 'manager123' && selectedRole === 'manager') || (email === 'alex.rivera@smartshift.com' && password === 'employee123' && selectedRole === 'employee'))) user = { name: selectedRole === 'manager' ? 'Maya Chen' : 'Alex Rivera', email, role: selectedRole };
            if (!user) throw new Error('Invalid email, password, or role.');
          }
        }
        window.SmartShiftAuth.setSession(user);
        showToast(`${authMode === 'signup' ? 'Account created' : 'Welcome back'}! Opening your ${selectedRole === 'manager' ? 'manager' : 'staff'} workspace.`, 'success');
        switchView(selectedRole);
      } catch (error) {
        showToast(error.message || 'Unable to complete authentication.', 'danger');
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
});
