/**
 * Aether Oncology — Application Entry Point v4
 * Vite bundles all ES modules. No CDN, no inline scripts.
 */

import { initNavbar, initMobileMenu, initActiveNav } from './ui.js';
import { initScrollReveal, initCounters, initSmoothScroll, initNeural } from './ux.js';
import { initCharts } from './charts.js';

function boot() {
  initNeural();       // Neural particle canvas
  initNavbar();       // Navbar scroll state
  initMobileMenu();   // Hamburger menu
  initActiveNav();    // IntersectionObserver nav highlight
  initScrollReveal(); // Reveal animations
  initCounters();     // Animated counters
  initSmoothScroll(); // Hash link smooth scroll
  initCharts();       // Chart.js (clinical + XAI radar)
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}