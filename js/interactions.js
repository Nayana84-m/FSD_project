/**
 * SMARTSHIFT — interactions.js
 * Single Page Application (SPA) View Router & Component Handlers
 */

'use strict';

// SPA View Switcher
function switchView(targetView, scrollToSectionId = null) {
  const views = ['landing', 'login', 'employee', 'manager'];
  
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
  const toastEl = document.getElementById('toast');
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
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

  // Bind Login Form submission inside SPA
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const roleSelect = document.getElementById('loginRoleSelect');
      const targetRole = roleSelect ? roleSelect.value : 'employee';
      
      showToast(`Welcome back! Logged in as ${targetRole === 'manager' ? 'Manager' : 'Employee'}. 🎉`, 3000);
      switchView(targetRole);
    });
  }
});
