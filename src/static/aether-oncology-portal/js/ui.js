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
    // Re-implementing a more premium toast if container doesn't exist
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || '•'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Fechar">✕</button>
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
        missing[0].focus();
        showToast("Preencha todos os campos com valores numéricos válidos.", "error");
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

export function updateResultUI(result) {
    const resultBadge = document.getElementById("resultBadge");
    const resultText = document.getElementById("resultText");
    
    if (!resultBadge || !resultText) return;
    
    const isMalignant = result.prediction === 1;
    
    resultBadge.className = isMalignant ? "malignant" : "benign";
    resultText.innerHTML = `
        <span class="text-xs opacity-50 uppercase tracking-widest block mb-1">Diagnóstico Final</span>
        <span class="text-2xl font-black block">${isMalignant ? 'MALIGNO' : 'BENIGNO'}</span>
        <span class="text-[10px] font-bold opacity-70 block mt-1">CONFIANÇA: ${(result.probability * 100).toFixed(1)}%</span>
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
            <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="block p-3 rounded-lg bg-black/20 border border-white/5 hover:bg-white/5 transition group">
                <div class="flex items-start justify-between gap-2 mb-1">
                    <h5 class="text-xs font-bold text-purple-300 group-hover:text-purple-200 transition line-clamp-2">${article.title}</h5>
                    <svg class="w-3 h-3 text-white/20 group-hover:text-purple-300 flex-shrink-0" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </div>
                <p class="text-[10px] text-white/50 line-clamp-2 mb-2">${article.tldr || article.abstract || 'Sem resumo disponível.'}</p>
                <div class="flex items-center gap-2">
                    <span class="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-white/40 uppercase">${article.source}</span>
                    ${article.year ? `<span class="text-[8px] text-white/30">${article.year}</span>` : ''}
                </div>
            </a>
        `).join('');

        pacienteReferences.innerHTML = result.articles.slice(0, 2).map(article => `
            <a href="${article.url}" target="_blank" class="flex items-center gap-1 text-[10px] text-pink-300 hover:text-pink-200 transition">
                <svg class="w-3 h-3" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                ${article.title}
            </a>
        `).join('');
        
        const isMalignant = result.prediction === 1;
        const featureExpl = featureExplanations[result.top_feature] || 'características biomecânicas específicas';
        
        pacienteExplicacao.innerHTML = isMalignant 
            ? `O modelo identificou padrões celulares que <b>estatisticamente sugerem malignidade</b>, principalmente devido a <b>${featureExpl}</b>.<br><br><b>Atenção:</b> Isso é uma análise auxiliar. Consulte seu médico oncologista.`
            : `Os padrões celulares analisados são <b>consistentes com tumores benignos</b> na maioria dos casos estudados. A morfologia baseada em <b>${featureExpl}</b> está dentro da normalidade.<br><br><b>Nota:</b> Mantenha o acompanhamento médico regular.`;
            
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

