import os
import asyncio
from typing import AsyncGenerator, Dict, Any, List
from groq import AsyncGroq
from src.providers.base import BaseProvider

class GroqProvider(BaseProvider):
    def __init__(self):
        self.provider_type = "groq"
        self.supports_streaming = True
        self.supports_tools = True
        self.supports_multimodal = False
        self.supports_reasoning = False
        self.max_context_tokens = 8192
        self.estimated_latency_ms = 200 # Ultra low latency

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY não definida no ambiente")
        self.client = AsyncGroq(api_key=api_key)
        self.model = "llama3-8b-8192"

    async def stream_inference(self, messages: List[Dict[str, Any]], context: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        system_prompt = "Você é o Aether Oncology, um Clinical Cognitive Runtime enterprise."
        if context:
            system_prompt += f"\nContexto clínico fornecido: {context}"
            
        groq_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            groq_messages.append({"role": msg["role"], "content": msg["content"]})
            
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=groq_messages,
            stream=True,
            temperature=0.0
        )
        
        async for chunk in stream:
            token = chunk.choices[0].delta.content
            if token is not None:
                yield token
