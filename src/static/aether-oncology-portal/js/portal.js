// ── Chart.js — XAI horizontal bar chart ──────────────────────────────────────
const ctx = document.getElementById('xaiChart').getContext('2d');
const LABELS = ['Radius', 'Texture', 'Perimeter', 'Area', 'Smoothness'];
const NEUTRAL_COLOR = 'rgba(255,255,255,0.2)';

const xaiChart = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: LABELS,
    datasets: [{
      label: 'Fator de Impacto',
      data: [0, 0, 0, 0, 0],
      backgroundColor: NEUTRAL_COLOR,
      borderRadius: 5,
      borderSkipped: false,
    }]
  },
  options: {
    indexAxis: 'y',
    responsive: true,
    animation: { duration: 600, easing: 'easeInOutQuart' },
    scales: {
      x: { 
        beginAtZero: true, 
        grid: { color: 'rgba(255,255,255,.05)' },
        ticks: { color: 'rgba(247, 249, 255, 0.6)' }
      },
      y: { 
        grid: { display: false },
        ticks: { color: 'rgba(247, 249, 255, 0.8)' }
      }
    },
    plugins: { legend: { display: false } }
  }
});

function updateChart(data, color) {
  xaiChart.data.datasets[0].data = data;
  xaiChart.data.datasets[0].backgroundColor = color;
  xaiChart.update();
}

// ── WDBC sample — 30 features (as restantes com valores típicos, não zeros) ──
const BASE_SAMPLE_MALIGNANT = {
  compactness_mean: 0.2776, concavity_mean: 0.3001, concave_points_mean: 0.1471,
  symmetry_mean: 0.2419, fractal_dimension_mean: 0.07871,
  radius_se: 1.095, texture_se: 0.9053, perimeter_se: 8.589, area_se: 153.4,
  smoothness_se: 0.006399, compactness_se: 0.04904, concavity_se: 0.05373,
  concave_points_se: 0.01587, symmetry_se: 0.03003, fractal_dimension_se: 0.006193,
  radius_worst: 25.38, texture_worst: 17.33, perimeter_worst: 184.6, area_worst: 2019.0,
  smoothness_worst: 0.1622, compactness_worst: 0.6656, concavity_worst: 0.7119,
  concave_points_worst: 0.2654, symmetry_worst: 0.4601, fractal_dimension_worst: 0.1189
};

const BASE_SAMPLE_BENIGN = {
  compactness_mean: 0.08129, concavity_mean: 0.06664, concave_points_mean: 0.04781,
  symmetry_mean: 0.1885, fractal_dimension_mean: 0.05766,
  radius_se: 0.2699, texture_se: 0.7886, perimeter_se: 2.058, area_se: 23.56,
  smoothness_se: 0.008462, compactness_se: 0.0146, concavity_se: 0.02387,
  concave_points_se: 0.01315, symmetry_se: 0.0198, fractal_dimension_se: 0.0023,
  radius_worst: 15.11, texture_worst: 19.26, perimeter_worst: 99.7, area_worst: 711.2,
  smoothness_worst: 0.144, compactness_worst: 0.1773, concavity_worst: 0.239,
  concave_points_worst: 0.1288, symmetry_worst: 0.2977, fractal_dimension_worst: 0.07259
};

let current_base_sample = { ...BASE_SAMPLE_BENIGN }; // Default to benign to be safe

// ── TEST SUITE ACTIONS ────────────────────────────────────────────────────────
document.getElementById('btnMalignant').addEventListener('click', () => {
  current_base_sample = { ...BASE_SAMPLE_MALIGNANT };
  document.getElementById('radius_mean').value = 17.99;
  document.getElementById('texture_mean').value = 10.38;
  document.getElementById('perimeter_mean').value = 122.8;
  document.getElementById('area_mean').value = 1001.0;
  document.getElementById('smoothness_mean').value = 0.1184;
});

document.getElementById('btnBenign').addEventListener('click', () => {
  current_base_sample = { ...BASE_SAMPLE_BENIGN };
  document.getElementById('radius_mean').value = 13.54;
  document.getElementById('texture_mean').value = 14.36;
  document.getElementById('perimeter_mean').value = 87.46;
  document.getElementById('area_mean').value = 566.3;
  document.getElementById('smoothness_mean').value = 0.09779;
});

document.getElementById('btnClear').addEventListener('click', () => {
  document.getElementById('radius_mean').value = '';
  document.getElementById('texture_mean').value = '';
  document.getElementById('perimeter_mean').value = '';
  document.getElementById('area_mean').value = '';
  document.getElementById('smoothness_mean').value = '';
  
  // reset badge and chart
  document.getElementById('resultBadge').className = '';
  document.getElementById('resultBadge').style.cssText = 'background:rgba(255,255,255,0.03);color:var(--text-muted);border:2px dashed var(--border);';
  document.getElementById('resultBadge').innerText = '⏳ Aguardando análise...';
  document.getElementById('probText').innerText = '';
  updateChart([0,0,0,0,0], NEUTRAL_COLOR);
});

// ── Form submit ───────────────────────────────────────────────────────────────
document.getElementById('predictForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const btn = document.getElementById('btnAnalyze');
  const badge = document.getElementById('resultBadge');
  const probText = document.getElementById('probText');
  const apiKey = document.getElementById('api_key').value.trim();

  const r  = parseFloat(document.getElementById('radius_mean').value)    || 0;
  const tx = parseFloat(document.getElementById('texture_mean').value)    || 0;
  const p  = parseFloat(document.getElementById('perimeter_mean').value)  || 0;
  const a  = parseFloat(document.getElementById('area_mean').value)       || 0;
  const s  = parseFloat(document.getElementById('smoothness_mean').value) || 0;

  const payload = {
    ...current_base_sample,
    radius_mean: r, texture_mean: tx,
    perimeter_mean: p, area_mean: a, smoothness_mean: s
  };

  // Loading state
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Processando...';
  badge.className = '';
  badge.style.cssText = 'background:rgba(255,255,255,0.03);color:rgba(247, 249, 255, 0.6);border:2px dashed rgba(255,255,255,0.1);';
  badge.innerText = '⏳ Analisando padrões neurais...';
  probText.innerText = '';
  updateChart([0,0,0,0,0], NEUTRAL_COLOR);

  try {
    const resp = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': apiKey },
      body: JSON.stringify(payload)
    });

    btn.disabled = false;
    btn.innerHTML = '⚡ Analisar Amostra de Biópsia';

    if (resp.ok) {
      const data = await resp.json();
      const isMaligno = data.prediction === 1;
      const pct = (data.probability * 100).toFixed(2);

      badge.className = isMaligno ? 'malignant' : 'benign';
      badge.style.cssText = '';
      badge.innerText = isMaligno
        ? `⚠️ ALTO RISCO (Maligno)`
        : `✅ BAIXO RISCO (Benigno)`;

      probText.innerText =
        `Probabilidade: ${pct}% · Confiança: ${data.confidence} · Status: ${data.status}`;

      // XAI mock — escala normalizada por tipo de feature
      const xaiData = isMaligno
        ? [r * 0.80, tx * 1.20, p * 0.50, a * 0.05, s * 100]
        : [r * 0.20, tx * 0.40, p * 0.10, a * 0.01, s *  20];

      const xaiColor = isMaligno
        ? 'rgba(255, 77, 77, 0.8)'
        : 'rgba(0, 230, 118, 0.8)';

      updateChart(xaiData, xaiColor);

      if (data.warning) {
        probText.innerText += ` · ⚠️ ${data.warning}`;
      }

    } else {
      const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
      badge.className = '';
      badge.style.cssText = 'background:rgba(255,77,77,0.1);color:#FF4D4D;border:2px solid rgba(255,77,77,0.4);';
      badge.innerText = resp.status === 403
        ? '🔒 Acesso Negado — API Key inválida'
        : `❌ Erro ${resp.status}: ${err.detail}`;
      probText.innerText = 'Verifique a API Key ou os dados.';
    }

  } catch (err) {
    btn.disabled = false;
    btn.innerHTML = '⚡ Analisar Amostra de Biópsia';
    badge.style.cssText = 'background:rgba(255, 179, 71, 0.1);color:#FFB347;border:2px solid rgba(255, 179, 71, 0.4);';
    badge.innerText = '❌ Erro de Conexão com a API';
    probText.innerText = err.message;
  }
});
