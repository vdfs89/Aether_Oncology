import { initCanvas } from './animations.js';
import { initTabs, switchFormTab } from './tabs.js';
import { initShortcuts } from './shortcuts.js';
import { 
    renderForm, 
    getFormData, 
    clearForm as uiClearForm, 
    fillSample as uiFillSample,
    setElementLoading,
    showToast,
    updateResultUI,
    renderRAG,
    renderMLOps
} from './ui.js';
import { renderXAIChart } from './charts.js';
import { predictTumor, checkHealth, fetchAuditTrail, fetchAnalytics } from './api.js';

import '../css/tailwind.css';
import '../css/portal.css';

document.addEventListener("DOMContentLoaded", () => {
    initCanvas();
    renderForm();
    initTabs();
    initShortcuts();

    // Event Bindings (Replacing legacy onclick)
    document.getElementById('lotus-portal-link')?.addEventListener('click', () => {
        window.location.hash = 'portal';
    });

    document.getElementById('mlops-refresh-btn')?.addEventListener('click', checkModelHealth);
    
    document.getElementById('sample-malignant')?.addEventListener('click', () => uiFillSample('malignant'));
    document.getElementById('sample-benign')?.addEventListener('click', () => uiFillSample('benign'));
    document.getElementById('clear-form-btn')?.addEventListener('click', uiClearForm);
    
    document.getElementById('analyzeBtn')?.addEventListener('click', runAnalysis);

    // Tab buttons event listeners are handled within initTabs() in tabs.js
    // but for completeness if they weren't, we'd add them here.
    
    // Mobile menu handlers
    const menuBtn = document.getElementById('menu-btn');
    const closeBtn = document.getElementById('close-menu');
    const mobileMenu = document.getElementById('mobile-menu');

    if (menuBtn && mobileMenu && closeBtn) {
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('hidden');
            mobileMenu.classList.add('flex');
            menuBtn.setAttribute('aria-expanded', 'true');
        });
        
        closeBtn.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('flex');
            menuBtn.setAttribute('aria-expanded', 'false');
            menuBtn.focus();
        });
    }

    // Initialize health check
    checkModelHealth();
});

export async function runAnalysis() {
    const payload = getFormData();
    if (!payload) return;

    setElementLoading('analyzeBtn', true);
    
    // Skeleton screens for RAG and Chart
    const articlesSection = document.getElementById("articlesSection");
    if (articlesSection) {
        articlesSection.classList.remove("hidden");
        document.getElementById("medicoArticles").innerHTML = Array(3).fill(`<div class="skeleton h-16 w-full rounded-xl"></div>`).join('');
        document.getElementById("pacienteExplicacao").innerHTML = `<div class="skeleton h-20 w-full rounded-xl"></div>`;
        document.getElementById("pacienteReferences").innerHTML = `<div class="skeleton h-8 w-full rounded-xl"></div>`;
        document.getElementById("topFeatureText").innerHTML = `<div class="skeleton h-4 w-1/2 rounded"></div>`;
    }

    try {
        const result = await predictTumor(payload);
        updateResultUI(result);
        
        // Render Chart
        renderXAIChart(result.integrated_gradients || result.feature_importances);

        // Render RAG
        renderRAG(result);
        
        showToast("Análise concluída com sucesso.", "success");
        
        // Refresh Audit Trail
        refreshMLOpsView();
    } catch (error) {
        console.error("Predict Error:", error);
        showToast(error.message || "Erro ao comunicar com a API.", "error");
    } finally {
        setElementLoading('analyzeBtn', false);
    }
}

export async function checkModelHealth() {
    try {
        await checkHealth();
        document.querySelector('.badge-live')?.classList.add('bg-green-500/20', 'text-green-400');
        refreshMLOpsView();
        showToast("Model Health: ONLINE", "success");
    } catch {
        const badge = document.querySelector('.badge-live');
        if (badge) {
            badge.classList.remove('bg-green-500/20', 'text-green-400');
            badge.classList.add('bg-red-500/20', 'text-red-400');
        }
        showToast("Model Health: OFFLINE", "error");
    }
}

async function refreshMLOpsView() {
    try {
        const [driftData, auditTrail] = await Promise.allSettled([
            fetchAnalytics(),
            fetchAuditTrail()
        ]);

        const drift = driftData.status === 'fulfilled' ? driftData.value : null;
        const trail = auditTrail.status === 'fulfilled' ? auditTrail.value.reverse() : null;

        renderMLOps(drift, trail);
        
        if (drift?.drift_detected) {
            showToast("Atenção: Model Drift detectado.", "warning");
        }
    } catch (e) {
        console.warn("MLOps Refresh Error:", e);
    }
}

