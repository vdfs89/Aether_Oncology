# src/tools/therapy_matcher.py
"""
TherapyMatcher — matching de opções terapêuticas por estágio clínico.
Fonte: NCCN Head and Neck v2.2025, ASCO Guidelines 2024.
Sem chamada de API externa — guidelines hardcoded com versionamento semântico.
Contrato estável: sempre retorna TherapyResult com source e evidence_level.
"""

from typing import List

from pydantic import BaseModel


class TherapyOption(BaseModel):
    name: str
    description: str
    evidence_level: str  # "I" | "II" | "III"
    line: int  # 1 = primeira linha, 2 = segunda linha
    contraindications: List[str]


class TherapyResult(BaseModel):
    risk_level: str
    stage_estimate: str
    options: List[TherapyOption]
    recommended_first_line: str
    source: str
    evidence_level: str  # nível geral do conjunto
    version: str
    notes: str


class TherapyMatcher:
    """
    Retorna opções terapêuticas rankeadas por nível de evidência.

    Regras por risk_level:

    HIGH risk:
      - Opção 1 (linha 1): Cirurgia + Radioterapia adjuvante, evidence_level="I"
      - Opção 2 (linha 1): Quimiorradioterapia concomitante (Cisplatina), evidence_level="I"
      - Opção 3 (linha 2): Imunoterapia (Pembrolizumab) se recidiva, evidence_level="I"
      - stage_estimate: "Moderado/Avançado (Estágio III-IV)"
      - notes: "Encaminhamento urgente para oncologia de cabeça e pescoço recomendado."

    MEDIUM risk:
      - Opção 1 (linha 1): Excisão cirúrgica local ampliada, evidence_level="I"
      - Opção 2 (linha 1): Radioterapia isolada (lesões irressecáveis), evidence_level="II"
      - Opção 3 (linha 2): Vigilância ativa com biópsia em 3 meses, evidence_level="II"
      - stage_estimate: "Inicial/Intermediário (Estágio I-II)"
      - notes: "Avaliação multidisciplinar recomendada antes da decisão terapêutica."

    LOW risk:
      - Opção 1 (linha 1): Vigilância ativa com retorno em 6 meses, evidence_level="II"
      - Opção 2 (linha 2): Biópsia incisional se lesão persistir > 3 semanas, evidence_level="II"
      - stage_estimate: "Precoce (Estágio 0-I suspeito)"
      - notes: "Orientação sobre cessação de tabaco e álcool."

    Sempre inclui source e evidence_level no resultado.
    """

    VERSION = "2025.1"
    SOURCE = "NCCN Head and Neck v2.2025; ASCO Guidelines 2024"

    def match(self, risk_level: str, biomarkers: dict = None) -> TherapyResult:
        """Retorna opções terapêuticas rankeadas para o risk_level informado."""
        rl_upper = risk_level.upper()

        if rl_upper == "HIGH":
            options = [
                TherapyOption(
                    name="Cirurgia + Radioterapia adjuvante",
                    description="Ressecção cirúrgica do tumor primário e esvaziamento cervical seguidos de radioterapia para controle local.",
                    evidence_level="I",
                    line=1,
                    contraindications=[
                        "Pacientes clinicamente inaptos para cirurgia de grande porte",
                        "Doença metastática à distância generalizada",
                    ],
                ),
                TherapyOption(
                    name="Quimiorradioterapia concomitante (Cisplatina)",
                    description="Tratamento sistêmico e radioterapia simultâneos para preservação de órgão ou margens comprometidas/extravasamento extracapsular.",
                    evidence_level="I",
                    line=1,
                    contraindications=[
                        "Disfunção renal severa (ClCr < 50 ml/min)",
                        "Neuropatia preexistente severa",
                    ],
                ),
                TherapyOption(
                    name="Imunoterapia (Pembrolizumab)",
                    description="Indicado como segunda linha de tratamento sistêmico em casos de recidiva ou doença metastática.",
                    evidence_level="I",
                    line=2,
                    contraindications=[
                        "Doença autoimune ativa não controlada",
                        "Uso crônico de corticosteroides em altas doses",
                    ],
                ),
            ]
            stage_estimate = "Moderado/Avançado (Estágio III-IV)"
            recommended_first_line = "Cirurgia + Radioterapia adjuvante"
            general_evidence_level = "I"
            notes = (
                "Encaminhamento urgente para oncologia de cabeça e pescoço recomendado."
            )

        elif rl_upper == "MEDIUM":
            options = [
                TherapyOption(
                    name="Excisão cirúrgica local ampliada",
                    description="Remoção completa da lesão com margens livres de segurança de pelo menos 1cm.",
                    evidence_level="I",
                    line=1,
                    contraindications=[
                        "Lesões extensas irressecáveis com invasão profunda de estruturas vitais"
                    ],
                ),
                TherapyOption(
                    name="Radioterapia isolada (lesões irressecáveis)",
                    description="Tratamento curativo alternativo para pacientes que recusam cirurgia ou possuem contraindicação cirúrgica.",
                    evidence_level="II",
                    line=1,
                    contraindications=[
                        "Exposição óssea mandibular preexistente",
                        "Irradiação prévia da mesma área",
                    ],
                ),
                TherapyOption(
                    name="Vigilância ativa com biópsia em 3 meses",
                    description="Monitoramento clínico rigoroso de lesões limítrofes com reavaliação histológica programada.",
                    evidence_level="II",
                    line=2,
                    contraindications=[
                        "Lesões com displasia grave confirmada",
                        "Não adesão do paciente ao protocolo de retorno",
                    ],
                ),
            ]
            stage_estimate = "Inicial/Intermediário (Estágio I-II)"
            recommended_first_line = "Excisão cirúrgica local ampliada"
            general_evidence_level = "I"
            notes = (
                "Avaliação multidisciplinar recomendada antes da decisão terapêutica."
            )

        else:  # LOW risk
            options = [
                TherapyOption(
                    name="Vigilância ativa com retorno em 6 meses",
                    description="Exame clínico preventivo visual e palpação a cada 6 meses.",
                    evidence_level="II",
                    line=1,
                    contraindications=[
                        "Presença de sintomatologia dolorosa progressiva",
                        "Surgimento de linfonodopatia cervical",
                    ],
                ),
                TherapyOption(
                    name="Biópsia incisional se lesão persistir > 3 semanas",
                    description="Intervenção diagnóstica padrão ouro para lesões persistentes sem etiologia definida.",
                    evidence_level="II",
                    line=2,
                    contraindications=["Distúrbios de coagulação não corrigidos"],
                ),
            ]
            stage_estimate = "Precoce (Estágio 0-I suspeito)"
            recommended_first_line = "Vigilância ativa com retorno em 6 meses"
            general_evidence_level = "II"
            notes = "Orientação sobre cessação de tabaco e álcool."

        return TherapyResult(
            risk_level=risk_level,
            stage_estimate=stage_estimate,
            options=options,
            recommended_first_line=recommended_first_line,
            source=self.SOURCE,
            evidence_level=general_evidence_level,
            version=self.VERSION,
            notes=notes,
        )
