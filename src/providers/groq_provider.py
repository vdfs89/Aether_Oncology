import logging
import os
from typing import Any, AsyncGenerator, Dict, List

from groq import AsyncGroq

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


class GroqProvider(BaseProvider):
    """
    Provider de baixa latência para inferência conversacional e UX em tempo real.
    Modelo: llama-3.3-70b-versatile — melhor balanceamento razão/velocidade no Groq.
    """

    provider_id = "groq"
    model_name = "llama-3.3-70b-versatile"

    supports_streaming = True
    supports_tools = True
    supports_multimodal = False
    supports_reasoning = False
    supports_json_mode = False

    max_context_tokens = 32768
    estimated_latency_ms = 200

    # Pricing (USD por 1k tokens) — llama-3.3-70b no Groq
    cost_per_1k_input_tokens = 0.00059
    cost_per_1k_output_tokens = 0.00079

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY não definida no ambiente")
        self.client = AsyncGroq(api_key=api_key)

    async def stream_inference(
        self, messages: List[Dict[str, Any]], context: Dict[str, Any] = None
    ) -> AsyncGenerator[str, None]:
        system_prompt = CLINICAL_SYSTEM_PROMPT
        if context:
            system_prompt += f"\n\nContexto clínico: {context}"

        groq_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            groq_messages.append({"role": msg["role"], "content": msg["content"]})

        stream = await self.client.chat.completions.create(
            model=self.model_name,
            messages=groq_messages,
            stream=True,
            temperature=0.0,
            max_tokens=4096,
        )

        async for chunk in stream:
            token = chunk.choices[0].delta.content
            if token is not None:
                yield token

    async def health_check(self) -> bool:
        """Faz uma inferência mínima para verificar conectividade."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
                stream=False,
            )
            return bool(response.choices)
        except Exception as e:
            logger.warning(f"[GroqProvider] health_check failed: {e}")
            return False
