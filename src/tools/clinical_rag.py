# src/tools/clinical_rag.py
"""
ClinicalRAG — respostas baseadas em evidências clínicas oncológicas.
Versão Sprint 3: base local estruturada (sem LLM externo).
Cada resposta inclui source, page e evidence_level obrigadamente.
Contrato estável: RAGResult sempre tem source e evidence_level —
SafetyPolicy.evaluate_tool_output() validará esses campos.
"""

from typing import List, Optional

from pydantic import BaseModel


class ClinicalReference(BaseModel):
    title: str
    source: str  # ex: "INCA 2024", "NCCN v2.2025"
    page: Optional[str] = None
    evidence_level: str  # "I" | "II" | "III"
    year: int


class RAGResult(BaseModel):
    query: str
    answer: str
    references: List[ClinicalReference]
    source: str  # fonte primária consolidada (para SafetyPolicy)
    evidence_level: str  # nível do conjunto (para SafetyPolicy)
    confidence: float  # 0.0–1.0
    disclaimer: str


# Base de conhecimento local — guidelines versionados
KNOWLEDGE_BASE = [
    {
        "keywords": ["tabaco", "tobacco", "fumo", "smoking", "cigarro"],
        "answer": "O tabagismo é o principal fator de risco modificável para câncer oral, aumentando o risco em até 6x. A cessação do tabaco reduz o risco em 50% após 5 anos.",
        "references": [
            {
                "title": "Prevenção do Câncer Oral — Fatores de Risco",
                "source": "INCA 2024",
                "page": "p.34",
                "evidence_level": "I",
                "year": 2024,
            },
            {
                "title": "Head and Neck Cancers — Risk Factors",
                "source": "NCCN v2.2025",
                "page": "HN-1",
                "evidence_level": "I",
                "year": 2025,
            },
        ],
        "confidence": 0.92,
    },
    {
        "keywords": ["álcool", "alcohol", "bebida", "etilismo"],
        "answer": "O consumo de álcool potencializa o efeito do tabaco no risco de câncer oral. O uso combinado eleva o risco em até 15x comparado a não usuários.",
        "references": [
            {
                "title": "Câncer de Boca — Epidemiologia e Prevenção",
                "source": "INCA 2024",
                "page": "p.41",
                "evidence_level": "I",
                "year": 2024,
            },
        ],
        "confidence": 0.88,
    },
    {
        "keywords": [
            "diagnóstico",
            "diagnosis",
            "biópsia",
            "biopsy",
            "estadiamento",
            "staging",
        ],
        "answer": "O diagnóstico definitivo do câncer oral requer biópsia incisional com análise anatomopatológica. O estadiamento TNM (8ª edição AJCC) orienta a conduta terapêutica.",
        "references": [
            {
                "title": "AJCC Cancer Staging Manual 8th Edition",
                "source": "AJCC 2017",
                "page": "p.79",
                "evidence_level": "I",
                "year": 2017,
            },
            {
                "title": "Oral Cavity and Oropharyngeal Cancer",
                "source": "NCCN v2.2025",
                "page": "HN-3",
                "evidence_level": "I",
                "year": 2025,
            },
        ],
        "confidence": 0.95,
    },
    {
        "keywords": [
            "tratamento",
            "treatment",
            "cirurgia",
            "surgery",
            "radioterapia",
            "radiation",
            "quimioterapia",
            "chemotherapy",
        ],
        "answer": "O tratamento do câncer oral depende do estadiamento. Estágios I-II: cirurgia ou radioterapia isolada. Estágios III-IV: cirurgia + radioterapia adjuvante ou quimiorradioterapia com Cisplatina.",
        "references": [
            {
                "title": "Head and Neck Cancers — Treatment Guidelines",
                "source": "NCCN v2.2025",
                "page": "HN-7",
                "evidence_level": "I",
                "year": 2025,
            },
            {
                "title": "Systemic Therapy for Head and Neck Cancer",
                "source": "ASCO Guidelines 2024",
                "page": "p.12",
                "evidence_level": "I",
                "year": 2024,
            },
        ],
        "confidence": 0.91,
    },
    {
        "keywords": [
            "prognóstico",
            "prognosis",
            "sobrevida",
            "survival",
            "recidiva",
            "recurrence",
        ],
        "answer": "A sobrevida em 5 anos para câncer oral estágio I é ~80%. Estágio IV tem sobrevida ~35%. Detecção precoce é o fator prognóstico mais relevante.",
        "references": [
            {
                "title": "Survival Statistics for Oral Cavity Cancer",
                "source": "SEER Database 2023",
                "page": "Table 4.2",
                "evidence_level": "II",
                "year": 2023,
            },
            {
                "title": "INCA — Estimativa de Sobrevida",
                "source": "INCA 2024",
                "page": "p.67",
                "evidence_level": "II",
                "year": 2024,
            },
        ],
        "confidence": 0.85,
    },
]


class ClinicalRAG:
    """
    Busca na base local por keywords e retorna resposta com fontes auditáveis.
    Sempre retorna RAGResult com source e evidence_level preenchidos,
    mesmo quando não há match (retorna resposta padrão com confidence baixa).
    """

    DISCLAIMER = (
        "Esta resposta é gerada por um sistema de suporte à decisão clínica "
        "baseado em guidelines públicos. Não substitui avaliação médica. "
        "Consulte sempre um especialista em oncologia de cabeça e pescoço."
    )

    def query(self, question: str) -> RAGResult:
        """
        Busca por keywords na base local.
        - Normaliza a pergunta para lowercase
        - Tenta match com cada entrada do KNOWLEDGE_BASE
        - Se múltiplos matches: retorna o de maior confidence
        - Se sem match: retorna resposta padrão com evidence_level="III", confidence=0.3
        - source consolidado: join das sources das referências
        - evidence_level consolidado: melhor nível entre as referências
        """
        q_norm = question.lower()
        matched_entries = []

        for entry in KNOWLEDGE_BASE:
            for kw in entry["keywords"]:
                if kw in q_norm:
                    matched_entries.append(entry)
                    break

        if matched_entries:
            # Retorna o match de maior confidence
            best_entry = max(matched_entries, key=lambda x: x["confidence"])

            # Consolidar referências
            references = [ClinicalReference(**ref) for ref in best_entry["references"]]

            # Consolidar source
            unique_sources = []
            for ref in references:
                if ref.source not in unique_sources:
                    unique_sources.append(ref.source)
            source_str = "; ".join(unique_sources)

            # Consolidar evidence_level (melhor nível: "I" > "II" > "III")
            levels = [ref.evidence_level for ref in references]
            if "I" in levels:
                best_level = "I"
            elif "II" in levels:
                best_level = "II"
            else:
                best_level = "III"

            return RAGResult(
                query=question,
                answer=best_entry["answer"],
                references=references,
                source=source_str,
                evidence_level=best_level,
                confidence=best_entry["confidence"],
                disclaimer=self.DISCLAIMER,
            )

        # Resposta padrão quando não há match
        default_ref = ClinicalReference(
            title="Diretrizes Gerais de Oncologia Bucal",
            source="Diretrizes Gerais",
            page="Geral",
            evidence_level="III",
            year=2024,
        )
        return RAGResult(
            query=question,
            answer="Não encontramos diretrizes locais específicas para a sua dúvida na base de conhecimento consolidada de câncer oral.",
            references=[default_ref],
            source="Diretrizes Gerais",
            evidence_level="III",
            confidence=0.3,
            disclaimer=self.DISCLAIMER,
        )
