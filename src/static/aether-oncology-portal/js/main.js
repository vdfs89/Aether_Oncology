/**
 * Aether Oncology — Application Entry Point
 * Vite bundles all ES modules. No CDN, no inline scripts.
 */

import { initNavbar, initMobileMenu, initActiveNav } from './ui.js';
import { initScrollReveal, initCounters, initSmoothScroll } from './ux.js';
import { initCharts } from './charts.js';

function boot() {
  // UI
  initNavbar();
  initMobileMenu();
  initActiveNav();

  // UX
  initScrollReveal();
  initCounters();
  initSmoothScroll();

  // Charts (Chart.js from npm, rendered into <canvas> elements)
  initCharts();
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
