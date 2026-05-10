import { Telemetry } from './telemetry.js';

const HEARTBEAT_INTERVAL = 30000; // 30s

export class Heartbeat {
    static timer = null;
    static isOnline = true;

    static start() {
        if (this.timer) return;
        
        this.timer = setInterval(async () => {
            try {
                const start = performance.now();
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                
                const response = await fetch('/heartbeat', { signal: controller.signal });
                clearTimeout(timeout);

                if (response.ok) {
                    const latency = (performance.now() - start).toFixed(2);
                    if (!this.isOnline) {
                        this.isOnline = true;
                        this._notifyStatusChange(true);
                    }
                    // Optional: Track latency in telemetry
                    // Telemetry.log('debug', 'Heartbeat Latency', { ms: latency });
                } else {
                    throw new Error('Heartbeat failed');
                }
            } catch (e) {
                if (this.isOnline) {
                    this.isOnline = false;
                    this._notifyStatusChange(false);
                }
                Telemetry.log('warn', 'Platform Heartbeat Lost', { error: e.message });
            }
        }, HEARTBEAT_INTERVAL);
    }

    static stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    static _notifyStatusChange(isOnline) {
        const event = new CustomEvent('aether:status-change', { detail: { isOnline } });
        window.dispatchEvent(event);
    }
}
