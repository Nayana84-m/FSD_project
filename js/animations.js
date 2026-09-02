/**
 * SMARTSHIFT — animations.js
 * Simple scroll reveal animations
 */

'use strict';

// Show elements when they scroll into view
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

// Apply to all elements with .reveal class
document.querySelectorAll('.reveal').forEach(el => {
  observer.observe(el);
});
