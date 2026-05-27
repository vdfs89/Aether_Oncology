"""
src/api/schemas.py
==================
Aether Oncology v3.0 — Pydantic Schemas.

Modelos de entrada e saída para o endpoint POST /predict (Oral Cancer v3.0).
Substituem os schemas WDBC (30 features numéricas) da v2.x.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schema — Oral Cancer Top 30 Countries
# ---------------------------------------------------------------------------


class OralCancerRequest(BaseModel):
    """
    Dados clínicos para triagem de risco de câncer oral.

    Todos os campos mapeiam diretamente para as colunas do
    Oral Cancer Top 30 Countries dataset (MIT License, 160k records).
    """

    country: str = Field(
        ...,
        description="País de origem do paciente",
        example="Brazil",
    )
    gender: Literal["Male", "Female"] = Field(
        ...,
        description="Sexo biológico do paciente",
    )
    age: int = Field(
        ...,
        ge=0,
        le=120,
        description="Idade do paciente em anos",
        example=52,
    )
    tobacco_use: Literal["Yes", "No"] = Field(
        ...,
        description="Uso de tabaco (qualquer forma)",
    )
    alcohol_use: Literal["Yes", "No"] = Field(
        ...,
        description="Consumo de álcool regular",
    )
    socioeconomic_status: Literal["High", "Middle", "Low"] = Field(
        ...,
        description="Nível socioeconômico do paciente",
    )
    treatment_type: str | None = Field(
        None,
        description="Tipo de tratamento atual (opcional)",
        example="Surgery",
    )
    survival_rate: float | None = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Taxa de sobrevivência estimada 0–1 (opcional)",
        example=0.72,
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "country": "Brazil",
                    "gender": "Male",
                    "age": 52,
                    "tobacco_use": "Yes",
                    "alcohol_use": "Yes",
                    "socioeconomic_status": "Low",
                    "treatment_type": "Chemotherapy",
                    "survival_rate": 0.61,
                }
            ]
        }
    }


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------


class PredictionResponse(BaseModel):
    """
    Resposta estruturada da triagem de risco de câncer oral.

    O campo `warning` é ativado quando `confidence == 'Low'`,
    sinalizando que a probabilidade está próxima do limiar de decisão
    e que **revisão clínica manual é obrigatória** antes de qualquer ação.
    """

    risk_level: Literal["Low", "High"] = Field(
        ...,
        description="Nível de risco inferido: 'High' = Moderate/Late, 'Low' = Early",
    )
    probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Probabilidade de alto risco (0.0–1.0)",
    )
    confidence: Literal["Low", "Medium", "High"] = Field(
        ...,
        description=(
            "Confiança da predição baseada na margem em relação ao limiar:\n"
            "  High   → margem ≥ 0.30 (probabilidade ≤ 0.20 ou ≥ 0.80)\n"
            "  Medium → margem ≥ 0.15 (probabilidade ≤ 0.35 ou ≥ 0.65)\n"
            "  Low    → margem < 0.15 (zona de incerteza clínica)"
        ),
    )
    warning: str | None = Field(
        default=None,
        description=(
            "Alerta clínico ativado quando confidence='Low'. "
            "Aciona loop de revisão dupla obrigatória."
        ),
    )
    model_version: str = Field(
        default="3.0.0",
        description="Versão do modelo Aether Oncology",
    )

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "summary": "Alto risco — alta confiança",
                    "value": {
                        "risk_level": "High",
                        "probability": 0.83,
                        "confidence": "High",
                        "warning": None,
                        "model_version": "3.0.0",
                    },
                },
                {
                    "summary": "Alto risco — baixa confiança (aciona safety loop)",
                    "value": {
                        "risk_level": "High",
                        "probability": 0.53,
                        "confidence": "Low",
                        "warning": (
                            "⚠️ BAIXA CONFIANÇA: Probabilidade próxima ao limiar — "
                            "revisão clínica manual dupla obrigatória antes de qualquer decisão."
                        ),
                        "model_version": "3.0.0",
                    },
                },
            ]
        }
    }
