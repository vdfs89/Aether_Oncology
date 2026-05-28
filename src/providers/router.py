from pydantic import BaseModel
from src.providers.base import BaseProvider
from src.providers.groq_provider import GroqProvider
from src.providers.gemini_provider import GeminiProvider

class ClinicalTaskProfile(BaseModel):
    intent: str
    risk_level: str
    needs_reasoning: bool
    needs_low_latency: bool
    needs_multimodal: bool

class ClinicalModelRouter:
    def __init__(self):
        self._groq = None
        self._gemini = None
        
    def _get_groq(self) -> BaseProvider:
        if not self._groq:
            self._groq = GroqProvider()
        return self._groq

    def _get_gemini(self) -> BaseProvider:
        if not self._gemini:
            self._gemini = GeminiProvider()
        return self._gemini

    def route(self, task_profile: ClinicalTaskProfile) -> BaseProvider:
        """
        Roteamento clínico com fallback inteligente
        """
        if task_profile.needs_multimodal or task_profile.needs_reasoning:
            return self._get_gemini()
            
        if task_profile.needs_low_latency:
            return self._get_groq()
            
        intent_mapping = {
            "biomarker_analysis": self._get_gemini,
            "treatment_rationale": self._get_gemini,
            "live_streaming": self._get_groq,
            "conversational_ux": self._get_groq
        }
        
        provider_getter = intent_mapping.get(task_profile.intent)
        if provider_getter:
            return provider_getter()
            
        if task_profile.risk_level in ["HIGH", "CRITICAL"]:
            return self._get_gemini()
            
        return self._get_groq()
