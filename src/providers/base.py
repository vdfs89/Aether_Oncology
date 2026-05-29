from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, List


class BaseProvider(ABC):
    """
    Contrato base para todos os LLM providers do Clinical Runtime.
    Cada provider é um plugin intercambiável — o Runtime Clínico é o sistema principal.
    """
    # Identity
    provider_id: str
    model_name: str

    # Capabilities
    supports_streaming: bool = True
    supports_tools: bool = False
    supports_multimodal: bool = False
    supports_reasoning: bool = False
    supports_json_mode: bool = False

    # Performance / cost profile
    max_context_tokens: int = 8192
    estimated_latency_ms: int = 500
    cost_per_1k_input_tokens: float = 0.0
    cost_per_1k_output_tokens: float = 0.0

    @abstractmethod
    async def stream_inference(
        self,
        messages: List[Dict[str, Any]],
        context: Dict[str, Any] = None
    ) -> AsyncGenerator[str, None]:
        """Gera tokens assincronamente a partir de mensagens clínicas."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """
        Verifica se o provider está operacional.
        Usado pelo CircuitBreaker para probing de recuperação.
        """
        pass

    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """
        Estima o custo em USD da inferência.
        Override para providers com pricing diferente de input/output.
        """
        input_cost = (prompt_tokens / 1000) * self.cost_per_1k_input_tokens
        output_cost = (completion_tokens / 1000) * self.cost_per_1k_output_tokens
        return round(input_cost + output_cost, 6)
