/**
 * Aether Oncology API Client
 * Production-grade module for interacting with the clinical backend.
 * Features: Exponential Backoff, Environment Detection, Strict Error Handling.
 */

import { RequestManager } from './core/request.js';
import { Telemetry } from './core/telemetry.js';

const API_CONFIG = {
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8000'
        : 'https://aether-oncology-api.onrender.com',
    TIMEOUT: 20000,
    TOKEN: 'aether-oncology-eval-2026'
};

/**
 * Enhanced fetch with telemetry and request management.
 */
async function clinicalFetch(endpoint, options = {}, signal) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;
    const correlationId = crypto.randomUUID();

    const mergedOptions = {
        ...options,
        signal,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'access_token': API_CONFIG.TOKEN,
            'X-Correlation-ID': correlationId,
            ...(options.headers || {})
        }
    };

    Telemetry.log('info', `API Request: ${endpoint}`, { correlationId });

    const response = await fetch(url, mergedOptions);
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
}

export const predictTumor = (payload) => 
    RequestManager.call('prediction', (signal) => 
        clinicalFetch('/predict', {
            method: 'POST',
            body: JSON.stringify(payload)
        }, signal)
    );

export const checkHealth = () => 
    RequestManager.call('health', (signal) => clinicalFetch('/health', {}, signal));

export const fetchAuditTrail = () => 
    RequestManager.call('audit', (signal) => clinicalFetch('/audit', {}, signal));

export const fetchAnalytics = () => 
    RequestManager.call('analytics', (signal) => clinicalFetch('/analytics', {}, signal));

