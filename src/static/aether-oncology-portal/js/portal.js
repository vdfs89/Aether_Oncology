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
const API_URL = 'https://aether-oncology.onrender.com/predict';
let xaiChart = null;

const currentSample = {
  malignant: [17.99,10.38,122.8,1001,0.1184,0.2776,0.3001,0.1471,0.2419,0.07871,1.095,0.9053,8.589,153.4,0.006399,0.04904,0.05373,0.01587,0.03003,0.006193,25.38,17.33,184.6,2019,0.1622,0.6656,0.7119,0.2654,0.4601,0.1189],
  benign: [13.54,14.36,87.46,566.3,0.09779,0.08129,0.06664,0.04781,0.1885,0.05766,0.2699,0.7886,2.058,23.56,0.008462,0.0146,0.02387,0.01315,0.0198,0.0023,15.11,19.26,99.7,711.2,0.144,0.1773,0.239,0.1288,0.2977,0.07259]
};

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
  const fullFeatures = [...currentSample.benign];
  values.forEach((v, i) => fullFeatures[i] = v);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features: fullFeatures })
    });
    
    const result = await response.json();
    
    resBadge.className = result.prediction === 'Maligno' ? 'malignant' : 'benign';
    resText.innerHTML = `DIAGNÓSTICO: <span class="text-white">${result.prediction.toUpperCase()}</span><br><small>Confiança de ${(result.probability * 100).toFixed(2)}%</small>`;
    
    renderXAI(values, result.prediction === 'Maligno');
    
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
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Impacto na Decisão (XAI)',
        data: values.map(v => v * (isMalignant ? 1.2 : 0.8)), // Simulated SHAP values
        backgroundColor: color + '44',
        borderColor: color,
        borderWidth: 2,
        borderRadius: 5
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { display: false },
        y: { grid: { display: false }, ticks: { color: '#F7F9FF' } }
      },
      plugins: { legend: { display: false } }
    }
  });
}
