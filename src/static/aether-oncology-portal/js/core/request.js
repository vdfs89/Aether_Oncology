import { Telemetry } from './telemetry.js';

const circuitState = {
    failures: 0,
    lastFailure: null,
    status: 'CLOSED', // CLOSED, OPEN, HALF-OPEN
    threshold: 5,
    cooldown: 30000, // 30 seconds
    listeners: []
};

export class RequestManager {
    static controllers = new Map();

    static onStateChange(callback) {
        circuitState.listeners.push(callback);
    }

    static getStatus() {
        return {
            status: circuitState.status,
            failures: circuitState.failures,
            nextCheck: circuitState.status === 'OPEN' 
                ? circuitState.lastFailure + circuitState.cooldown 
                : null
        };
    }

    static async call(id, fetchFn) {
        if (circuitState.status === 'OPEN') {
            const timeSinceLast = Date.now() - circuitState.lastFailure;
            if (timeSinceLast > circuitState.cooldown) {
                this._updateStatus('HALF-OPEN');
                Telemetry.log('warn', 'Circuit Breaker transitioning to HALF-OPEN');
            } else {
                const wait = Math.ceil((circuitState.cooldown - timeSinceLast) / 1000);
                throw new Error(`Sistema em modo de segurança. Tente novamente em ${wait}s.`);
            }
        }

        if (this.controllers.has(id)) {
            Telemetry.log('info', `Aborting previous request for: ${id}`);
            this.controllers.get(id).abort();
        }

        const controller = new AbortController();
        this.controllers.set(id, controller);

        try {
            const response = await fetchFn(controller.signal);
            this._onSuccess();
            return response;
        } catch (error) {
            if (error.name === 'AbortError') return null;
            
            this._onFailure();
            Telemetry.captureException(error, { requestId: id });
            throw error;
        } finally {
            if (this.controllers.get(id) === controller) {
                this.controllers.delete(id);
            }
        }
    }

    static _updateStatus(newStatus) {
        if (circuitState.status !== newStatus) {
            circuitState.status = newStatus;
            circuitState.listeners.forEach(cb => cb(this.getStatus()));
        }
    }

    static _onSuccess() {
        if (circuitState.status !== 'CLOSED') {
            Telemetry.log('info', 'Circuit Breaker CLOSED - System Stable');
        }
        circuitState.failures = 0;
        this._updateStatus('CLOSED');
    }

    static _onFailure() {
        circuitState.failures++;
        circuitState.lastFailure = Date.now();
        
        if (circuitState.failures >= circuitState.threshold) {
            this._updateStatus('OPEN');
            Telemetry.log('error', 'CIRCUIT BREAKER OPENED - Multiple Failures Detected');
        }
    }
}
