/**
 * Aether Oncology Persistence Module
 * Handles local storage for diagnostic drafts to prevent data loss.
 */

import { Telemetry } from './telemetry.js';

const STORAGE_KEY = 'aether_diagnostic_draft';
const AUTO_SAVE_DELAY = 1000; // 1 second

export class Persistence {
    static timer = null;

    /**
     * Saves the current form state to local storage.
     * @param {Object} data - The diagnostic data to save
     */
    static saveDraft(data) {
        if (this.timer) clearTimeout(this.timer);

        this.timer = setTimeout(() => {
            try {
                const payload = {
                    data,
                    timestamp: Date.now(),
                    version: '1.0'
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
                Telemetry.log('info', 'Diagnostic draft auto-saved');
            } catch (e) {
                Telemetry.captureException(e, { area: 'Persistence' });
            }
        }, AUTO_SAVE_DELAY);
    }

    /**
     * Retrieves the saved draft from local storage.
     * @returns {Object|null} The saved data or null
     */
    static getDraft() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;

            const payload = JSON.parse(raw);
            
            // Drafts older than 24h are considered stale
            if (Date.now() - payload.timestamp > 86400000) {
                this.clearDraft();
                return null;
            }

            return payload.data;
        } catch (e) {
            return null;
        }
    }

    static clearDraft() {
        localStorage.removeItem(STORAGE_KEY);
    }
}
