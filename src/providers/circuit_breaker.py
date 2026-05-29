import logging
import time
from dataclasses import dataclass
from typing import Dict

logger = logging.getLogger(__name__)


@dataclass
class ProviderCircuitState:
    failures: int = 0
    opened_at: float = 0.0
    is_open: bool = False


class CircuitBreaker:
    """
    Circuit Breaker clínico para providers LLM.

    Abre o circuito após `threshold` falhas consecutivas,
    bloqueando chamadas por `reset_after_seconds`.
    Após o período, o circuito entra em HALF-OPEN (tentativa de recovery).

    Fallback chain garantida: Groq → Gemini → ClinicalError
    """

    def __init__(self, threshold: int = 3, reset_after_seconds: int = 60):
        self.threshold = threshold
        self.reset_after_seconds = reset_after_seconds
        self._states: Dict[str, ProviderCircuitState] = {}

    def _get_state(self, provider_id: str) -> ProviderCircuitState:
        if provider_id not in self._states:
            self._states[provider_id] = ProviderCircuitState()
        return self._states[provider_id]

    def is_open(self, provider_id: str) -> bool:
        """Retorna True se o circuit está aberto (provider bloqueado)."""
        state = self._get_state(provider_id)
        if not state.is_open:
            return False
        # Check if reset window has passed (HALF-OPEN)
        if time.time() - state.opened_at >= self.reset_after_seconds:
            logger.info(f"[CircuitBreaker] {provider_id} entering HALF-OPEN — attempting recovery")
            state.is_open = False
            state.failures = 0
            return False
        return True

    def record_failure(self, provider_id: str) -> None:
        """Registra uma falha. Abre o circuito se threshold for atingido."""
        state = self._get_state(provider_id)
        state.failures += 1
        logger.warning(f"[CircuitBreaker] {provider_id} failure #{state.failures}/{self.threshold}")
        if state.failures >= self.threshold:
            state.is_open = True
            state.opened_at = time.time()
            logger.error(f"[CircuitBreaker] OPEN — {provider_id} blocked for {self.reset_after_seconds}s")

    def record_success(self, provider_id: str) -> None:
        """Reset do circuito após sucesso (confirma recovery do HALF-OPEN)."""
        state = self._get_state(provider_id)
        if state.failures > 0:
            logger.info(f"[CircuitBreaker] {provider_id} recovered — circuit reset")
        state.failures = 0
        state.is_open = False

    def get_status(self, provider_id: str) -> dict:
        """Status do circuito para observabilidade e InspectorHUD."""
        state = self._get_state(provider_id)
        return {
            "provider": provider_id,
            "is_open": state.is_open,
            "failures": state.failures,
            "opened_at": state.opened_at,
        }


# Singleton global — compartilhado entre instâncias do Runtime
clinical_circuit_breaker = CircuitBreaker(threshold=3, reset_after_seconds=60)
