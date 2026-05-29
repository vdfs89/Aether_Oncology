import logging
from typing import Tuple
from pydantic import BaseModel
from src.providers.base import BaseProvider
from src.providers.groq_provider import GroqProvider
from src.providers.gemini_provider import GeminiProvider
from src.providers.circuit_breaker import clinical_circuit_breaker

logger = logging.getLogger(__name__)


class ClinicalTaskProfile(BaseModel):
    """Perfil da tarefa clínica para roteamento inteligente."""
    intent: str = "conversational"
    risk_level: str = "LOW"
    needs_reasoning: bool = False
    needs_low_latency: bool = True
    needs_multimodal: bool = False


class RoutingDecision(BaseModel):
    """
    Decisão de roteamento auditável.
    Emitida no Event Bus como `RoutingDecisionEvent` antes de toda inferência.
    Ouro para billing, observabilidade e replay determinístico.
    """
    provider: str
    model: str
    rationale: str
    estimated_latency_ms: int
    estimated_cost: float
    fallback_chain: list[str]
    was_fallback: bool = False


class ClinicalModelRouter:
    """
    Roteador clínico inteligente.

    Princípio: LLMs são plugins intercambiáveis.
    O Runtime Clínico é o sistema principal.

    Roteamento por:
    - intent clínico
    - nível de risco
    - latência necessária
    - reasoning complexity
    - circuit breaker status
    """

    def __init__(self):
        self._groq: GroqProvider | None = None
        self._gemini: GeminiProvider | None = None

    def _get_groq(self) -> GroqProvider:
        if not self._groq:
            self._groq = GroqProvider()
        return self._groq

    def _get_gemini(self) -> GeminiProvider:
        if not self._gemini:
            self._gemini = GeminiProvider()
        return self._gemini

    def route(self, task: ClinicalTaskProfile) -> Tuple[BaseProvider, RoutingDecision]:
        """
        Retorna (provider, RoutingDecision) para a tarefa clínica dada.
        Aplica circuit breaker e fallback chain automático.
        """
        fallback_chain = ["groq", "gemini"]
        was_fallback = False

        # --- Primary routing logic ---
        primary_provider, rationale = self._select_primary(task)
        primary_id = primary_provider.provider_id

        # --- Circuit Breaker check ---
        if clinical_circuit_breaker.is_open(primary_id):
            logger.warning(f"[Router] Circuit OPEN for {primary_id} — activating fallback")
            primary_provider, rationale = self._fallback(primary_id, task)
            was_fallback = True

        decision = RoutingDecision(
            provider=primary_provider.provider_id,
            model=primary_provider.model_name,
            rationale=rationale,
            estimated_latency_ms=primary_provider.estimated_latency_ms,
            estimated_cost=primary_provider.estimate_cost(500, 800),  # Estimate for display
            fallback_chain=fallback_chain,
            was_fallback=was_fallback
        )

        return primary_provider, decision

    def _select_primary(self, task: ClinicalTaskProfile) -> Tuple[BaseProvider, str]:
        """Lógica de seleção primária baseada no perfil da tarefa."""

        # Reasoning/multimodal → Gemini
        if task.needs_multimodal or task.needs_reasoning:
            return (
                self._get_gemini(),
                f"Gemini selecionado: reasoning={'on' if task.needs_reasoning else 'off'}, "
                f"multimodal={'on' if task.needs_multimodal else 'off'}"
            )

        # Intent-based routing
        intent_map = {
            "biomarker_analysis": (self._get_gemini, "Gemini: deep reasoning para análise biomarcadores"),
            "treatment_rationale": (self._get_gemini, "Gemini: contexto longo para justificativa de tratamento"),
            "live_streaming": (self._get_groq, "Groq: ultra-baixa latência para streaming interativo"),
            "conversational_ux": (self._get_groq, "Groq: velocidade para UX conversacional"),
        }
        if task.intent in intent_map:
            getter, rationale = intent_map[task.intent]
            return getter(), rationale

        # Risk-based escalation
        if task.risk_level in ("HIGH", "CRITICAL"):
            return (
                self._get_gemini(),
                f"Gemini: risco clínico {task.risk_level} exige reasoning profundo"
            )

        # Low-latency default → Groq
        if task.needs_low_latency:
            return self._get_groq(), "Groq: default para baixa latência"

        return self._get_groq(), "Groq: default para tarefa conversacional"

    def _fallback(self, failed_provider_id: str, task: ClinicalTaskProfile) -> Tuple[BaseProvider, str]:
        """Fallback chain: se Groq falhou → Gemini. Se Gemini falhou → exception clínica."""
        if failed_provider_id == "groq":
            return (
                self._get_gemini(),
                f"FALLBACK: Groq indisponível (circuit open) → Gemini Flash ativado automaticamente"
            )
        raise RuntimeError(
            "CLINICAL_INFERENCE_UNAVAILABLE: Todos os providers estão indisponíveis. "
            "Contate o administrador do sistema."
        )
