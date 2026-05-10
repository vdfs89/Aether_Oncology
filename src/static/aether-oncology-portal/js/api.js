/**
 * Aether Oncology API Client
 * Production-grade module for interacting with the clinical backend.
 * Features: Exponential Backoff, Environment Detection, Strict Error Handling.
 */

const API_CONFIG = {
    // Determine base URL dynamically: Render production or Localhost
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8000'
        : window.location.origin,
    TIMEOUT: 15000,
    TOKEN: 'aether-oncology-eval-2026' // Security: In production, this should be handled via Auth/Session
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced fetch with retry logic and timeout control.
 */
export async function clinicalFetch(endpoint, options = {}, retries = 3, backoff = 500) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    const defaultOptions = {
        signal: controller.signal,
        headers: {
            'Accept': 'application/json',
            'access_token': API_CONFIG.TOKEN
        }
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {})
        }
    };

    try {
        const response = await fetch(url, mergedOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
            // Handle 503 Service Unavailable (e.g., Render cold start)
            if (response.status === 503 && retries > 0) {
                console.warn(`[API] 503 Service Unavailable. Retrying in ${backoff}ms... (${retries} left)`);
                await wait(backoff);
                return clinicalFetch(endpoint, options, retries - 1, backoff * 2);
            }
            
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('Tempo de resposta excedido. Verifique sua conexão.');
        }

        if (retries > 0 && error.name !== 'TypeError') {
            await wait(backoff);
            return clinicalFetch(endpoint, options, retries - 1, backoff * 2);
        }

        throw error;
    }
}

export const predictTumor = (payload) => 
    clinicalFetch('/predict', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

export const checkHealth = () => clinicalFetch('/health', {}, 1);

export const fetchAuditTrail = () => clinicalFetch('/audit');

export const fetchAnalytics = () => clinicalFetch('/analytics');

