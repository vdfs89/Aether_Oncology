import { initCanvas } from './animations.js';
import { initTabs } from './tabs.js';
import { initUX } from './ux.js';
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
    renderMLOps,
    renderCircuitStatus
} from './ui.js';
import { renderXAIChart } from './charts.js';
import { predictTumor, checkHealth, fetchAuditTrail, fetchAnalytics } from './api.js';
import { Telemetry } from './core/telemetry.js';
import { initSecurity } from './core/security.js';
import { RequestManager } from './core/request.js';
import { Persistence } from './core/persistence.js';
import { Heartbeat } from './core/heartbeat.js';

import '../css/tailwind.css';
import '../css/portal.css';

/**
 * Platform Error Boundary
 * Ensures failures in non-critical UI modules don't break the core diagnostic flow.
 */
function safeExecute(id, fn, fallback) {
    try {
        fn();
    } catch (e) {
        Telemetry.captureException(e, { area: id });
        if (fallback) fallback();
        
        const boundary = document.getElementById(`${id}-boundary`);
        if (boundary) {
            boundary.classList.remove('hidden');
            boundary.innerHTML = `<p class="text-[9px] text-red-400 bg-red-400/10 p-2 rounded border border-red-400/20">
                ⚠️ Erro no módulo ${id.toUpperCase()}. O diagnóstico principal permanece ativo.
            </p>`;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Platform Init
    initSecurity();
    Telemetry.trackPerformance();

    // UI Init
    safeExecute('canvas', initCanvas);
    safeExecute('form', renderForm);
    safeExecute('tabs', initTabs);
    safeExecute('shortcuts', initShortcuts);
    safeExecute('heartbeat', () => Heartbeat.start());

    // Resilience Listeners
    RequestManager.onStateChange((state) => renderCircuitStatus(state));
    
    // Persistence Flow
    const savedDraft = Persistence.getDraft();
    if (savedDraft && Object.keys(savedDraft).length > 0) {
        const draftAlert = document.getElementById('draft-alert');
        if (draftAlert) {
            draftAlert.classList.remove('hidden');
            document.getElementById('restore-draft-btn')?.addEventListener('click', () => {
                uiFillSample(savedDraft, true);
                draftAlert.classList.add('hidden');
                showToast("Dados recuperados da última sessão.", "success");
            });
            document.getElementById('discard-draft-btn')?.addEventListener('click', () => {
                Persistence.clearDraft();
                draftAlert.classList.add('hidden');
            });
        }
    }

    // Event Bindings
    document.getElementById('mlops-refresh-btn')?.addEventListener('click', checkModelHealth);
    document.getElementById('sample-malignant')?.addEventListener('click', () => uiFillSample('malignant'));
    document.getElementById('sample-benign')?.addEventListener('click', () => uiFillSample('benign'));
    document.getElementById('clear-form-btn')?.addEventListener('click', () => {
        uiClearForm();
        Persistence.clearDraft();
    });
    document.getElementById('analyzeBtn')?.addEventListener('click', runAnalysis);

    // Initialize health check
    checkModelHealth();
    
    Telemetry.log('info', 'Aether Oncology Platform Initialized');
});

// Production Lifecycle Management
window.addEventListener("beforeunload", () => {
    Heartbeat.stop();
    import('./animations.js').then(m => m.destroyCanvas());
    import('./charts.js').then(m => m.resetChart());
});

window.addEventListener('aether:status-change', (e) => {
    const { isOnline } = e.detail;
    if (!isOnline) {
        showToast("⚠️ Conexão com o servidor instável. O diagnóstico pode falhar.", "warning");
    } else {
        showToast("Conexão restabelecida.", "success");
    }
});

export async function runAnalysis() {
    const payload = getFormData();
    if (!payload) return;

    setElementLoading('analyzeBtn', true);
    
    // Skeleton screens
    const articlesSection = document.getElementById("articlesSection");
    if (articlesSection) {
        articlesSection.classList.remove("hidden");
        document.getElementById("medicoArticles").innerHTML = Array(3).fill(`<div class="skeleton h-16 w-full rounded-xl"></div>`).join('');
    }

    try {
        const result = await predictTumor(payload);
        if (!result) return; // Case where request was aborted

        updateResultUI(result);
        
        // Critical Render (RAG)
        safeExecute('rag', () => renderRAG(result));

        // Non-Critical Render (Chart)
        safeExecute('chart', () => {
            renderXAIChart(result.integrated_gradients || result.feature_importances);
        });

        showToast("Análise concluída com sucesso.", "success");
        refreshMLOpsView();
    } catch (error) {
        Telemetry.captureException(error, { area: 'AnalysisFlow' });
        showToast(error.message || "Erro de processamento clínico.", "error");
    } finally {
        setElementLoading('analyzeBtn', false);
    }
}

export async function checkModelHealth() {
    try {
        await checkHealth();
        document.querySelector('.badge-live')?.classList.add('bg-green-500/20', 'text-green-400');
        refreshMLOpsView();
    } catch (e) {
        const badge = document.querySelector('.badge-live');
        if (badge) {
            badge.classList.remove('bg-green-500/20', 'text-green-400');
            badge.classList.add('bg-red-500/20', 'text-red-400');
        }
        Telemetry.log('warn', 'Health Check Failed', { error: e.message });
    }
}

async function refreshMLOpsView() {
    try {
        const [driftData, auditTrail] = await Promise.allSettled([
            fetchAnalytics(),
            fetchAuditTrail()
        ]);

        const drift = driftData.status === 'fulfilled' ? driftData.value : null;
        const trail = auditTrail.status === 'fulfilled' ? auditTrail.value?.reverse() : null;

        safeExecute('mlops', () => renderMLOps(drift, trail));
        
        if (drift?.drift_detected) {
            showToast("Atenção: Model Drift detectado.", "warning");
        }
    } catch (e) {
        Telemetry.captureException(e, { area: 'MLOpsRefresh' });
    }
}

