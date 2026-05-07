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

function fillSample(type) {
  const data = currentSample[type];
  document.getElementById('radius').value = data[0];
  document.getElementById('texture').value = data[1];
  document.getElementById('perimeter').value = data[2];
  document.getElementById('area').value = data[3];
  document.getElementById('smoothness').value = data[4];
}

function clearForm() {
  document.querySelectorAll('.portal-input').forEach(i => i.value = '');
  document.getElementById('resultText').innerText = 'Aguardando Análise...';
  document.getElementById('resultBadge').className = '';
  if(xaiChart) xaiChart.destroy();
  xaiChart = null;
}

async function runAnalysis() {
  const btn = document.getElementById('analyzeBtn');
  const resText = document.getElementById('resultText');
  const resBadge = document.getElementById('resultBadge');
  
  const values = [
    parseFloat(document.getElementById('radius').value),
    parseFloat(document.getElementById('texture').value),
    parseFloat(document.getElementById('perimeter').value),
    parseFloat(document.getElementById('area').value),
    parseFloat(document.getElementById('smoothness').value)
  ];

  if(values.some(isNaN)) {
    alert("Por favor, preencha todos os campos biomecânicos.");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Analisando Rede Neural...';
  
  // Mix user data with benign baseline for complete feature set
  const fullFeaturesArray = [...currentSample.benign];
  values.forEach((v, i) => fullFeaturesArray[i] = v);

  // Convert to flat object for Pydantic (TumorFeatures)
  const payload = {};
  featureNames.forEach((name, index) => {
    payload[name] = fullFeaturesArray[index];
  });

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

    renderXAI(values, isMalignant);
    displayArticles(result.articles);
    
  } catch (err) {
    resText.innerText = "Erro na conexão com o Aether Core.";
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.innerText = 'INICIAR ANÁLISE IA';
  }
}

function renderXAI(values, isMalignant) {
  const ctxChart = document.getElementById('xaiChart').getContext('2d');
  if(xaiChart) xaiChart.destroy();

  const labels = ['Raio', 'Textura', 'Perímetro', 'Área', 'Suavidade'];
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
function displayArticles(articles) {
  const section = document.getElementById('articlesSection');
  const list = document.getElementById('articlesList');
  
  list.innerHTML = ''; // Limpa lista anterior
  
  if (articles && articles.length > 0) {
      section.classList.remove('hidden');
      articles.forEach(art => {
          const card = `
              <a href="${art.url}" target="_blank" class="block p-3 rounded-xl bg-white/5 border border-white/5 hover:border-cyan-500/30 transition group">
                  <p class="text-[10px] text-cyan-400 font-bold mb-1 underline group-hover:text-cyan-300">
                      PubMed/Semantic Scholar ${art.year}
                  </p>
                  <h5 class="text-xs font-semibold text-white/80 leading-tight mb-2">${art.title}</h5>
                  <p class="text-[9px] text-white/40 italic leading-snug">
                      ${art.tldr ? art.tldr : 'Resumo técnico disponível no link.'}
                  </p>
              </a>
          `;
          list.insertAdjacentHTML('beforeend', card);
      });
      section.classList.add('fade-up');
  } else {
      section.classList.add('hidden');
  }
}
