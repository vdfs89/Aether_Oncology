from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, List

class BaseProvider(ABC):
    """
    Interface base para os LLMs no Clinical Runtime.
    """
    provider_type: str
    supports_streaming: bool = True
    supports_tools: bool = False
    supports_multimodal: bool = False
    supports_reasoning: bool = False
    max_context_tokens: int = 8192
    estimated_latency_ms: int = 500

    @abstractmethod
    async def stream_inference(self, messages: List[Dict[str, Any]], context: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        """
        Gera tokens assincronamente.
        """
        pass
