import logging
import time
import uuid
from typing import Any, AsyncGenerator, Dict

from src.providers.circuit_breaker import clinical_circuit_breaker
from src.providers.router import ClinicalModelRouter, ClinicalTaskProfile
from src.safety.clinical_judge import ClinicalJudge
from src.streaming.protocol import (
    CompleteEvent,
    ErrorEvent,
    EscalationTriggeredEvent,
    InferenceEnvelopeEvent,
    JudgementCompletedEvent,
    JudgementStartedEvent,
    RoutingDecisionEvent,
    StatusEvent,
    TokenEvent,
    format_sse,
)

logger = logging.getLogger(__name__)


class ClinicalInferenceRuntime:
    """
    Clinical Cognitive Runtime — orquestrador central de inferência clínica.

    Pipeline (Safety-First / Buffer-then-Judge):
        Routing Decision → Primary Inference → Inference Envelope
        → Clinical Judge → Escalation Policy → SSE Streaming

    LLMs são plugins intercambiáveis.
    O Runtime Clínico é o sistema principal.
    """

    def __init__(self):
        self.router: ClinicalModelRouter | None = None
        self.judge: ClinicalJudge | None = None
        self._sequence_counter: Dict[str, int] = {}

    async def startup(self):
        """Initializes clinical components during application startup."""
        logger.info("[Runtime] Initializing Clinical Inference Runtime...")
        self.router = await ClinicalModelRouter.get_instance()
        self.judge = ClinicalJudge()
        logger.info("[Runtime] Clinical Inference Runtime ready.")

    async def shutdown(self):
        """Graceful shutdown of clinical components."""
        logger.info("[Runtime] Shutting down Clinical Inference Runtime...")
        self.router = None
        self.judge = None

    def _next_seq(self, trace_id: str) -> int:
        self._sequence_counter[trace_id] = self._sequence_counter.get(trace_id, 0) + 1
        return self._sequence_counter[trace_id]

    async def stream_clinical_response(
        self, payload: Dict[str, Any]
    ) -> AsyncGenerator[str, None]:
        trace_id = str(uuid.uuid4())

        messages = payload.get("messages", [])
        context = payload.get("context", {})
        task_info = payload.get("task", {})

        # Extract identifiers from payload (not hardcoded)
        patient_id = payload.get("patientId") or context.get(
            "patientId", "unknown-patient"
        )
        session_id = payload.get("sessionId") or context.get(
            "sessionId", "unknown-session"
        )

        def make_base_kwargs(seq_override: int = None) -> dict:
            return dict(
                traceId=trace_id,
                sessionId=session_id,
                patientId=patient_id,
                sequence=seq_override
                if seq_override is not None
                else self._next_seq(trace_id),
            )

        profile = ClinicalTaskProfile(
            intent=task_info.get("intent", "conversational"),
            risk_level=task_info.get("risk_level", "LOW"),
            needs_reasoning=task_info.get("needs_reasoning", False),
            needs_low_latency=task_info.get("needs_low_latency", True),
            needs_multimodal=task_info.get("needs_multimodal", False),
        )

        try:
            # ── Step 1: Route ──────────────────────────────────────────────
            provider, routing_decision = await self.router.route(profile)

            yield format_sse(
                RoutingDecisionEvent(
                    **make_base_kwargs(),
                    provider=routing_decision.provider,
                    model=routing_decision.model,
                    rationale=routing_decision.rationale,
                    estimated_latency_ms=routing_decision.estimated_latency_ms,
                    estimated_cost=routing_decision.estimated_cost,
                    fallback_chain=routing_decision.fallback_chain,
                )
            )

            # ── Step 2: Inference (buffer-then-judge) ──────────────────────
            yield format_sse(
                StatusEvent(
                    **make_base_kwargs(),
                    provider=provider.provider_id,
                    model=provider.model_name,
                    status="generating_internally",
                )
            )

            inference_start = time.time()
            full_response = ""

            try:
                async for token in provider.stream_inference(messages, context):
                    full_response += token
                clinical_circuit_breaker.record_success(provider.provider_id)
            except Exception as provider_err:
                clinical_circuit_breaker.record_failure(provider.provider_id)
                logger.error(
                    f"[Runtime] Provider {provider.provider_id} failed: {provider_err}"
                )
                # Attempt single fallback before raising
                try:
                    fallback_provider, fallback_decision = await self.router.route(
                        profile
                    )
                    yield format_sse(
                        RoutingDecisionEvent(
                            **make_base_kwargs(),
                            provider=fallback_decision.provider,
                            model=fallback_decision.model,
                            rationale=f"AUTO-FALLBACK: {fallback_decision.rationale}",
                            estimated_latency_ms=fallback_decision.estimated_latency_ms,
                            estimated_cost=fallback_decision.estimated_cost,
                            fallback_chain=fallback_decision.fallback_chain,
                        )
                    )
                    async for token in fallback_provider.stream_inference(
                        messages, context
                    ):
                        full_response += token
                    provider = fallback_provider
                    clinical_circuit_breaker.record_success(provider.provider_id)
                except Exception as fallback_err:
                    raise RuntimeError(
                        f"All providers failed. Last error: {fallback_err}"
                    ) from fallback_err

            latency_ms = int((time.time() - inference_start) * 1000)
            prompt_tokens = sum(len(m.get("content", "").split()) for m in messages)
            completion_tokens = len(full_response.split())
            cost_estimate = provider.estimate_cost(prompt_tokens, completion_tokens)

            # ── Step 3: Inference Envelope (telemetry) ─────────────────────
            yield format_sse(
                InferenceEnvelopeEvent(
                    **make_base_kwargs(),
                    provider=provider.provider_id,
                    model=provider.model_name,
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    latency_ms=latency_ms,
                    cost_estimate=cost_estimate,
                    raw_response_length=len(full_response),
                )
            )

            # ── Step 4: Clinical Judge ──────────────────────────────────────
            yield format_sse(
                JudgementStartedEvent(
                    **make_base_kwargs(), provider="openai", model="gpt-4o"
                )
            )

            user_msg = next(
                (m["content"] for m in reversed(messages) if m.get("role") == "user"),
                "",
            )
            judgement = await self.judge.evaluate(user_msg, full_response)

            yield format_sse(
                JudgementCompletedEvent(
                    **make_base_kwargs(),
                    provider="openai",
                    model="gpt-4o",
                    judgement=judgement.model_dump(),
                )
            )

            # ── Step 5: Escalation Policy ──────────────────────────────────
            if judgement.escalation_level != "NONE":
                yield format_sse(
                    EscalationTriggeredEvent(
                        **make_base_kwargs(),
                        level=judgement.escalation_level,
                        reason=f"Clinical Judge: hallucination_risk={judgement.hallucination_risk}, "
                        f"evidence_strength={judgement.evidence_strength}",
                    )
                )

            if judgement.escalation_level == "HARD_STOP":
                yield format_sse(
                    ErrorEvent(
                        **make_base_kwargs(),
                        error={
                            "code": "SAFETY_VIOLATION",
                            "message": "Response blocked by Clinical Judge — HARD_STOP escalation.",
                            "severity": "critical",
                            "contradictions": judgement.contradictions,
                        },
                    )
                )
                return

            # ── Step 6: Approved — stream to frontend ──────────────────────
            yield format_sse(
                StatusEvent(
                    **make_base_kwargs(),
                    provider=provider.provider_id,
                    model=provider.model_name,
                    status="streaming",
                )
            )

            chunk_size = 20
            for i in range(0, len(full_response), chunk_size):
                yield format_sse(
                    TokenEvent(
                        **make_base_kwargs(),
                        provider=provider.provider_id,
                        model=provider.model_name,
                        chunk=full_response[i : i + chunk_size],
                    )
                )

            yield format_sse(
                CompleteEvent(
                    **make_base_kwargs(),
                    provider=provider.provider_id,
                    model=provider.model_name,
                    total_tokens=prompt_tokens + completion_tokens,
                )
            )

        except Exception as e:
            logger.error(f"[ClinicalRuntime] Fatal inference error: {e}")
            yield format_sse(
                ErrorEvent(
                    traceId=trace_id,
                    sessionId=session_id,
                    patientId=patient_id,
                    sequence=self._next_seq(trace_id),
                    error={
                        "code": "INFERENCE_FAIL",
                        "message": str(e),
                        "severity": "high",
                    },
                )
            )
