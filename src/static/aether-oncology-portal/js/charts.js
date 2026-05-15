/**
 * Aether Oncology — Charts Module
 * Chart.js imported from npm (no CDN).
 * Exports: initClinicalChart, initXaiChart, initCharts
 */

import Chart from 'chart.js/auto';

const COLORS = {
  magenta:  '#E6398A',
  pink:     '#F7B6D2',
  lavender: '#EDE6FF',
  cyan:     '#00CFFF',
  gridLine: 'rgba(237,230,255,0.06)',
  tickText: 'rgba(237,230,255,0.45)',
};

function applyDefaults() {
  Chart.defaults.color = COLORS.tickText;
  Chart.defaults.font.family = "'Poppins', system-ui, sans-serif";
  Chart.defaults.font.size   = 11;
}

// ─── Clinical biomarker line chart ───────────────────────────────────────
export function initClinicalChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago'],
      datasets: [
        {
          label: 'CA 125',
          data: [42,55,48,63,58,71,65,80],
          borderColor: COLORS.magenta,
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0,0,0,280);
            g.addColorStop(0,'rgba(230,57,138,0.3)');
            g.addColorStop(1,'rgba(230,57,138,0)');
            return g;
          },
          borderWidth: 2,
          pointBackgroundColor: COLORS.magenta,
          pointBorderColor: '#0D0F2B',
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'CEA',
          data: [12,18,14,22,19,28,24,31],
          borderColor: COLORS.cyan,
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0,0,0,280);
            g.addColorStop(0,'rgba(0,207,255,0.2)');
            g.addColorStop(1,'rgba(0,207,255,0)');
            return g;
          },
          borderWidth: 2,
          pointBackgroundColor: COLORS.cyan,
          pointBorderColor: '#0D0F2B',
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,15,43,0.92)',
          borderColor: 'rgba(237,230,255,0.12)',
          borderWidth: 1,
          padding: 12,
        },
      },
      scales: {
        x: { grid: { color: COLORS.gridLine, drawBorder: false }, ticks: { color: COLORS.tickText }, border: { display: false } },
        y: { grid: { color: COLORS.gridLine, drawBorder: false }, ticks: { color: COLORS.tickText }, border: { display: false }, beginAtZero: true },
      },
    },
  });
}

// ─── XAI radar chart ─────────────────────────────────────────────────────
export function initXaiChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  return new Chart(canvas, {
    type: 'radar',
    data: {
      labels: ['BRCA1/2','CA-125','TP53','HER2','CEA','Ki-67','EGFR'],
      datasets: [
        {
          label: 'Invariância Predictiva',
          data: [0.91, 0.85, 0.78, 0.72, 0.65, 0.60, 0.55],
          borderColor: COLORS.magenta,
          backgroundColor: (ctx) => {
            const chart = ctx.chart;
            const {ctx: canvasCtx, chartArea} = chart;
            if (!chartArea) return null;
            const cx = (chartArea.left + chartArea.right) / 2;
            const cy = (chartArea.top + chartArea.bottom) / 2;
            const radius = Math.min(chartArea.right - chartArea.left, chartArea.bottom - chartArea.top) / 2;
            const gradient = canvasCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
            gradient.addColorStop(0, 'rgba(230, 57, 138, 0.4)');
            gradient.addColorStop(1, 'rgba(230, 57, 138, 0.05)');
            return gradient;
          },
          borderWidth: 1.5,
          pointBackgroundColor: COLORS.magenta,
          pointBorderColor: '#0D0F2B',
          pointBorderWidth: 1,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(13,15,43,0.92)',
          borderColor: 'rgba(230,57,138,0.2)',
          borderWidth: 1,
          padding: 10,
        },
      },
      scales: {
        r: {
          min: 0,
          max: 1,
          beginAtZero: true,
          grid: {
            color: 'rgba(230,57,138,0.05)',
            lineWidth: 1,
          },
          angleLines: {
            color: 'rgba(230,57,138,0.08)',
            lineWidth: 1,
          },
          ticks: {
            display: false,
            stepSize: 0.2,
          },
          pointLabels: {
            color: 'rgba(237,230,255,0.4)',
            font: {
              size: 10,
              weight: '500',
              family: "'Inter', sans-serif"
            },
            padding: 15,
          },
        },
      },
    },
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────
export function initCharts() {
  applyDefaults();
  initClinicalChart('clinicalChart');
  initXaiChart('xaiChart');
}