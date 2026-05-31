"""
Single source of truth for served-model metadata.

`MODEL_VERSION` is the canonical Oral Cancer model version. At runtime the
/predict path prefers the trained lineage (`models/data_lineage.json` ->
`model_version`) and falls back to this constant. 3.1.0 is chosen because it
already matches APP_VERSION, the lineage record, the model card and the schema
default — the only outliers were a stray hardcoded "3.0.0" in the /predict
response and the schema examples, which this constant eliminates.

`CLINICAL_DISCLAIMER` is the mandatory limits-of-use notice surfaced on every
prediction response.
"""

MODEL_VERSION = "3.1.0"

CLINICAL_DISCLAIMER = (
    "Aether Oncology é um sistema de apoio à decisão baseado em IA. Não "
    "substitui avaliação médica, não é um produto regulado/aprovado para uso "
    "clínico em produção e deve ser usado apenas sob supervisão profissional. "
    "Resultados não constituem diagnóstico."
)
