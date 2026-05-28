# Evidence Visualization

## 1. Abstração vs. Realidade
Os componentes visuais que explicam as respostas do RAG ou da Inferência ("Explainability") não devem usar bibliotecas genéricas (como Recharts) que os engessem.
A adoção de **SVG + Framer Motion** permite total personalização do fluxo clínico:
- Grafos temporais que contam histórias.
- Confidence Heatmaps que mapeiam a incerteza estatística (Bayesiana) espacialmente no texto.
- Propagação de nós (Retrieval Propagation).
- Depuração Visual para que os próprios médicos compreendam "por que" a máquina tomou a decisão.
