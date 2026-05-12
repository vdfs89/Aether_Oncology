/**
 * Aether Oncology — Charts Module
 * Chart.js imported from npm (no CDN). Renders:
 *   1. clinicalChart — line chart for biomarker trends
 *   2. xaiChart      — radar chart for XAI feature attribution
 */

import Chart from 'chart.js/auto';

// ─── Design tokens (must match portal.css) ────────────────────────────────
const COLORS = {
  magenta:  '#E6398A',
  pink:     '#F7B6D2',
  lavender: '#EDE6FF',
  cyan:     '#00CFFF',
  bg:       'rgba(13,15,43,0)',
  gridLine: 'rgba(237,230,255,0.06)',
  tickText: 'rgba(237,230,255,0.45)',
};

// ─── Shared Chart.js defaults ─────────────────────────────────────────────
function applyGlobalDefaults() {
  Chart.defaults.color = COLORS.tickText;
  Chart.defaults.font.family = "'Poppins', system-ui, sans-serif";
  Chart.defaults.font.size   = 11;
}

// ─── 1. Clinical Biomarker Line Chart ────────────────────────────────────
export function initClinicalChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];

  const makeGradient = (ctx, colorStart, colorEnd) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 300);
    grad.addColorStop(0, colorStart);
    grad.addColorStop(1, colorEnd);
    return grad;
  };

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'CA 125',
          data: [42, 55, 48, 63, 58, 71, 65, 80],
          borderColor: COLORS.magenta,
          backgroundColor: (ctx) => makeGradient(
            ctx.chart.ctx,
            'rgba(230,57,138,0.3)',
            'rgba(230,57,138,0.0)'
          ),
          borderWidth: 2,
          pointBackgroundColor: COLORS.magenta,
          pointBorderColor: 'rgba(13,15,43,1)',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'CEA',
          data: [12, 18, 14, 22, 19, 28, 24, 31],
          borderColor: COLORS.cyan,
          backgroundColor: (ctx) => makeGradient(
            ctx.chart.ctx,
            'rgba(0,207,255,0.2)',
            'rgba(0,207,255,0.0)'
          ),
          borderWidth: 2,
          pointBackgroundColor: COLORS.cyan,
          pointBorderColor: 'rgba(13,15,43,1)',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'HER2',
          data: [5, 8, 6, 10, 9, 14, 12, 16],
          borderColor: COLORS.lavender,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 3],
          pointBackgroundColor: COLORS.lavender,
          pointBorderColor: 'rgba(13,15,43,1)',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align:    'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 50,
            useBorderRadius: true,
            padding: 16,
            color: COLORS.tickText,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(13,15,43,0.92)',
          borderColor:     'rgba(237,230,255,0.12)',
          borderWidth:     1,
          padding:         12,
          titleFont:       { weight: '700', size: 12 },
          bodyFont:        { size: 11 },
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} U/mL`,
          },
        },
      },
      scales: {
        x: {
          grid:  { color: COLORS.gridLine, drawBorder: false },
          ticks: { color: COLORS.tickText },
          border: { display: false },
        },
        y: {
          grid:  { color: COLORS.gridLine, drawBorder: false },
          ticks: { color: COLORS.tickText, callback: (v) => `${v}` },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─── 2. XAI Radar Chart ──────────────────────────────────────────────────
export function initXaiChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const labels = [
    'BRCA1/2', 'CA-125', 'Mutação TP53',
    'HER2', 'CEA', 'Ki-67', 'EGFR',
  ];

  return new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: 'SHAP — Importância',
          data: [0.91, 0.85, 0.78, 0.72, 0.65, 0.60, 0.55],
          borderColor:           COLORS.magenta,
          backgroundColor:       'rgba(230,57,138,0.15)',
          pointBackgroundColor:  COLORS.magenta,
          pointBorderColor:      '#fff',
          pointBorderWidth:      1.5,
          pointRadius:           5,
          borderWidth:           2,
        },
        {
          label: 'LIME — Importância',
          data: [0.87, 0.80, 0.82, 0.68, 0.70, 0.58, 0.50],
          borderColor:           COLORS.cyan,
          backgroundColor:       'rgba(0,207,255,0.08)',
          pointBackgroundColor:  COLORS.cyan,
          pointBorderColor:      '#fff',
          pointBorderWidth:      1.5,
          pointRadius:           5,
          borderWidth:           2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            borderRadius: 50,
            useBorderRadius: true,
            padding: 16,
            color: COLORS.tickText,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(13,15,43,0.92)',
          borderColor:     'rgba(237,230,255,0.12)',
          borderWidth:     1,
          padding:         12,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.r * 100).toFixed(0)}%`,
          },
        },
      },
      scales: {
        r: {
          min: 0,
          max: 1,
          ticks: {
            stepSize: 0.25,
            color:    COLORS.tickText,
            backdropColor: 'transparent',
            callback: (v) => `${(v * 100).toFixed(0)}%`,
          },
          grid:       { color: COLORS.gridLine },
          angleLines: { color: 'rgba(237,230,255,0.06)' },
          pointLabels: {
            color:     COLORS.tickText,
            font:      { size: 10, weight: '600' },
          },
        },
      },
    },
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────
export function initCharts() {
  applyGlobalDefaults();
  initClinicalChart('clinicalChart');
  initXaiChart('xaiChart');
}
