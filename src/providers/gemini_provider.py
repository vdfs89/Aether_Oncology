import logging
import os
from typing import Any, AsyncGenerator, Dict, List

from google import genai
from google.genai import types as genai_types

from src.providers.base import BaseProvider

logger = logging.getLogger(__name__)

CLINICAL_SYSTEM_PROMPT = """Você é o assistente informativo do Aether Oncology — um PROTÓTIPO ACADÊMICO criado para um
Tech Challenge. Você NÃO é um produto clínico, NÃO é um sistema de apoio à decisão clínica e
NÃO é um dispositivo médico.

PAPEL
Fornecer informações gerais e educacionais sobre oncologia em linguagem acessível. Quando
houver, você pode trazer referências de buscas no PubMed — sempre como material de leitura
geral, não como recomendação clínica.

REGRAS (obrigatórias)
- Não se apresente como sistema de apoio à decisão clínica nem afirme seguir diretrizes da
  NCCN, FDA ou de qualquer órgão. Não alegue "rigor clínico" nem autoridade médica.
- Deixe claro JÁ NA ABERTURA que você é um protótipo acadêmico e que oferece apenas
  informação geral — não diagnóstico, não conselho médico, não substitui um profissional.
- Não apresente saídas do modelo de risco como clinicamente válidas: o modelo subjacente é um
  protótipo treinado em dados sintéticos, sem capacidade preditiva validada (ROC ≈ 0.50).
- Nunca invente citações, autores ou periódicos. Só mencione referências reais; na dúvida,
  não cite.
- Para qualquer pergunta sobre um caso individual, oriente a procurar um profissional de saúde.

TOM
Claro, honesto e acessível. Mensagem de abertura curta, com o disclaimer à frente — não uma
lista longa de "habilidades clínicas"."""


class GeminiProvider(BaseProvider):
    """
    Provider de raciocínio profundo para análises clínicas complexas.
    Modelo: gemini-2.0-flash — ótimo balanceamento velocidade/reasoning para uso clínico.
    SDK: google-genai (novo SDK unificado — suporta Gemini 2.x+)
    """

    provider_id = "gemini"
    model_name = "gemini-2.0-flash"

    supports_streaming = True
    supports_tools = True
    supports_multimodal = True
    supports_reasoning = True
    supports_json_mode = True

    max_context_tokens = 1_000_000
    estimated_latency_ms = 1200

    # Pricing (USD por 1k tokens) — gemini-2.0-flash
    cost_per_1k_input_tokens = 0.00010
    cost_per_1k_output_tokens = 0.00040

    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY não definida no ambiente")
        self.client = genai.Client(api_key=api_key)

    async def stream_inference(
        self, messages: List[Dict[str, Any]], context: Dict[str, Any] = None
    ) -> AsyncGenerator[str, None]:
        system_prompt = CLINICAL_SYSTEM_PROMPT
        if context:
            system_prompt += f"\n\nContexto clínico: {context}"

        # Build contents in Gemini format
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append(
                genai_types.Content(
                    role=role, parts=[genai_types.Part(text=msg["content"])]
                )
            )

        config = genai_types.GenerateContentConfig(
            system_instruction=system_prompt, temperature=0.0, max_output_tokens=8192
        )

        async for chunk in await self.client.aio.models.generate_content_stream(
            model=self.model_name, contents=contents, config=config
        ):
            if chunk.text:
                yield chunk.text

    async def health_check(self) -> bool:
        """Verifica conectividade com a API Gemini."""
        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents="ping",
                config=genai_types.GenerateContentConfig(max_output_tokens=1),
            )
            return bool(response.text is not None)
        except Exception as e:
            logger.warning(f"[GeminiProvider] health_check failed: {e}")
            return False
