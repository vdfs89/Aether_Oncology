/**
 * Aether Oncology — Application Entry Point
 * Vite bundles all ES modules. No CDN, no inline scripts.
 */

import { initNavbar, initMobileMenu, initActiveNav } from './ui.js';
import { initScrollReveal, initCounters, initSmoothScroll } from './ux.js';
import { initCharts, initXaiChart } from './charts.js';
import { predictTumor, checkHealth } from './api.js';

function boot() {
  // UI
  initNavbar();
  initMobileMenu();
  initActiveNav();

  // UX
  initScrollReveal();
  initCounters();
  initSmoothScroll();

  // Charts (Home Page)
  initCharts();

  // Portal Page Logic
  if (document.getElementById('tumor-form')) {
    initPortal();
  }
}

// ─── Portal Logic ────────────────────────────────────────────────────────────
function initPortal() {
  // 1. Range sliders → live values
  const sliders = [
    { id: 'range-radius',         display: 'v-radius',         decimals: 1 },
    { id: 'range-texture',        display: 'v-texture',        decimals: 1 },
    { id: 'range-perimeter',      display: 'v-perimeter',      decimals: 1 },
    { id: 'range-area',           display: 'v-area',           decimals: 0 },
    { id: 'range-concavity',      display: 'v-concavity',      decimals: 3 },
    { id: 'range-concave-points', display: 'v-concave-points', decimals: 3 },
  ];

  sliders.forEach(({ id, display, decimals }) => {
    const input = document.getElementById(id);
    const output = document.getElementById(display);
    if (input && output) {
      input.addEventListener('input', () => {
        output.textContent = parseFloat(input.value).toFixed(decimals);
      });
    }
  });

  // 2. Check API Health
  const statusDot = document.getElementById('api-status-dot');
  const statusText = document.getElementById('api-status-text');

  async function checkAPIStatus() {
    try {
      await checkHealth();
      statusDot.style.background = '#00FF99';
      statusDot.style.boxShadow = '0 0 10px #00FF99';
      statusText.textContent = 'Inference API conectada — pronta para análise';
    } catch {
      statusDot.style.background = '#FF6B6B';
      statusDot.style.boxShadow = '0 0 10px #FF6B6B';
      statusText.textContent = 'Inference API offline — tentando reconectar...';
      setTimeout(checkAPIStatus, 5000);
    }
  }
  checkAPIStatus();

  // 3. Form Submission with Cinematic Delay & XAI Chart Integration
  const form = document.getElementById('tumor-form');
  const loader = document.getElementById('loader');
  const placeholder = document.getElementById('results-placeholder');
  const results = document.getElementById('results');
  const resultError = document.getElementById('result-error');
  
  let xaiChartInstance = null;

  function showPanel(panel) {
    [loader, placeholder, results, resultError].forEach(el => el.style.display = 'none');
    panel.style.display = 'flex';
  }

  // Delay helper
  const delay = ms => new Promise(res => setTimeout(res, ms));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showPanel(loader);

    const formData = new FormData(form);
    const payload = {};
    for (const [key, val] of formData.entries()) {
      payload[key] = parseFloat(val);
    }

    try {
      // Execute the real API request and wait for the cinematic delay (2.5s) simultaneously
      const [data] = await Promise.all([
        predictTumor(payload),
        delay(2500) // Cinematic delay para o loader
      ]);

      // Parse response
      const diagnosis = data.diagnosis ?? data.prediction ?? 'Unknown';
      const isMalignant = diagnosis.toLowerCase().includes('malign');
      const confidence = data.confidence ?? data.probability ?? 0.5;
      const pct = (confidence * 100).toFixed(1);

      // Populate result
      document.getElementById('result-icon').textContent = isMalignant ? '🔴' : '🟢';
      document.getElementById('result-label').textContent = isMalignant ? 'MALIGNO' : 'BENIGNO';
      document.getElementById('result-label').style.color = isMalignant
        ? '#FF6B6B'
        : '#00FF99';
      document.getElementById('result-confidence').textContent =
        `Confiança: ${pct}% — ${isMalignant ? 'Alta vigilância recomendada' : 'Achados compatíveis com normalidade'}`;
      document.getElementById('confidence-pct').textContent = `${pct}%`;

      const bar = document.getElementById('confidence-bar');
      bar.style.width = `${pct}%`;
      bar.style.background = isMalignant
        ? 'linear-gradient(90deg, #FF6B6B, #E6398A)'
        : 'linear-gradient(90deg, #00FF99, #00CFFF)';

      // Detail cards
      const details = document.getElementById('result-details');
      details.innerHTML = '';
      const metrics = [
        { label: 'Classificação', value: diagnosis },
        { label: 'Confiança', value: `${pct}%` },
        { label: 'Latência', value: `${data.latency_ms ?? '<2'}ms` },
        { label: 'Modelo', value: data.model_version ?? 'v2.2' },
      ];
      metrics.forEach(({ label, value }) => {
        const card = document.createElement('div');
        // Glassmorphism card detail
        card.style.cssText = 'background:rgba(237,230,255,0.04); border:1px solid rgba(237,230,255,0.08); border-radius:var(--radius-md); padding:1rem; text-align:center; backdrop-filter: blur(8px);';
        card.innerHTML = `
          <div style="font-size:0.68rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); font-weight:600; margin-bottom:0.35rem;">${label}</div>
          <div style="font-size:1rem; font-weight:700; color:var(--text-primary);">${value}</div>
        `;
        details.appendChild(card);
      });

      showPanel(results);
      
      // Destroy previous chart instance to avoid overlaps
      if (xaiChartInstance) {
        xaiChartInstance.destroy();
      }
      
      // Init XAI chart once the panel is visible so it sizes correctly
      // (Added slight timeout to ensure display:flex has rendered)
      setTimeout(() => {
        xaiChartInstance = initXaiChart('xaiChartPortal');
      }, 50);

    } catch (err) {
      document.getElementById('error-message').textContent =
        err.message || 'Não foi possível conectar ao servidor de inferência.';
      showPanel(resultError);
    }
  });

  // Retry button
  document.getElementById('btn-retry')?.addEventListener('click', () => {
    showPanel(placeholder);
  });
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
