import os
from typing import AsyncGenerator, Dict, Any, List
from openai import AsyncOpenAI
import logging

from src.providers.base import BaseProvider

logger = logging.getLogger(__name__)

class OpenAIProvider(BaseProvider):
    def __init__(self):
        super().__init__()
        self.provider_type = "openai"
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_JUDGE_MODEL", "gpt-4o-mini")
        
        if self.api_key:
            self.client = AsyncOpenAI(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("OPENAI_API_KEY is not set. OpenAIProvider will fail if called.")

    async def stream_inference(self, messages: List[Dict[str, str]], context: Dict[str, Any]) -> AsyncGenerator[str, None]:
        if not self.client:
            yield "ERROR: OPENAI_API_KEY is missing."
            return

        try:
            formatted_messages = self._format_messages(messages, context)
            
            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=formatted_messages,
                stream=True
            )
            
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield content
                    
        except Exception as e:
            logger.error(f"OpenAI inference error: {e}")
            raise e

    def _format_messages(self, messages: List[Dict[str, str]], context: Dict[str, Any]) -> List[Dict[str, str]]:
        # Simplified conversion. In a real scenario, map to OpenAI's roles.
        return [{"role": m.get("role", "user"), "content": m.get("content", "")} for m in messages]
