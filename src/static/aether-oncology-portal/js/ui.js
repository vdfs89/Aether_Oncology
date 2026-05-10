/**
 * Aether Oncology UI Module
 * Premium UI/UX logic, form management, and visualization.
 */

export const featureDefs = [
    { id: "radius", label: "Raio", desc: "Média das distâncias do centro aos pontos do contorno" },
    { id: "texture", label: "Textura", desc: "Desvio padrão dos valores de tons de cinza" },
    { id: "perimeter", label: "Perímetro", desc: "Tamanho total do contorno nuclear" },
    { id: "area", label: "Área", desc: "Área total do núcleo celular" },
    { id: "smoothness", label: "Suavidade", desc: "Variação local nos comprimentos dos raios" },
    { id: "compactness", label: "Compacidade", desc: "Perímetro² / Área - 1.0" },
    { id: "concavity", label: "Concavidade", desc: "Severidade das porções côncavas do contorno" },
    { id: "concave_points", label: "Pontos Côncavos", desc: "Número de porções côncavas no contorno" },
    { id: "symmetry", label: "Simetria", desc: "Grau de simetria da forma nuclear" },
    { id: "fractal_dimension", label: "Dim. Fractal", desc: "Aproximação da complexidade da borda" }
];

export const featureExplanations = {
    radius: 'o tamanho médio das células tumorais',
    texture: 'a irregularidade na textura das células',
    perimeter: 'o contorno médio das células',
    area: 'a área média ocupada pelas células',
    smoothness: 'a suavidade das bordas celulares',
    compactness: 'o quão compactas são as células',
    concavity: 'a profundidade das concavidades nas células',
    concave_points: 'a quantidade de pontos côncavos no contorno celular',
    symmetry: 'o grau de simetria das células',
    fractal_dimension: 'a complexidade da forma celular'
};

/**
 * Robust float parsing for PT-BR and international formats.
 */
export function parseClinicalFloat(value) {
    if (value === null || value === undefined || value === '') return NaN;
    // Remove all spaces, normalize decimal separator to point
    const clean = String(value).trim().replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(clean);
    return isFinite(parsed) ? parsed : NaN;
}

export function showToast(message, type = "success") {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = "fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none";
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
        success: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
        error: "border-red-500/30 bg-red-500/10 text-red-200",
        warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200",
        info: "border-purple-500/30 bg-purple-500/10 text-purple-200"
    };

    toast.className = `px-6 py-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-500 translate-y-10 opacity-0 pointer-events-auto flex items-center gap-3 min-w-[300px] ${colors[type] || colors.info}`;
    
    const icons = {
        success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
        error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
        warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
        info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
    };

    toast.innerHTML = `
        <span class="flex-shrink-0">${icons[type] || icons.info}</span>
        <p class="text-sm font-medium">${message}</p>
    `;

    container.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add("toast-visible");
        });
    });

    const dismiss = () => {
        toast.classList.remove("toast-visible");
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    toast.querySelector('.toast-close').onclick = dismiss;
    setTimeout(dismiss, 5000);
}

export function setElementLoading(elementId, isLoading) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (isLoading) {
        el.disabled = true;
        el.dataset.oldHtml = el.innerHTML;
        el.innerHTML = `<span class="spinner"></span> Analisando...`;
    } else {
        el.disabled = false;
        if (el.dataset.oldHtml) el.innerHTML = el.dataset.oldHtml;
    }
}

export function renderForm() {
    const groups = {
        mean: { el: document.getElementById('fields-mean'), label: 'Média' },
        se: { el: document.getElementById('fields-se'), label: 'Erro P.' },
        worst: { el: document.getElementById('fields-worst'), label: 'Pior' }
    };

    Object.entries(groups).forEach(([suffix, config]) => {
        if (!config.el) return;
        config.el.innerHTML = featureDefs.map(feat => {
            const fieldId = `${feat.id}_${suffix}`;
            return `
                <div class="portal-form-group group">
                    <label for="${fieldId}" class="portal-label">
                        ${feat.label} <span class="text-[9px] opacity-40 font-normal">(${config.label})</span>
                    </label>
                    <div class="input-wrapper">
                        <input type="text" id="${fieldId}" 
                               class="portal-input" 
                               placeholder="0.00"
                               inputmode="decimal">
                    </div>
                    <p class="text-[8px] text-white/20 mt-1.5 transition-opacity group-focus-within:opacity-100 opacity-60">${feat.desc}</p>
                </div>
            `;
        }).join("");
    });

    // Resilience: Auto-save on input
    const inputs = document.querySelectorAll('.portal-input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            import('./core/persistence.js').then(({ Persistence }) => {
                const data = {};
                document.querySelectorAll('.portal-input').forEach(i => {
                    if (i.value) data[i.id] = i.value;
                });
                Persistence.saveDraft(data);
            });
        });
    });
}

export function getFormData() {
    const payload = {};
    const missing = [];

    ['mean', 'se', 'worst'].forEach(group => {
        featureDefs.forEach(feat => {
            const fieldId = `${feat.id}_${group}`;
            const el = document.getElementById(fieldId);
            if (el) {
                const val = parseClinicalFloat(el.value);
                if (isNaN(val)) {
                    missing.push(el);
                    el.closest('.portal-form-group').classList.add('field-error');
                } else {
                    el.closest('.portal-form-group').classList.remove('field-error');
                    payload[fieldId] = val;
                }
            }
        });
    });

    if (missing.length > 0) {
        // Only error if trying to submit. Persistence handles partial data.
        return null;
    }
    
    return payload;
}

export function clearForm() {
    document.querySelectorAll('.portal-input').forEach(input => {
        input.value = "";
        input.closest('.portal-form-group').classList.remove('field-error');
    });
    
    const resultText = document.getElementById("resultText");
    const resultBadge = document.getElementById("resultBadge");
    if (resultText) resultText.innerHTML = "Aguardando Análise...";
    if (resultBadge) resultBadge.className = "";
    
    document.getElementById("articlesSection")?.classList.add("hidden");
    document.getElementById("mlopsMonitor")?.classList.add("hidden");
    
    showToast("Dados removidos.", "info");
}

export function fillSample(type) {
    const samples = {
        malignant: {
            "radius_mean": "17.99", "texture_mean": "10.38", "perimeter_mean": "122.8", "area_mean": "1001",
            "smoothness_mean": "0.1184", "compactness_mean": "0.2776", "concavity_mean": "0.3001",
            "concave_points_mean": "0.1471", "symmetry_mean": "0.2419", "fractal_dimension_mean": "0.07871",
            "radius_se": "1.095", "texture_se": "0.9053", "perimeter_se": "8.589", "area_se": "153.4",
            "smoothness_se": "0.006399", "compactness_se": "0.04904", "concavity_se": "0.05373",
            "concave_points_se": "0.01587", "symmetry_se": "0.03003", "fractal_dimension_se": "0.006193",
            "radius_worst": "25.38", "texture_worst": "17.33", "perimeter_worst": "184.6", "area_worst": "2019",
            "smoothness_worst": "0.1622", "compactness_worst": "0.6656", "concavity_worst": "0.7119",
            "concave_points_worst": "0.2654", "symmetry_worst": "0.4601", "fractal_dimension_worst": "0.1189"
        },
        benign: {
            "radius_mean": "13.54", "texture_mean": "14.36", "perimeter_mean": "87.46", "area_mean": "566.3",
            "smoothness_mean": "0.09779", "compactness_mean": "0.08129", "concavity_mean": "0.06664",
            "concave_points_mean": "0.04781", "symmetry_mean": "0.1885", "fractal_dimension_mean": "0.05766",
            "radius_se": "0.2699", "texture_se": "0.7886", "perimeter_se": "2.058", "area_se": "23.56",
            "smoothness_se": "0.008462", "compactness_se": "0.0146", "concavity_se": "0.02387",
            "concave_points_se": "0.01315", "symmetry_se": "0.0198", "fractal_dimension_se": "0.0023",
            "radius_worst": "15.11", "texture_worst": "19.26", "perimeter_worst": "99.7", "area_worst": "711.2",
            "smoothness_worst": "0.144", "compactness_worst": "0.1773", "concavity_worst": "0.239",
            "concave_points_worst": "0.1288", "symmetry_worst": "0.2977", "fractal_dimension_worst": "0.07259"
        }
    };
    
    const data = samples[type];
    Object.keys(data).forEach(key => {
        const el = document.getElementById(key);
        if (el) {
            el.value = data[key];
            el.closest('.portal-form-group').classList.remove('field-error');
        }
    });
    showToast(`Amostra ${type === 'malignant' ? 'Maligna' : 'Benigna'} carregada.`, "success");
}

/**
 * Renders the platform resilience status (Circuit Breaker).
 */
export function renderCircuitStatus(state) {
    const el = document.getElementById('platform-status');
    if (!el) return;

    const dot = el.querySelector('.status-dot');
    const text = el.querySelector('.status-text');

    const config = {
        'CLOSED': { color: 'bg-green-500', label: 'System: Stable' },
        'OPEN': { color: 'bg-red-500', label: 'System: Safety Mode' },
        'HALF-OPEN': { color: 'bg-yellow-500', label: 'System: Recovering' }
    };

    const s = config[state.status] || config['CLOSED'];
    if (dot) dot.className = `status-dot w-2 h-2 ${s.color} rounded-full ${state.status === 'OPEN' ? 'animate-pulse' : ''}`;
    if (text) text.innerText = s.label;
}

export function updateResultUI(result) {
    const resultBadge = document.getElementById("resultBadge");
    const resultText = document.getElementById("resultText");
    
    if (!resultBadge || !resultText) return;
    
    const isMalignant = result.prediction === 1;
    
    resultBadge.className = isMalignant ? "malignant animate-glow-red" : "benign animate-glow-green";
    resultText.innerHTML = `
        <div class="reveal-active">
            <span class="text-[10px] opacity-40 uppercase tracking-[0.2em] block mb-1">Diagnóstico Final</span>
            <span class="text-3xl font-black block tracking-tight gradient-text-${isMalignant ? 'red' : 'green'}">${isMalignant ? 'MALIGNO' : 'BENIGNO'}</span>
            <div class="flex items-center gap-2 mt-2">
                <span class="text-[10px] font-bold text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase">Confiança: ${(result.probability * 100).toFixed(1)}%</span>
            </div>
        </div>
    `;

    if (result.warning) {
        showToast(result.warning, "warning");
    }
}

export function renderRAG(result) {
    const articlesSection = document.getElementById("articlesSection");
    const medicoArticles = document.getElementById("medicoArticles");
    const pacienteExplicacao = document.getElementById("pacienteExplicacao");
    const pacienteReferences = document.getElementById("pacienteReferences");
    const topFeatureText = document.getElementById("topFeatureText");

    if (!articlesSection) return;
    articlesSection.classList.remove("hidden");

    if (result.top_feature) {
        const readable = result.top_feature.replace(/_/g, ' ').toUpperCase();
        topFeatureText.innerText = readable;
    }
    
    if (result.articles && result.articles.length > 0) {
        medicoArticles.innerHTML = result.articles.map(article => `
            <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="block p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-cyan-500/30 hover:bg-cyan-500/5 transition-all group reveal-active">
                <div class="flex items-start justify-between gap-3 mb-2">
                    <h5 class="text-sm font-bold text-white group-hover:text-cyan-300 transition line-clamp-2">${article.title}</h5>
                    <div class="p-1.5 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 transition">
                        <svg class="w-3.5 h-3.5 text-white/20 group-hover:text-cyan-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                    </div>
                </div>
                <p class="text-xs text-white/40 line-clamp-2 mb-3 leading-relaxed">${article.tldr || article.abstract || 'Sem resumo disponível.'}</p>
                <div class="flex items-center gap-3">
                    <span class="text-[9px] font-black px-2 py-0.5 rounded bg-white/5 text-white/60 uppercase tracking-wider">${article.source}</span>
                    ${article.year ? `<span class="text-[9px] font-bold text-white/30">${article.year}</span>` : ''}
                </div>
            </a>
        `).join('');

        pacienteReferences.innerHTML = result.articles.slice(0, 2).map(article => `
            <a href="${article.url}" target="_blank" class="flex items-center gap-2 text-xs text-pink-400 hover:text-pink-300 transition font-medium">
                <div class="w-1.5 h-1.5 rounded-full bg-pink-500/50"></div>
                <span class="line-clamp-1">${article.title}</span>
            </a>
        `).join('');
        
        const isMalignant = result.prediction === 1;
        const baseFeature = result.top_feature ? result.top_feature.split('_')[0] : 'radius';
        const featureExpl = featureExplanations[baseFeature] || 'características biomecânicas específicas';
        
        pacienteExplicacao.innerHTML = isMalignant 
            ? `<p class="text-sm leading-relaxed text-white/70">O sistema de IA identificou padrões celulares que <b>estatisticamente sugerem malignidade</b>, com destaque para <b>${featureExpl}</b>.</p>
               <div class="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex gap-3 items-start">
                  <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  <span>Esta análise é assistencial e não substitui o laudo definitivo de um patologista. Consulte seu oncologista imediatamente.</span>
               </div>`
            : `<p class="text-sm leading-relaxed text-white/70">Os padrões celulares analisados são <b>consistentes com tumores benignos</b> na maioria dos casos estudados. A morfologia baseada em <b>${featureExpl}</b> está dentro dos parâmetros esperados.</p>
               <div class="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-300 flex gap-3 items-start">
                  <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span>Mantenha o acompanhamento médico preventivo conforme as diretrizes de saúde.</span>
               </div>`;
            
    } else {
        medicoArticles.innerHTML = `<p class="text-xs text-white/40 p-3">Nenhuma evidência retornada da base de conhecimento.</p>`;
        pacienteExplicacao.innerHTML = "A IA realizou a predição, mas o serviço de referências científicas não retornou artigos relevantes no momento.";
    }
}

export function renderMLOps(driftData, auditTrail) {
    const monitor = document.getElementById('mlopsMonitor');
    if (!monitor) return;
    monitor.classList.remove('hidden');

    const statusBadge = document.getElementById('driftStatusBadge');
    if (statusBadge) {
        if (driftData?.drift_detected) {
            statusBadge.className = "text-[9px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-bold uppercase";
            statusBadge.innerText = "Drift Ativo";
        } else {
            statusBadge.className = "text-[9px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 font-bold uppercase";
            statusBadge.innerText = "Estável";
        }
    }

    const details = document.getElementById('driftDetails');
    if (details && driftData?.drifting_features) {
        details.innerHTML = Object.entries(driftData.drifting_features).slice(0, 4).map(([f, dev]) => `
            <div class="bg-black/20 p-2 rounded border border-white/5">
                <p class="text-[8px] text-white/40 uppercase mb-1 truncate">${f}</p>
                <p class="text-xs font-bold text-yellow-400">+${(dev * 100).toFixed(1)}% desvio</p>
            </div>
        `).join('');
    }

    const tbody = document.getElementById('auditTrailBody');
    if (tbody && auditTrail) {
        tbody.innerHTML = auditTrail.slice(0, 5).map(log => `
            <tr class="border-b border-white/5 hover:bg-white/5 transition">
                <td class="p-2 text-[10px] text-white/50 font-mono">${log.timestamp.split('T')[1].split('.')[0]}</td>
                <td class="p-2 text-[10px] font-bold ${log.prediction === 1 ? 'text-red-400' : 'text-green-400'}">${log.prediction === 1 ? 'MALIGNO' : 'BENIGNO'}</td>
                <td class="p-2 text-[10px] text-white/40">${((log.probability || 0) * 100).toFixed(1)}%</td>
            </tr>
        `).join('');
    }
}

