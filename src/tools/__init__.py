# src/tools/__init__.py
"""
Clinical Tools — módulo de ferramentas clínicas especializadas.

Contém adapters de domínio que NÃO chamam APIs externas:
- BiomarkerAdapter: análise de biomarcadores de risco
- TherapyMatcher: matching de opções terapêuticas
- ClinicalRAG: respostas baseadas em evidências locais

Todos os tools seguem o contrato SafetyPolicy.evaluate_tool_output():
resultado DEVE conter 'source' e 'evidence_level'.
"""
