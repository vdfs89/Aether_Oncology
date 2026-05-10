import { switchFormTab } from './tabs.js';
import { runAnalysis } from './main.js';

export function initShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Cmd/Ctrl + Enter -> Submit
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            runAnalysis();
        }
        
        // Cmd/Ctrl + 1, 2, 3 -> Switch Tabs
        if ((e.metaKey || e.ctrlKey) && ['1', '2', '3'].includes(e.key)) {
            e.preventDefault();
            const mapping = {
                '1': 'mean',
                '2': 'se',
                '3': 'worst'
            };
            switchFormTab(mapping[e.key]);
        }
        
        // Escape -> Close Mobile Menu
        if (e.key === 'Escape') {
            const mobileMenu = document.getElementById('mobile-menu');
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                mobileMenu.classList.add('hidden');
                document.getElementById('menu-btn')?.focus();
            }
        }
    });
}
