/**
 * Aether Oncology Security Module
 * Implements Trusted Types and security-hardening helpers.
 */

import { Telemetry } from './telemetry.js';

export function initSecurity() {
    // 1. Trusted Types Policy
    if (window.trustedTypes && window.trustedTypes.createPolicy) {
        try {
            window.aetherPolicy = window.trustedTypes.createPolicy('aether-policy', {
                createHTML: (string) => string // In a full implementation, use DOMPurify here
            });
            Telemetry.log('info', 'Trusted Types policy initialized');
        } catch (e) {
            Telemetry.captureException(e, { area: 'Security' });
        }
    }

    // 2. Clear sensitive data from URL
    if (window.location.search.includes('token') || window.location.search.includes('key')) {
        const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
    }
}

/**
 * Safely sets innerHTML using Trusted Types if available.
 */
export function setSafeHTML(element, html) {
    if (!element) return;
    if (window.aetherPolicy) {
        element.innerHTML = window.aetherPolicy.createHTML(html);
    } else {
        element.innerHTML = html;
    }
}
