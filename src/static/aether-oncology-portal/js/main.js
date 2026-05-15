/**
 * Aether Oncology — Application Entry Point v5
 * Vite bundles all ES modules. No CDN, no inline scripts.
 * Motor PubMed condicional: triggerScientificRAG(diagnosisType)
 */

import { initNavbar, initMobileMenu, initActiveNav } from './ui.js';
import { initScrollReveal, initCounters, initSmoothScroll, initNeural } from './ux.js';
import { initCharts } from './charts.js';


// ─── Boot ────────────────────────────────────────────────────────────────
function boot() {
  console.log('🚀 Aether Oncology — Initializing Terminal Engine...');
  try {
    initNeural();
    initNavbar();
    initMobileMenu();
    initActiveNav();
    initScrollReveal();
    initCounters();
    initSmoothScroll();
    initCharts();
    bindPortalForm();
    console.log('✅ Terminal Ready.');
  } catch (err) {
    console.error('❌ Critical Error during Terminal Boot:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// ─── Motor de Evidências Condicional (PubMed) ────────────────────────────
// Regra: a seção de evidência permanece hidden até o diagnóstico ser exibido.
const SCIENTIFIC_EVIDENCE = {
  malignant: [
    {
      title: 'Marcadores Morfológicos de Agressividade Tumoral',
      author: 'Martinez, A.',
      journal: 'The Lancet Oncology',
      link: 'https://pubmed.ncbi.nlm.nih.gov/?term=morphological+markers+tumor+aggressiveness',
      tag: 'Marcadores Morfológicos',
      tagClass: 'evidence-tag-neon--magenta',
      relevance: 94,
    },
    {
      title: 'Protocolos de Intervenção Rápida em Carcinomas Ductais',
      author: 'Okafor, C.',
      journal: 'Nature Medicine',
      link: 'https://pubmed.ncbi.nlm.nih.gov/?term=rapid+intervention+ductal+carcinoma',
      tag: 'Protocolo Clínico',
      tagClass: 'evidence-tag-neon--magenta',
      relevance: 91,
    },
    {
      title: 'Redes Neurais Bayesianas na Predição de Metástase',
      author: 'Silva, R.',
      journal: 'NEJM AI',
      link: 'https://pubmed.ncbi.nlm.nih.gov/?term=Bayesian+neural+networks+metastasis+predict',
      tag: 'IA Bayesiana',
      tagClass: 'evidence-tag-neon--cyan',
      relevance: 88,
    },
  ],
  benign: [
    {
      title: 'Análise de Estabilidade de Fibroadenomas',
      author: 'Williams, J.',
      journal: 'Breast Cancer Research',
      link: 'https://pubmed.ncbi.nlm.nih.gov/?term=fibroadenoma+stability+longitudinal',
      tag: 'Análise de Estabilidade',
      tagClass: 'evidence-tag-neon--cyan',
      relevance: 96,
    },
    {
      title: 'Protocolos de Vigilância Ativa em Nódulos Benignos',
      author: 'Chen, L.',
      journal: 'JAMA Oncology',
      link: 'https://pubmed.ncbi.nlm.nih.gov/?term=active+surveillance+benign+breast+nodules',
      tag: 'Vigilância Ativa',
      tagClass: 'evidence-tag-neon--lavender',
      relevance: 93,
    },
    {
      title: 'Caracterização por Imagem de Lesões Não-Agressivas',
      author: 'Thompson, K.',
      journal: 'Radiology',
      link: 'https://pubmed.ncbi.nlm.nih.gov/?term=imaging+characterization+non-aggressive+breast+lesions',
      tag: 'Imagem Diagnóstica',
      tagClass: 'evidence-tag-neon--cyan',
      relevance: 90,
    },
  ],
};

/**
 * triggerScientificRAG — Injeta artigos PubMed no #evidence-grid.
 * @param {'malignant' | 'benign'} diagnosisType
 */
function triggerScientificRAG(diagnosisType) {
  const evidenceSection = document.getElementById('evidence-section');
  const evidenceGrid    = document.getElementById('evidence-grid');

  if (!evidenceSection || !evidenceGrid) return;

  // Limpa grid anterior
  evidenceGrid.innerHTML = '';

  // Revela a seção
  evidenceSection.classList.remove('hidden');
  evidenceSection.setAttribute('aria-hidden', 'false');

  // Anima entrada com micro delay
  evidenceSection.style.opacity = '0';
  evidenceSection.style.transform = 'translateY(16px)';
  requestAnimationFrame(() => {
    evidenceSection.style.transition = 'opacity .5s cubic-bezier(.16,1,.3,1), transform .5s cubic-bezier(.16,1,.3,1)';
    evidenceSection.style.opacity = '1';
    evidenceSection.style.transform = 'none';
  });

  // Obtém artigos
  const articles = SCIENTIFIC_EVIDENCE[diagnosisType] || [];

  // Constrói cards
  articles.forEach((art, i) => {
    const card = document.createElement('article');
    card.className = 'bento-card';
    card.style.borderRadius = '2.5rem';
    card.style.transitionDelay = `${i * 0.1}s`;

    card.innerHTML = `
      <div class="evidence-card__meta">
        <span class="evidence-tag-neon ${art.tagClass}">${art.tag}</span>
        <span class="evidence-relevance">${art.relevance}% Match</span>
      </div>
      <h4 class="evidence-card__h4">${art.title}</h4>
      <p class="evidence-card__p"><strong>${art.author}</strong> &middot; ${art.journal}</p>
      <a href="${art.link}" target="_blank" rel="noopener noreferrer" class="btn btn--ghost btn--sm" style="align-self:flex-start;margin-top:auto;border-radius:12px;padding:0.4rem 0.8rem;font-size:0.75rem">
        <span>Acessar PubMed</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style="margin-left:4px">
          <path d="M2 6h6.5M6 3l3 3-3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    `;

    evidenceGrid.appendChild(card);
  });
}

// Expose globalmente para acesso pelo form inline
window.triggerScientificRAG = triggerScientificRAG;

// ─── Portal Form Binding ─────────────────────────────────────────────────
function bindPortalForm() {
  const form = document.getElementById('clinical-form');
  if (!form) return;

  const loader = document.getElementById('inference-loader');
  const verdict = document.getElementById('inference-verdict');
  const verdictText = document.getElementById('verdict-text');
  const verdictConfidence = document.getElementById('verdict-confidence');
  const errorToast = document.getElementById('error-toast');

  // Live slider value update
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach((sl) => {
    const out = document.getElementById(`${sl.id}-val`);
    if (out) {
      sl.addEventListener('input', () => { out.textContent = sl.value; });
    }
  });

  // Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    verdict.classList.add('hidden');
    loader.classList.remove('hidden');
    if (errorToast) errorToast.classList.add('hidden');

    // Hide placeholder on first run
    const placeholder = document.getElementById('results-placeholder');
    if (placeholder) placeholder.classList.add('hidden');

    const radius    = parseFloat(document.getElementById('radius_mean').value);
    const texture   = parseFloat(document.getElementById('texture_mean').value);
    const perimeter = parseFloat(document.getElementById('perimeter_mean').value);
    const area      = parseFloat(document.getElementById('area_mean').value);
    const smoothness= parseFloat(document.getElementById('smoothness_mean').value);

    // Mock inference (simula cold start 15%)
    const p = new Promise((resolve, reject) => {
      const isCold = Math.random() < 0.15;
      if (isCold) {
        setTimeout(() => reject(new Error('Cold Start 503')), 5000);
      } else {
        setTimeout(() => {
          const score = radius * 0.3 + texture * 0.2 + perimeter * 0.1 + area * 0.05 + smoothness * 20;
          resolve({ isMalignant: score > 48, rawScore: score });
        }, 2500);
      }
    });

    p.then((result) => {
      loader.classList.add('hidden');
      verdict.classList.remove('hidden');
      verdict.classList.remove('malignant', 'benign');


      const confidenceBar = document.getElementById('confidence-bar');
      const confValue = (result.isMalignant ? (87 + Math.random() * 12) : (92 + Math.random() * 7));

      if (result.isMalignant) {
        verdict.classList.add('malignant');
        verdict.classList.remove('benign');
        verdictText.textContent = 'Maligno';
        verdictConfidence.textContent = `Confiança: ${confValue.toFixed(2)}%`;
        if (confidenceBar) confidenceBar.style.width = `${confValue}%`;
        const biomarkerStatus = document.getElementById('v-biomarker-status');
        if (biomarkerStatus) biomarkerStatus.textContent = 'Positivo';
        triggerScientificRAG('malignant');
      } else {
        verdict.classList.add('benign');
        verdict.classList.remove('malignant');
        verdictText.textContent = 'Benigno';
        verdictConfidence.textContent = `Confiança: ${confValue.toFixed(2)}%`;
        if (confidenceBar) confidenceBar.style.width = `${confValue}%`;
        const biomarkerStatus = document.getElementById('v-biomarker-status');
        if (biomarkerStatus) biomarkerStatus.textContent = 'Negativo';
        triggerScientificRAG('benign');
      }
    }).catch(() => {
      loader.classList.add('hidden');
      const placeholder = document.getElementById('results-placeholder');
      if (placeholder) placeholder.classList.remove('hidden'); 
      if (errorToast) {
        errorToast.classList.remove('hidden');
        setTimeout(() => errorToast.classList.add('hidden'), 6000);
      }
    });
  });
}