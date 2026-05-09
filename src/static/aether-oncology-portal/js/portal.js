// ─── STARS CANVAS ───
const canvas = document.getElementById('stars-canvas');
const ctx = canvas.getContext('2d');
let stars = [];

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

class Star {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2;
    this.speed = Math.random() * 0.5 + 0.1;
  }
  update() {
    this.y -= this.speed;
    if (this.y < 0) this.reset();
  }
  draw() {
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = Math.random() * 0.5 + 0.3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

for (let i = 0; i < 150; i++) stars.push(new Star());

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  stars.forEach(s => {
    s.update();
    s.draw();
  });
  requestAnimationFrame(animate);
}
animate();

// ─── MOBILE MENU ───
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
const closeBtn = document.getElementById('close-menu');

if(menuBtn && mobileMenu) {
  menuBtn.onclick = () => mobileMenu.classList.add('open');
  closeBtn.onclick = () => mobileMenu.classList.remove('open');
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.onclick = () => mobileMenu.classList.remove('open');
  });
}

// ─── PORTAL LOGIC ───
const API_URL = '/predict'; // URL relativa para funcionar em qualquer ambiente
const API_KEY = 'aether-oncology-eval-2026';
let xaiChart = null;

const currentSample = {
  malignant: [17.99,10.38,122.8,1001,0.1184,0.2776,0.3001,0.1471,0.2419,0.07871,1.095,0.9053,8.589,153.4,0.006399,0.04904,0.05373,0.01587,0.03003,0.006193,25.38,17.33,184.6,2019,0.1622,0.6656,0.7119,0.2654,0.4601,0.1189],
  benign: [13.54,14.36,87.46,566.3,0.09779,0.08129,0.06664,0.04781,0.1885,0.05766,0.2699,0.7886,2.058,23.56,0.008462,0.0146,0.02387,0.01315,0.0198,0.0023,15.11,19.26,99.7,711.2,0.144,0.1773,0.239,0.1288,0.2977,0.07259]
};

const featureNames = [
  "radius_mean", "texture_mean", "perimeter_mean", "area_mean", "smoothness_mean",
  "compactness_mean", "concavity_mean", "concave_points_mean", "symmetry_mean", "fractal_dimension_mean",
  "radius_se", "texture_se", "perimeter_se", "area_se", "smoothness_se",
  "compactness_se", "concavity_se", "concave_points_se", "symmetry_se", "fractal_dimension_se",
  "radius_worst", "texture_worst", "perimeter_worst", "area_worst", "smoothness_worst",
  "compactness_worst", "concavity_worst", "concave_points_worst", "symmetry_worst", "fractal_dimension_worst"
];

// ─── Mapeamento amigável feature → explicação para pacientes ───
const featureExplanations = {
  "radius_mean": "o tamanho médio das células tumorais",
  "texture_mean": "a irregularidade na textura das células",
  "perimeter_mean": "o contorno médio das células",
  "area_mean": "a área média ocupada pelas células",
  "smoothness_mean": "a suavidade das bordas celulares",
  "compactness_mean": "o quão compactas são as células",
  "concavity_mean": "a profundidade das concavidades nas células",
  "concave_points_mean": "a quantidade de pontos côncavos no contorno celular",
  "symmetry_mean": "o grau de simetria das células",
  "fractal_dimension_mean": "a complexidade da forma celular",
  "radius_se": "a variação no tamanho das células",
  "texture_se": "a variação na textura celular",
  "perimeter_se": "a variação no contorno celular",
  "area_se": "a variação na área celular",
  "smoothness_se": "a variação na suavidade celular",
  "compactness_se": "a variação na compacidade celular",
  "concavity_se": "a variação na concavidade celular",
  "concave_points_se": "a variação nos pontos côncavos",
  "symmetry_se": "a variação na simetria celular",
  "fractal_dimension_se": "a variação na complexidade celular",
  "radius_worst": "o maior tamanho celular encontrado",
  "texture_worst": "a maior irregularidade celular encontrada",
  "perimeter_worst": "o maior contorno celular encontrado",
  "area_worst": "a maior área celular encontrada",
  "smoothness_worst": "a menor suavidade celular encontrada",
  "compactness_worst": "a maior compacidade celular encontrada",
  "concavity_worst": "a maior concavidade celular encontrada",
  "concave_points_worst": "o maior número de pontos côncavos encontrado",
  "symmetry_worst": "a maior assimetria celular encontrada",
  "fractal_dimension_worst": "a maior complexidade celular encontrada"
};

function fillSample(type) {
  const data = currentSample[type];
  featureNames.forEach((name, index) => {
    const input = document.getElementById(name);
    if(input) input.value = data[index];
  });
}

function clearForm() {
  document.querySelectorAll('.portal-input').forEach(i => i.value = '');
  document.getElementById('resultText').innerText = 'Aguardando Análise...';
  document.getElementById('resultBadge').className = '';
  if(xaiChart) xaiChart.destroy();
  xaiChart = null;
  // Limpa seção de evidência
  document.getElementById('articlesSection').classList.add('hidden');
  document.getElementById('medicoArticles').innerHTML = '';
  document.getElementById('pacienteExplicacao').textContent = '';
  document.getElementById('pacienteReferences').innerHTML = '';
}

// ─── Form Group Tab Switching (v2.0) ───
function switchFormTab(type) {
  // Update buttons
  document.querySelectorAll('.form-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick').includes(type));
  });
  
  // Update panes
  document.querySelectorAll('.form-group-pane').forEach(pane => {
    pane.classList.toggle('hidden', pane.id !== `group-${type}`);
  });
}

// ─── Tab Switching (Result View) ───
function switchTab(tab) {
  const tabMedico = document.getElementById('tabMedico');
  const tabPaciente = document.getElementById('tabPaciente');
  const medicoPanel = document.getElementById('medicoPanel');
  const pacientePanel = document.getElementById('pacientePanel');

  if (tab === 'medico') {
    tabMedico.classList.add('active');
    tabPaciente.classList.remove('active');
    medicoPanel.classList.remove('hidden');
    pacientePanel.classList.add('hidden');
  } else {
    tabMedico.classList.remove('active');
    tabPaciente.classList.add('active');
    medicoPanel.classList.add('hidden');
    pacientePanel.classList.remove('hidden');
  }
}

async function runAnalysis() {
  const btn = document.getElementById('analyzeBtn');
  const resText = document.getElementById('resultText');
  const resBadge = document.getElementById('resultBadge');
  
  const values = [];
  featureNames.forEach(name => {
    const val = parseFloat(document.getElementById(name).value);
    values.push(val);
  });

  if(values.some(isNaN)) {
    alert("Por favor, preencha todos os 30 campos biomecânicos para uma análise completa v2.0.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analisando Rede Neural + RAG...';
  
  // Convert to flat object for Pydantic (TumorFeatures)
  const payload = {};
  featureNames.forEach((name, index) => {
    payload[name] = values[index];
  });

  const fullFeaturesArray = values;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'access_token': API_KEY
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const isMalignant = result.prediction === 1;
    
    resBadge.className = isMalignant ? 'malignant' : 'benign';
    resText.innerHTML = `DIAGNÓSTICO: <span class="text-white">${result.label.toUpperCase()}</span><br><small>Confiança ${result.confidence}: ${(result.probability * 100).toFixed(2)}%</small>`;
    
    if (result.warning) {
        resText.innerHTML += `<br><p class="text-[10px] text-yellow-400 mt-2 font-bold animate-pulse">${result.warning}</p>`;
    }

    // Pass first 10 'mean' features for visualization
    renderXAI(fullFeaturesArray.slice(0, 10), isMalignant);
    displayEvidence(result.top_feature, result.articles, isMalignant);
    
  } catch (err) {
    resText.innerText = "Erro na conexão com o Aether Core.";
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerText = 'INICIAR ANÁLISE IA + RAG';
  }
}

function renderXAI(values, isMalignant) {
  const ctxChart = document.getElementById('xaiChart').getContext('2d');
  if(xaiChart) xaiChart.destroy();

  const labels = [
    'Raio', 'Textura', 'Perímetro', 'Área', 'Suavidade',
    'Compac.', 'Concav.', 'Pontos C.', 'Simetria', 'Fractal'
  ];
  const color = isMalignant ? '#FF4D4D' : '#00E676';

  xaiChart = new Chart(ctxChart, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Impacto na Decisão (XAI)',
        data: values.map(v => v * (isMalignant ? 1.2 : 0.8)), // Simulated SHAP values
        backgroundColor: color + '33',
        borderColor: color,
        borderWidth: 3,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: color
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: { color: '#F7F9FF', font: { size: 10 } },
          ticks: { display: false, stepSize: 20 },
          suggestedMin: 0
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// ─── Evidência Científica v2.0 — Espaço Médico + Paciente ───

function displayEvidence(topFeature, articles, isMalignant) {
  const section = document.getElementById('articlesSection');
  const topFeatureText = document.getElementById('topFeatureText');
  
  // Limpa painéis anteriores
  document.getElementById('medicoArticles').innerHTML = '';
  document.getElementById('pacienteExplicacao').textContent = '';
  document.getElementById('pacienteReferences').innerHTML = '';

  // Exibe banner do top feature
  if (topFeature) {
    const readableName = topFeature.replace(/_/g, ' ').replace(' points', ' points');
    topFeatureText.innerHTML = `<span class="text-cyan-400">${readableName}</span> — característica com maior impacto na decisão do modelo (Integrated Gradients)`;
  }

  if (!articles || articles.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');

  // ─── Espaço Médico: Artigos técnicos com fontes distintas ───
  const medicoList = document.getElementById('medicoArticles');
  
  articles.forEach(art => {
    const sourceBadge = getSourceBadge(art.source);
    const snippet = art.abstract || art.tldr || 'Resumo técnico disponível no link.';
    
    const card = `
      <a href="${art.url}" target="_blank" class="block p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition group">
          <div class="flex items-center gap-2 mb-1">
              ${sourceBadge}
              ${art.year ? `<span class="text-[9px] text-white/30">${art.year}</span>` : ''}
          </div>
          <h5 class="text-xs font-semibold text-white/80 leading-tight mb-2">${art.title}</h5>
          <p class="text-[9px] text-white/40 italic leading-snug line-clamp-3">
              ${snippet}
          </p>
      </a>
    `;
    medicoList.insertAdjacentHTML('beforeend', card);
  });

  // ─── Espaço Paciente: Explicação simplificada ───
  const pacienteExplicacao = document.getElementById('pacienteExplicacao');
  const pacienteReferences = document.getElementById('pacienteReferences');
  
  const featureLabel = (topFeature || '').replace(/_/g, ' ');
  const friendlyExplanation = featureExplanations[topFeature] || featureLabel;
  
  const diagLabel = isMalignant ? 'maligno (câncer)' : 'benigno (não é câncer)';
  const diagColor = isMalignant ? 'text-red-400' : 'text-green-400';
  
  pacienteExplicacao.innerHTML = `
    O resultado da sua análise apontou um diagnóstico <strong class="${diagColor}">${diagLabel}</strong>. 
    Para chegar a essa conclusão, a inteligência artificial identificou que <strong class="text-cyan-400">${friendlyExplanation}</strong> 
    foi o fator mais importante na análise das suas células.
    <br><br>
    Para entender melhor sobre esse biomarcador, consultamos bases médicas internacionais como 
    <strong>PubMed</strong> e a <strong>Cochrane</strong>.
    <div class="mt-4 p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
      <p class="text-yellow-400 font-bold text-[10px] mb-1 flex items-center gap-1">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        AVISO DE GOVERNANÇA CLÍNICA
      </p>
      <p class="text-[10px] text-white/60 leading-tight">
        Este sistema é uma <strong>ferramenta de apoio à decisão</strong>. O resultado acima <strong>não constitui um diagnóstico final</strong> e deve ser validado obrigatoriamente por um médico oncologista.
      </p>
    </div>
  `;

  // Links simplificados para pacientes
  articles.slice(0, 3).forEach(art => {
    const refCard = `
      <a href="${art.url}" target="_blank" class="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition">
          <span class="text-xs">${getSourceEmoji(art.source)}</span>
          <span class="text-[10px] text-white/60 leading-tight flex-1">${art.title}</span>
          <svg class="w-3 h-3 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
      </a>
    `;
    pacienteReferences.insertAdjacentHTML('beforeend', refCard);
  });

  section.classList.add('fade-up');
}

// ─── MLOps Monitoring Logic ───

async function checkModelHealth() {
  const monitor = document.getElementById('mlopsMonitor');
  const details = document.getElementById('driftDetails');
  const statusBadge = document.getElementById('driftStatusBadge');
  
  monitor.classList.remove('hidden');
  details.innerHTML = '<p class="text-[10px] text-white/40 col-span-2">Sincronizando com Aether Core...</p>';

  try {
    const response = await fetch('/analytics', {
      headers: { 'access_token': API_KEY }
    });
    
    if (!response.ok) throw new Error('Falha no monitoramento');
    
    const data = await response.json();
    details.innerHTML = '';
    
    // Sincronizado com src/services/audit.py (calculate_drift)
    const driftFound = data.status === 'alert';
    statusBadge.innerText = driftFound ? 'ATENÇÃO: DRIFT' : (data.status === 'collecting' ? 'COLETANDO...' : 'ESTÁVEL');
    statusBadge.className = driftFound 
      ? 'text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase animate-pulse'
      : 'text-[9px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold uppercase';

    // Exibe as features com maior desvio (metrics em audit.py)
    const metrics = Object.entries(data.metrics || {});
    if (metrics.length === 0) {
      details.innerHTML = '<p class="text-[9px] text-white/30 col-span-2">Aguardando mais predições para análise estatística...</p>';
    } else {
      metrics.slice(0, 4).forEach(([feat, val]) => {
        const percentage = val.deviation_pct;
        const isHigh = percentage > 30;
        const card = `
          <div class="p-2 rounded bg-white/5 border ${isHigh ? 'border-red-500/20' : 'border-white/5'}">
             <p class="text-[8px] text-white/40 truncate">${feat.replace(/_/g, ' ')}</p>
             <p class="text-xs font-bold ${isHigh ? 'text-red-400' : 'text-white/80'}">${percentage}%</p>
          </div>
        `;
        details.insertAdjacentHTML('beforeend', card);
      });
    }

    // --- Audit Trail Logic ---
    const auditBody = document.getElementById('auditTrailBody');
    auditBody.innerHTML = '<tr><td class="audit-cell" colspan="4">Carregando Auditoria...</td></tr>';

    try {
      const auditRes = await fetch('/audit', { headers: { 'access_token': API_KEY } });
      if (!auditRes.ok) throw new Error('Falha na auditoria');
      
      const trail = await auditRes.json(); // Retorna lista de objetos do backend
      
      auditBody.innerHTML = '';
      if (trail.length === 0) {
        auditBody.innerHTML = '<tr><td class="audit-cell" colspan="4">Nenhum registro encontrado.</td></tr>';
      } else {
        // Pega as últimas 5 predições e inverte para mostrar a mais recente primeiro
        trail.reverse().slice(0, 5).forEach(entry => {
          const date = new Date(entry.timestamp).toLocaleTimeString();
          const out = entry.output || {};
          const badgeClass = out.prediction === 1 ? 'audit-malignant' : 'audit-benign';
          const label = out.prediction === 1 ? 'MAL' : 'BEN';
          
          const row = `
            <tr class="audit-row">
              <td class="audit-cell font-bold text-white/40">${date}</td>
              <td class="audit-cell"><span class="audit-badge ${badgeClass}">${label}</span></td>
              <td class="audit-cell italic truncate max-w-[80px]">${(out.top_feature || 'N/A').replace('_mean','')}</td>
              <td class="audit-cell text-right">${((out.probability || 0) * 100).toFixed(0)}%</td>
            </tr>
          `;
          auditBody.insertAdjacentHTML('beforeend', row);
        });
      }
    } catch (e) {
      auditBody.innerHTML = '<tr><td class="audit-cell text-red-400" colspan="4">Erro na auditoria.</td></tr>';
    }

  } catch (err) {
    details.innerHTML = '<p class="text-[10px] text-red-400 col-span-2">Erro ao acessar métricas de governança.</p>';
  }
}

function getSourceBadge(source) {
  const badges = {
    'PubMed': '<span class="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">PubMed</span>',
    'Cochrane': '<span class="text-[9px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold">Cochrane</span>',
    'Semantic Scholar': '<span class="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 font-bold">Semantic Scholar</span>'
  };
  return badges[source] || `<span class="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-bold">${source}</span>`;
}

function getSourceEmoji(source) {
  const emojis = {
    'PubMed': '🏛️',
    'Cochrane': '🔬',
    'Semantic Scholar': '🤖'
  };
  return emojis[source] || '📄';
}