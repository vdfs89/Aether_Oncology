# AI Behavior Guidelines

## 1. Tool Runtime Stream
A resposta da IA não deve ser interpretada como um bloco de texto ("chatbot clássico"), mas sim como um fluxo de execução orquestrado.
O comportamento esperado é o acionamento visível de rotinas especializadas:
- Acionar `biomarker-analysis`.
- Acionar `mutation-lookup`.
O painel exibe o progresso de cada step para que o médico acompanhe o "como" a máquina chegou na sugestão.

## 2. Orquestração e Clinical Modes
O "cérebro" da aplicação não é reativo. O `InferencePlanner` detecta ativamente a intenção clínica com base no `Clinical Mode` ativo (ex: Review Mode, Investigation Mode, Tumor Board Mode).
Cada modo altera:
- Depth do Retrieval.
- Densidade visual no layout.
- Threshold de evidência para sugerir ou alertar o usuário.

## 3. Não aos Mitos
- Evite arquiteturas `Multi-agent` infladas que criam imprevisibilidade em cenários médicos. O determinismo em tempo de orquestração deve prevalecer.
- Evite implementações de áudio ou "realtime collaborativo" puramente pelo buzz tech. O sistema deve focar na solidez clínica do seu RAG e Inference Tooling primeiro.
