# src/tools/biomarker_adapter.py
"""
BiomarkerAdapter — análise de biomarcadores de risco para câncer oral.
Fonte: INCA 2024, NCCN Head and Neck v2.2025.
Sem chamada de API externa — base local versionada em JSON.
Contrato estável: sempre retorna BiomarkerResult com source e evidence_level.
"""
from pydantic import BaseModel
from typing import List, Optional

class RiskFactor(BaseModel):
    name: str
    severity: str          # "HIGH" | "MEDIUM" | "LOW"
    description: str

class BiomarkerResult(BaseModel):
    patient_profile: dict
    risk_factors: List[RiskFactor]
    overall_risk: str      # "HIGH" | "MEDIUM" | "LOW"
    source: str            # ex: "INCA 2024; NCCN Head and Neck v2.2025"
    evidence_level: str    # "I" | "II" | "III"
    version: str           # ex: "2025.1"
    recommendations: List[str]

class BiomarkerAdapter:
    """
    Analisa perfil do paciente e retorna biomarcadores de risco.
    
    Regras de risco (baseadas em INCA 2024):
    - tobacco_use="Yes" + alcohol_use="Yes" → HIGH risk, evidence_level="I"
    - tobacco_use="Yes" OU alcohol_use="Yes" → MEDIUM risk, evidence_level="I"  
    - age > 60 → adiciona fator de risco "Idade avançada" severity="MEDIUM"
    - age > 70 → severity="HIGH"
    - socioeconomic_status="Low" → adiciona fator "Baixo acesso a cuidados" severity="MEDIUM"
    - sem nenhum fator → LOW risk, evidence_level="II"
    
    Sempre inclui source e evidence_level no resultado.
    """
    
    VERSION = "2025.1"
    SOURCE = "INCA 2024; NCCN Head and Neck v2.2025"
    
    def analyze(
        self,
        age: int,
        tobacco_use: str,      # "Yes" | "No"
        alcohol_use: str,      # "Yes" | "No"
        socioeconomic_status: str,  # "Low" | "Middle" | "High"
        country: str,
        gender: str,
        survival_rate: Optional[float] = None,
    ) -> BiomarkerResult:
        """Analisa biomarcadores e retorna resultado com fonte auditável."""
        risk_factors: List[RiskFactor] = []
        
        # Analisar fatores individuais
        # Tabaco e Álcool
        has_tobacco = tobacco_use == "Yes"
        has_alcohol = alcohol_use == "Yes"
        
        if has_tobacco:
            risk_factors.append(RiskFactor(
                name="Uso de tabaco",
                severity="HIGH",
                description="Uso ativo de produtos de tabaco, principal fator causador de câncer oral."
            ))
        if has_alcohol:
            risk_factors.append(RiskFactor(
                name="Uso de álcool",
                severity="MEDIUM",
                description="Consumo regular de álcool, sinérgico com tabagismo."
            ))

        # Idade
        if age > 70:
            risk_factors.append(RiskFactor(
                name="Idade avançada",
                severity="HIGH",
                description="Idade superior a 70 anos apresenta maior risco cumulativo para carcinogênese."
            ))
        elif age > 60:
            risk_factors.append(RiskFactor(
                name="Idade avançada",
                severity="MEDIUM",
                description="Idade superior a 60 anos com risco aumentado."
            ))

        # Status socioeconômico
        if socioeconomic_status == "Low":
            risk_factors.append(RiskFactor(
                name="Baixo acesso a cuidados",
                severity="MEDIUM",
                description="Status socioeconômico baixo correlaciona-se com diagnóstico tardio."
            ))

        # Determinar overall_risk e evidence_level
        if has_tobacco and has_alcohol:
            overall_risk = "HIGH"
            evidence_level = "I"
        elif has_tobacco or has_alcohol:
            overall_risk = "MEDIUM"
            evidence_level = "I"
        else:
            if len(risk_factors) > 0:
                # Se não tem tabaco/álcool mas tem outros fatores (idade ou socioeconomic)
                overall_risk = "MEDIUM"
                evidence_level = "II"
            else:
                overall_risk = "LOW"
                evidence_level = "II"

        # Recomendações
        recommendations: List[str] = []
        if overall_risk == "HIGH":
            recommendations.append("Encaminhamento imediato para avaliação com especialista (oncologista ou cirurgião de cabeça e pescoço).")
            recommendations.append("Realização de biópsia sob qualquer suspeita clínica de lesão persistente por mais de 2 semanas.")
        elif overall_risk == "MEDIUM":
            recommendations.append("Acompanhamento odontológico/médico preventivo semestral.")
            recommendations.append("Orientação ativa para cessação do uso de tabaco e/ou álcool.")
        else:
            recommendations.append("Exame visual preventivo anual.")
            recommendations.append("Manutenção de hábitos saudáveis e higiene oral.")

        patient_profile = {
            "age": age,
            "tobacco_use": tobacco_use,
            "alcohol_use": alcohol_use,
            "socioeconomic_status": socioeconomic_status,
            "country": country,
            "gender": gender,
            "survival_rate": survival_rate
        }

        return BiomarkerResult(
            patient_profile=patient_profile,
            risk_factors=risk_factors,
            overall_risk=overall_risk,
            source=self.SOURCE,
            evidence_level=evidence_level,
            version=self.VERSION,
            recommendations=recommendations
        )
