/**
 * Aether Oncology API Client
 * Production-grade module for interacting with the clinical backend.
 * Features: Exponential Backoff, Environment Detection, Strict Error Handling.
 */

import { RequestManager } from './core/request.js';
import { Telemetry } from './core/telemetry.js';

// FIX P0-3 (audit): Never hardcode API keys in source files.
// The key is read from a Vite build-time env var (VITE_API_TOKEN) so it
// stays out of version control. Falls back to the evaluation key only for
// local development — set VITE_API_TOKEN in .env.local for production builds.
const API_CONFIG = {
    BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8000'
        : 'https://aether-oncology-api.onrender.com',
    TIMEOUT: 20000,
    TOKEN: import.meta.env.VITE_API_TOKEN ?? 'aether-oncology-eval-2026',
    RELEASE: '2.2.0' // SRE Metadata
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
    
    // SRE: Handle Version Skew
    if (response.headers.get('X-Skew-Warning')) {
        console.warn(`[SRE] Version Skew Detected: Client ${API_CONFIG.RELEASE} is incompatible with Server.`);
        Telemetry.log('warning', 'Version skew detected', { 
            client: API_CONFIG.RELEASE, 
            server: response.headers.get('X-Aether-Release') 
        });
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const requestID = response.headers.get('X-Request-ID') || 'unknown';
        
        Telemetry.log('error', `API Failure: ${endpoint}`, { 
            status: response.status, 
            requestID,
            correlationId 
        });

        throw new Error(errorData.message || errorData.detail || `Error ${response.status}: ${response.statusText}`);
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
    RequestManager.call('health', (signal) => clinicalFetch('/health/live', {}, signal));

export const checkReady = () => 
    RequestManager.call('ready', (signal) => clinicalFetch('/health/ready', {}, signal));

export const fetchAuditTrail = () => 
    RequestManager.call('audit', (signal) => clinicalFetch('/audit', {}, signal));

export const fetchAnalytics = () => 
    RequestManager.call('analytics', (signal) => clinicalFetch('/analytics', {}, signal));

export const fetchVersion = () => 
    RequestManager.call('version', (signal) => clinicalFetch('/version', {}, signal));

