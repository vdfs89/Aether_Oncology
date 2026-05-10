'use strict';

// ─── STARS CANVAS ───────────────────────────────────────────────────────────
const canvas = document.getElementById('stars-canvas');
const ctx    = canvas.getContext('2d');
let stars    = [];

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Star {
  constructor() { this.reset(); }
  reset() {
    this.x     = Math.random() * canvas.width;
    this.y     = Math.random() * canvas.height;
    this.size  = Math.random() * 2;
    this.speed = Math.random() * 0.5 + 0.1;
  }
  update() { this.y -= this.speed; if (this.y < 0) this.reset(); }
  draw()   {
    ctx.fillStyle   = '#fff';
    ctx.globalAlpha = Math.random() * 0.5 + 0.3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Respect prefers-reduced-motion
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion) {
  for (let i = 0; i < 150; i++) stars.push(new Star());
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    stars.forEach(s => { s.update(); s.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
}

// ─── MOBILE MENU ─────────────────────────────────────────────────────────────
const menuBtn    = document.getElementById('menu-btn');
const closeBtn   = document.getElementById('close-menu');
const mobileMenu = document.getElementById('mobile-menu');

if (menuBtn && closeBtn && mobileMenu) {
  menuBtn.onclick  = () => { mobileMenu.classList.add('open'); menuBtn.setAttribute('aria-expanded', 'true'); };
  closeBtn.onclick = () => { mobileMenu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.onclick = () => { mobileMenu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  });
  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
      mobileMenu.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.focus();
    }
  });
}

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────
const Toast = (() => {
  let container = null;
  const ICONS = { success: '✓', error: '⚠', warning: '⚡', info: 'ℹ' };

  function ensure() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-atomic', 'false');
      document.body.appendChild(container);
    }
    return container;
  }

  function dismiss(toast) {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }

  function show(message, type = 'info', duration = 5000) {
    const c     = ensure();
    const toast = document.createElement('div');
    toast.className   = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML   = `
      <span class="toast-icon" aria-hidden="true">${ICONS[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Fechar notificação" type="button">✕</button>`;
    toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));
    c.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('toast-visible')));
    if (duration > 0) setTimeout(() => dismiss(toast), duration);
    return toast;
  }

  return {
    show,
    success: (m, d) => show(m, 'success', d),
    error:   (m, d) => show(m, 'error',   d),
    warning: (m, d) => show(m, 'warning', d),
    info:    (m, d) => show(m, 'info',    d),
  };
})();

// ─── PORTAL CONFIG ────────────────────────────────────────────────────────────
const API_BASE     = (window.location.protocol === 'file:' || window.location.hostname === 'localhost')
  ? 'http://localhost:8000'
  : window.location.origin;

const API_URL      = `${API_BASE}/predict`;
const ANALYTICS_URL = `${API_BASE}/analytics`;
const AUDIT_URL    = `${API_BASE}/audit`;
const API_KEY      = 'aether-oncology-eval-2026';
let xaiChart       = null;

// ─── CLINICAL SAMPLE DATA ─────────────────────────────────────────────────────
const currentSample = {
  malignant: [17.99,10.38,122.8,1001,0.1184,0.2776,0.3001,0.1471,0.2419,0.07871,
              1.095,0.9053,8.589,153.4,0.006399,0.04904,0.05373,0.01587,0.03003,0.006193,
              25.38,17.33,184.6,2019,0.1622,0.6656,0.7119,0.2654,0.4601,0.1189],
  benign:    [13.54,14.36,87.46,566.3,0.09779,0.08129,0.06664,0.04781,0.1885,0.05766,
              0.2699,0.7886,2.058,23.56,0.008462,0.0146,0.02387,0.01315,0.0198,0.0023,
              15.11,19.26,99.7,711.2,0.144,0.1773,0.239,0.1288,0.2977,0.07259],
};

const featureNames = [
  'radius_mean','texture_mean','perimeter_mean','area_mean','smoothness_mean',
  'compactness_mean','concavity_mean','concave_points_mean','symmetry_mean','fractal_dimension_mean',
  'radius_se','texture_se','perimeter_se','area_se','smoothness_se',
  'compactness_se','concavity_se','concave_points_se','symmetry_se','fractal_dimension_se',
  'radius_worst','texture_worst','perimeter_worst','area_worst','smoothness_worst',
  'compactness_worst','concavity_worst','concave_points_worst','symmetry_worst','fractal_dimension_worst',
];

const featureExplanations = {
  radius_mean: 'o tamanho médio das células tumorais',
  texture_mean: 'a irregularidade na textura das células',
  perimeter_mean: 'o contorno médio das células',
  area_mean: 'a área média ocupada pelas células',
  smoothness_mean: 'a suavidade das bordas celulares',
  compactness_mean: 'o quão compactas são as células',
  concavity_mean: 'a profundidade das concavidades nas células',
  concave_points_mean: 'a quantidade de pontos côncavos no contorno celular',
  symmetry_mean: 'o grau de simetria das células',
  fractal_dimension_mean: 'a complexidade da forma celular',
  radius_se: 'a variação no tamanho das células',
  texture_se: 'a variação na textura celular',
  perimeter_se: 'a variação no contorno celular',
  area_se: 'a variação na área celular',
  smoothness_se: 'a variação na suavidade celular',
  compactness_se: 'a variação na compacidade celular',
  concavity_se: 'a variação na concavidade celular',
  concave_points_se: 'a variação nos pontos côncavos',
  symmetry_se: 'a variação na simetria celular',
  fractal_dimension_se: 'a variação na complexidade celular',
  radius_worst: 'o maior tamanho celular encontrado',
  texture_worst: 'a maior irregularidade celular encontrada',
  perimeter_worst: 'o maior contorno celular encontrado',
  area_worst: 'a maior área celular encontrada',
  smoothness_worst: 'a menor suavidade celular encontrada',
  compactness_worst: 'a maior compacidade celular encontrada',
  concavity_worst: 'a maior concavidade celular encontrada',
  concave_points_worst: 'o maior número de pontos côncavos encontrado',
  symmetry_worst: 'a maior assimetria celular encontrada',
  fractal_dimension_worst: 'a maior complexidade celular encontrada',
};

const featureDefs = [
  { id: 'radius', label: 'Raio', unit: 'μm', tooltip: 'Média das distâncias do centro aos pontos do perímetro' },
  { id: 'texture', label: 'Textura', unit: '', tooltip: 'Desvio padrão dos valores de tons de cinza' },
  { id: 'perimeter', label: 'Perímetro', unit: 'μm', tooltip: 'Tamanho do contorno celular' },
  { id: 'area', label: 'Área', unit: 'μm²', tooltip: 'Área total da célula' },
  { id: 'smoothness', label: 'Suavidade', unit: '', tooltip: 'Variação local nos comprimentos do raio' },
  { id: 'compactness', label: 'Compacidade', unit: '', tooltip: 'Perímetro² / Área - 1.0' },
  { id: 'concavity', label: 'Concavidade', unit: '', tooltip: 'Severidade das porções côncavas do contorno' },
  { id: 'concave_points', label: 'Pontos Côncavos', unit: '', tooltip: 'Número de porções côncavas do contorno' },
  { id: 'symmetry', label: 'Simetria', unit: '', tooltip: 'Simetria da célula' },
  { id: 'fractal_dimension', label: 'Dim. Fractal', unit: '', tooltip: 'Aproximação de linha costeira - 1' }
];


// ─── RENDER FORM DYNAMICALLY ──────────────────────────────────────────────────
function renderForm() {
  const groups = {
    mean: { el: document.getElementById('fields-mean'), labelObj: 'Média' },
    se: { el: document.getElementById('fields-se'), labelObj: 'Erro P.' },
    worst: { el: document.getElementById('fields-worst'), labelObj: 'Pior' }
  };

  Object.entries(groups).forEach(([suffix, config]) => {
    if (!config.el) return;
    featureDefs.forEach(def => {
      const id = `${def.id}_${suffix}`;
      const label = `${def.label} ${config.labelObj}`;
      const tooltip = def.tooltip ? `title="${def.tooltip} (${config.labelObj})"` : '';
      const unitHtml = def.unit ? `<span class="input-unit" aria-hidden="true">${def.unit}</span>` : '';
      
      const html = `
        <div class="portal-form-group relative" ${tooltip}>
          <label class="portal-label flex justify-between" for="${id}">
            <span>${label}</span>
            <svg class="w-3 h-3 text-white/30 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </label>
          <div class="input-wrapper relative">
            <input type="number" step="any" id="${id}" class="portal-input w-full pr-8" placeholder="0.0">
            ${unitHtml}
          </div>
        </div>
      `;
      config.el.insertAdjacentHTML('beforeend', html);
    });
  });
}
document.addEventListener('DOMContentLoaded', renderForm);


// ─── FLOAT PARSING — FIX BUG-02 (PT-BR comma separator) ────────────────────
function parseClinicalFloat(value) {
  if (value === null || value === undefined || value === '') return NaN;
  // Normalise: remove thousand separators, replace decimal comma with point
  const normalised = String(value).trim().replace(/\s/g, '').replace(',', '.');
  return parseFloat(normalised);
}

// ─── FILL SAMPLE ──────────────────────────────────────────────────────────────
function fillSample(type) {
  const data = currentSample[type];
  if (!data) return;
  featureNames.forEach((name, index) => {
    const input = document.getElementById(name);
    // Always use US locale string to avoid comma injection
    if (input) input.value = data[index].toString();
  });
  Toast.info(`Amostra ${type === 'malignant' ? 'Maligna' : 'Benigna'} carregada. Clique em Iniciar Análise.`, 3000);
}

// ─── CLEAR FORM — FIX BUG-03 (resets ALL 30 fields across all tabs) ─────────
function clearForm() {
  // Clear all 30 inputs by id (not by class — avoids hidden-tab issue)
  featureNames.forEach(name => {
    const el = document.getElementById(name);
    if (el) el.value = '';
  });
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));

  const resultText  = document.getElementById('resultText');
  const resultBadge = document.getElementById('resultBadge');
  if (resultText)  resultText.innerText  = 'Aguardando Análise...';
  if (resultBadge) resultBadge.className = '';

  const articlesSection = document.getElementById('articlesSection');
  const medicoArticles  = document.getElementById('medicoArticles');
  const pacienteExpl    = document.getElementById('pacienteExplicacao');
  const pacienteRefs    = document.getElementById('pacienteReferences');

  if (articlesSection) articlesSection.classList.add('hidden');
  if (medicoArticles)  medicoArticles.innerHTML  = '';
  if (pacienteExpl)    pacienteExpl.textContent  = '';
  if (pacienteRefs)    pacienteRefs.innerHTML    = '';

  if (xaiChart) { xaiChart.destroy(); xaiChart = null; }

  Toast.info('Formulário limpo.', 2000);
}

// ─── FORM TAB SWITCHING ───────────────────────────────────────────────────────
function switchFormTab(type) {
  document.querySelectorAll('.form-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === type);
    btn.setAttribute('aria-selected', btn.dataset.tab === type ? 'true' : 'false');
  });
  document.querySelectorAll('.form-group-pane').forEach(pane => {
    const isActive = pane.id === `group-${type}`;
    pane.classList.toggle('hidden', !isActive);
    pane.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });
}

// ─── EVIDENCE TAB SWITCHING ───────────────────────────────────────────────────
function switchTab(tab) {
  const tabMedico    = document.getElementById('tabMedico');
  const tabPaciente  = document.getElementById('tabPaciente');
  const medicoPanel  = document.getElementById('medicoPanel');
  const pacientePanel = document.getElementById('pacientePanel');

  const isMedico = tab === 'medico';
  tabMedico.classList.toggle('active', isMedico);
  tabPaciente.classList.toggle('active', !isMedico);
  tabMedico.setAttribute('aria-selected',   isMedico ? 'true' : 'false');
  tabPaciente.setAttribute('aria-selected', isMedico ? 'false' : 'true');
  medicoPanel.classList.toggle('hidden', !isMedico);
  pacientePanel.classList.toggle('hidden', isMedico);
}

// ─── RESULTS LOADING STATE ────────────────────────────────────────────────────
function setResultLoading(isLoading) {
  const badge = document.getElementById('resultBadge');
  const text  = document.getElementById('resultText');
  if (isLoading) {
    badge.className   = 'loading';
    text.innerHTML    = `<span class="result-spinner" aria-hidden="true"></span>
                         <span>Aether Core processando...</span>`;
  }
}

// ─── MAIN ANALYSIS ────────────────────────────────────────────────────────────
async function runAnalysis() {
  const btn      = document.getElementById('analyzeBtn');
  const resText  = document.getElementById('resultText');
  const resBadge = document.getElementById('resultBadge');

  // Collect & parse values with PT-BR float fix
  const values = featureNames.map(name => {
    const el = document.getElementById(name);
    return el ? parseClinicalFloat(el.value) : NaN;
  });

  if (values.some(isNaN)) {
    Toast.error('Preencha todos os 30 campos biomecânicos antes de iniciar a análise.');
    // Identify first empty field and focus it
    const firstEmpty = featureNames.find(name => {
      const el = document.getElementById(name);
      return !el || el.value.trim() === '' || isNaN(parseClinicalFloat(el.value));
    });
    if (firstEmpty) {
      const el = document.getElementById(firstEmpty);
      if (el) { el.focus(); el.closest('.portal-form-group')?.classList.add('field-error'); }
    }
    return;
  }

  // Clear any previous field errors
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));

  btn.disabled    = true;
  btn.innerHTML   = '<span class="btn-spinner" aria-hidden="true"></span> Analisando...';
  btn.setAttribute('aria-busy', 'true');
  setResultLoading(true);

  const payload = {};
  featureNames.forEach((name, i) => { payload[name] = values[i]; });

  try {
    const response = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': API_KEY },
      body:    JSON.stringify(payload),
    });

    if (response.status === 503) {
      throw new Error('STANDBY: O servidor está inicializando. Aguarde 30s e tente novamente.');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${err.detail || response.statusText}`);
    }

    const result      = await response.json();
    const isMalignant = result.prediction === 1;

    resBadge.className = isMalignant ? 'malignant' : 'benign';
    resBadge.setAttribute('aria-label',
      `Diagnóstico: ${result.label}. Confiança ${result.confidence}: ${(result.probability * 100).toFixed(2)}%`);
    resText.innerHTML  = `
      DIAGNÓSTICO: <span class="diag-label">${result.label.toUpperCase()}</span><br>
      <small>Confiança ${result.confidence}: ${(result.probability * 100).toFixed(2)}%</small>`;

    if (result.warning) {
      resText.innerHTML += `<br><p class="diag-warning">${result.warning}</p>`;
      Toast.warning(result.warning, 8000);
    } else {
      Toast.success(`Análise concluída: ${result.label} (${(result.probability * 100).toFixed(1)}%)`, 5000);
    }

    renderXAI(values.slice(0, 10), isMalignant);
    displayEvidence(result.top_feature, result.articles, isMalignant);

  } catch (err) {
    console.error('Aether Core Error:', err);
    const isStandby = err.message.startsWith('STANDBY:');
    resBadge.className = 'error';
    resText.innerHTML  = isStandby
      ? `<span class="diag-standby">Servidor em Standby</span><br><small>${err.message.replace('STANDBY: ','')}</small>`
      : `<span class="diag-error">Falha na conexão</span><br><small>${err.message}</small>`;
    Toast.error(err.message, 8000);
  } finally {
    btn.disabled  = false;
    btn.innerHTML = 'Iniciar Análise IA + RAG';
    btn.setAttribute('aria-busy', 'false');
  }
}

// ─── XAI RADAR CHART ──────────────────────────────────────────────────────────
function renderXAI(values, isMalignant) {
  const el = document.getElementById('xaiChart');
  if (!el) return;
  const ctxChart = el.getContext('2d');
  if (xaiChart) xaiChart.destroy();

  const labels = ['Raio','Textura','Perímetro','Área','Suavidade','Compac.','Concav.','Pontos C.','Simetria','Fractal'];
  const color  = isMalignant ? '#FF4D4D' : '#00E676';

  xaiChart = new Chart(ctxChart, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Impacto na Decisão (XAI)',
        data:  values.map(v => v * (isMalignant ? 1.2 : 0.8)),
        backgroundColor:       color + '33',
        borderColor:           color,
        borderWidth:           3,
        pointBackgroundColor:  color,
        pointBorderColor:      '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: color,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255,255,255,0.1)' },
          grid:        { color: 'rgba(255,255,255,0.1)' },
          pointLabels: { color: '#F7F9FF', font: { size: 10 } },
          ticks:       { display: false, stepSize: 20 },
          suggestedMin: 0,
        },
      },
      plugins: { legend: { display: false } },
    },
  });
}

// ─── EVIDENCE DISPLAY ─────────────────────────────────────────────────────────
function displayEvidence(topFeature, articles, isMalignant) {
  const section      = document.getElementById('articlesSection');
  const topFeatText  = document.getElementById('topFeatureText');
  const medicoList   = document.getElementById('medicoArticles');
  const pacienteExpl = document.getElementById('pacienteExplicacao');
  const pacienteRefs = document.getElementById('pacienteReferences');

  medicoList.innerHTML   = '';
  pacienteExpl.textContent = '';
  pacienteRefs.innerHTML = '';

  if (topFeature) {
    const readable = topFeature.replace(/_/g, ' ');
    topFeatText.innerHTML = `<span class="feat-highlight">${readable}</span> — característica com maior impacto (Integrated Gradients)`;
  }

  if (!articles || articles.length === 0) { section.classList.add('hidden'); return; }
  section.classList.remove('hidden');

  articles.forEach(art => {
    const snippet = art.abstract || art.tldr || 'Resumo disponível no link.';
    medicoList.insertAdjacentHTML('beforeend', `
      <a href="${art.url}" target="_blank" rel="noopener noreferrer"
         class="article-card" aria-label="Artigo: ${art.title}">
        <div class="article-meta">
          ${getSourceBadge(art.source)}
          ${art.year ? `<span class="article-year">${art.year}</span>` : ''}
        </div>
        <h5 class="article-title">${art.title}</h5>
        <p class="article-snippet line-clamp-3">${snippet}</p>
      </a>`);
  });

  const featureLabel     = (topFeature || '').replace(/_/g, ' ');
  const friendlyExpl     = featureExplanations[topFeature] || featureLabel;
  const diagLabel        = isMalignant ? 'maligno (câncer)' : 'benigno (não é câncer)';
  const diagColorClass   = isMalignant ? 'text-danger' : 'text-success';

  pacienteExpl.innerHTML = `
    O resultado apontou um diagnóstico <strong class="${diagColorClass}">${diagLabel}</strong>.
    A IA identificou que <strong class="text-cyan">${friendlyExpl}</strong> foi o fator mais decisivo.
    <br><br>Consultamos bases médicas internacionais como <strong>PubMed</strong> e <strong>Cochrane</strong>.
    <div class="governance-notice" role="note">
      <p class="governance-title">
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        AVISO DE GOVERNANÇA CLÍNICA
      </p>
      <p>Este sistema é uma <strong>ferramenta de apoio à decisão</strong>. O resultado
         <strong>não constitui diagnóstico final</strong> e deve ser validado por um médico oncologista.</p>
    </div>`;

  articles.slice(0, 3).forEach(art => {
    pacienteRefs.insertAdjacentHTML('beforeend', `
      <a href="${art.url}" target="_blank" rel="noopener noreferrer" class="ref-card">
        <span class="ref-emoji" aria-hidden="true">${getSourceEmoji(art.source)}</span>
        <span class="ref-title">${art.title}</span>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </a>`);
  });

  section.classList.add('fade-up');
}

// ─── MLOPS HEALTH MONITOR ─────────────────────────────────────────────────────
async function checkModelHealth() {
  const monitor     = document.getElementById('mlopsMonitor');
  const details     = document.getElementById('driftDetails');
  const statusBadge = document.getElementById('driftStatusBadge');
  if (!monitor) return;

  monitor.classList.remove('hidden');
  details.innerHTML = '<p class="monitor-loading">Sincronizando com Aether Core...</p>';

  try {
    const res  = await fetch(ANALYTICS_URL, { headers: { 'access_token': API_KEY } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    details.innerHTML = '';
    const driftFound  = data.status === 'alert';
    statusBadge.textContent = driftFound ? 'DRIFT DETECTADO' : (data.status === 'collecting' ? 'COLETANDO...' : 'ESTÁVEL');
    statusBadge.className   = `drift-badge ${driftFound ? 'drift-alert' : 'drift-stable'}`;

    const metrics = Object.entries(data.metrics || {});
    if (metrics.length === 0) {
      details.innerHTML = '<p class="monitor-empty">Aguardando predições para análise estatística...</p>';
    } else {
      metrics.slice(0, 4).forEach(([feat, val]) => {
        const pct    = val.deviation_pct;
        const isHigh = pct > 30;
        details.insertAdjacentHTML('beforeend', `
          <div class="metric-card ${isHigh ? 'metric-high' : ''}">
            <p class="metric-name">${feat.replace(/_/g, ' ')}</p>
            <p class="metric-value ${isHigh ? 'text-danger' : ''}">${pct}%</p>
          </div>`);
      });
    }

    // Audit trail
    const auditBody = document.getElementById('auditTrailBody');
    if (auditBody) {
      auditBody.innerHTML = '<tr><td class="audit-cell" colspan="4">Carregando...</td></tr>';
      try {
        const auditRes = await fetch(AUDIT_URL, { headers: { 'access_token': API_KEY } });
        if (!auditRes.ok) throw new Error(`HTTP ${auditRes.status}`);
        const trail = await auditRes.json();

        auditBody.innerHTML = '';
        if (trail.length === 0) {
          auditBody.innerHTML = '<tr><td class="audit-cell" colspan="4">Nenhum registro ainda.</td></tr>';
        } else {
          trail.reverse().slice(0, 5).forEach(entry => {
            const date  = new Date(entry.timestamp).toLocaleTimeString('pt-BR');
            const out   = entry.output || {};
            const isMal = out.prediction === 1;
            auditBody.insertAdjacentHTML('beforeend', `
              <tr class="audit-row">
                <td class="audit-cell">${date}</td>
                <td class="audit-cell"><span class="audit-badge ${isMal ? 'audit-malignant' : 'audit-benign'}">${isMal ? 'MAL' : 'BEN'}</span></td>
                <td class="audit-cell">${(out.top_feature || 'N/A').replace('_mean','')}</td>
                <td class="audit-cell">${((out.probability || 0) * 100).toFixed(0)}%</td>
              </tr>`);
          });
        }
      } catch (e) {
        auditBody.innerHTML = `<tr><td class="audit-cell text-danger" colspan="4">Erro: ${e.message}</td></tr>`;
      }
    }
  } catch (err) {
    details.innerHTML = `<p class="text-danger">Erro de conexão: ${err.message}</p>`;
  }
}

// ─── SOURCE HELPERS ───────────────────────────────────────────────────────────
function getSourceBadge(source) {
  const map = {
    PubMed:            '<span class="source-badge source-pubmed">PubMed</span>',
    Cochrane:          '<span class="source-badge source-cochrane">Cochrane</span>',
    'Semantic Scholar':'<span class="source-badge source-s2">Semantic Scholar</span>',
  };
  return map[source] || `<span class="source-badge">${source}</span>`;
}

function getSourceEmoji(source) {
  return { PubMed: '🏛️', Cochrane: '🔬', 'Semantic Scholar': '🤖' }[source] || '📄';
}

// ─── KEYBOARD SHORTCUT: Cmd/Ctrl+Enter to submit ─────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    const btn = document.getElementById('analyzeBtn');
    if (btn && !btn.disabled) { e.preventDefault(); runAnalysis(); }
  }
});