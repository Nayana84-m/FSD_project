/**
 * SMARTSHIFT — animations.js
 * Simple scroll reveal animations
 */

'use strict';

// Reveal content gently while keeping it visible in older browsers and for
// visitors who prefer reduced motion.
const revealItems = [...document.querySelectorAll('.reveal')];
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!('IntersectionObserver' in window) || motionPreference.matches) {
  revealItems.forEach(item => item.classList.add('visible'));
} else {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -36px 0px' });

  revealItems.forEach((item, index) => {
    item.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 65}ms`);
    observer.observe(item);
  });
}
