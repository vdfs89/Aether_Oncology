// WAI-ARIA Accessible Tabs Implementation

export function initTabs() {
    const tabs = document.querySelectorAll('.form-tab');
    if (!tabs.length) return;

    let tabFocus = 0;

    tabs.forEach((tab, i) => {
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                tabs[tabFocus].setAttribute('tabindex', -1);
                
                if (e.key === 'ArrowRight') {
                    tabFocus++;
                    if (tabFocus >= tabs.length) tabFocus = 0;
                } else if (e.key === 'ArrowLeft') {
                    tabFocus--;
                    if (tabFocus < 0) tabFocus = tabs.length - 1;
                }

                tabs[tabFocus].setAttribute('tabindex', 0);
                tabs[tabFocus].focus();
            } else if (e.key === 'Home') {
                e.preventDefault();
                tabs[tabFocus].setAttribute('tabindex', -1);
                tabFocus = 0;
                tabs[tabFocus].setAttribute('tabindex', 0);
                tabs[tabFocus].focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                tabs[tabFocus].setAttribute('tabindex', -1);
                tabFocus = tabs.length - 1;
                tabs[tabFocus].setAttribute('tabindex', 0);
                tabs[tabFocus].focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchFormTab(tab.dataset.tab);
            }
        });

        tab.addEventListener('click', () => {
            tabFocus = i;
            switchFormTab(tab.dataset.tab);
        });
    });

    // Evidence Tabs
    const evidenceTabs = document.querySelectorAll('.tab-evidence');
    let evidenceFocus = 0;

    evidenceTabs.forEach((tab, i) => {
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                evidenceTabs[evidenceFocus].setAttribute('tabindex', -1);
                
                if (e.key === 'ArrowRight') {
                    evidenceFocus++;
                    if (evidenceFocus >= evidenceTabs.length) evidenceFocus = 0;
                } else if (e.key === 'ArrowLeft') {
                    evidenceFocus--;
                    if (evidenceFocus < 0) evidenceFocus = evidenceTabs.length - 1;
                }

                evidenceTabs[evidenceFocus].setAttribute('tabindex', 0);
                evidenceTabs[evidenceFocus].focus();
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                switchEvidenceTab(tab.id === 'tabMedico' ? 'medico' : 'paciente');
            }
        });

        tab.addEventListener('click', () => {
            evidenceFocus = i;
            switchEvidenceTab(tab.id === 'tabMedico' ? 'medico' : 'paciente');
        });
    });
}

export function switchFormTab(targetTab) {
    ['mean', 'se', 'worst'].forEach(t => {
        const pane = document.getElementById(`group-${t}`);
        const btn = document.getElementById(`tab-${t}`);
        if (!pane || !btn) return;
        
        if (t === targetTab) {
            pane.classList.remove('hidden');
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            btn.setAttribute('tabindex', '0');
        } else {
            pane.classList.add('hidden');
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
            btn.setAttribute('tabindex', '-1');
        }
    });
}

export function switchEvidenceTab(target) {
    const tabMedico = document.getElementById('tabMedico');
    const tabPaciente = document.getElementById('tabPaciente');
    const pMedico = document.getElementById('medicoPanel');
    const pPaciente = document.getElementById('pacientePanel');

    if (!tabMedico || !tabPaciente || !pMedico || !pPaciente) return;

    if (target === 'medico') {
        tabMedico.classList.add('active');
        tabPaciente.classList.remove('active');
        pMedico.classList.remove('hidden');
        pPaciente.classList.add('hidden');
        tabMedico.setAttribute('aria-selected', 'true');
        tabPaciente.setAttribute('aria-selected', 'false');
    } else {
        tabPaciente.classList.add('active');
        tabMedico.classList.remove('active');
        pPaciente.classList.remove('hidden');
        pMedico.classList.add('hidden');
        tabPaciente.setAttribute('aria-selected', 'true');
        tabMedico.setAttribute('aria-selected', 'false');
    }
}
