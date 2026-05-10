/**
 * Aether Oncology Telemetry & Observability Module
 * Handles structured logging, performance metrics, and error reporting.
 */

export const Telemetry = {
    _sessionStarted: Date.now(),

    log(level, message, context = {}) {
        const payload = {
            timestamp: new Date().toISOString(),
            level,
            message,
            sessionTime: `${((Date.now() - this._sessionStarted) / 1000).toFixed(2)}s`,
            ...context,
            url: window.location.href,
            environment: import.meta.env.MODE
        };

        // In a real enterprise app, this would push to Sentry/Datadog/Loggly
        if (level === 'error') {
            console.error(`[AETHER-ERROR]`, payload);
        } else if (level === 'warn') {
            console.warn(`[AETHER-WARN]`, payload);
        } else {
            console.info(`[AETHER-INFO]`, payload);
        }
    },

    captureException(error, context = {}) {
        this.log('error', error.message, {
            stack: error.stack,
            ...context
        });
    },

    trackPerformance() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                const nav = performance.getEntriesByType('navigation')[0];
                if (nav) {
                    this.log('info', 'Navigation Timing', {
                        loadTime: nav.loadEventEnd - nav.startTime,
                        domReady: nav.domContentLoadedEventEnd - nav.startTime,
                        ttfb: nav.responseStart - nav.startTime
                    });
                }
            });
        }
    }
};
