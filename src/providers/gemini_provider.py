import os
import asyncio
from typing import AsyncGenerator, Dict, Any, List
import google.generativeai as genai
from src.providers.base import BaseProvider

class GeminiProvider(BaseProvider):
    def __init__(self):
        self.provider_type = "gemini"
        self.supports_streaming = True
        self.supports_tools = True
        self.supports_multimodal = True
        self.supports_reasoning = True
        self.max_context_tokens = 2000000
        self.estimated_latency_ms = 1500

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY não definida no ambiente")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    async def stream_inference(self, messages: List[Dict[str, Any]], context: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
        system_prompt = "Você é o Aether Oncology, um Clinical Cognitive Runtime enterprise."
        if context:
            system_prompt += f"\nContexto clínico fornecido: {context}"
            
        prompt_text = system_prompt + "\n\n"
        for msg in messages:
            prompt_text += f"{msg['role'].upper()}: {msg['content']}\n"
        prompt_text += "ASSISTANT: "
        
        response = await self.model.generate_content_async(
            prompt_text,
            stream=True
        )
        
        async for chunk in response:
            if chunk.text:
                yield chunk.text
