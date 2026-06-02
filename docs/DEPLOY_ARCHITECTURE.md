# Arquitetura de Deploy (Aether Oncology)

> **Documentação Técnica — Etapa 4 (Deploy)**

Este documento detalha a arquitetura de deploy atual da API do Aether Oncology, analisa os paradigmas de inferência (Batch vs. Real-time) e justifica a escolha adotada para o cenário clínico simulado.

---

## 1. Contexto e Restrições

O modelo em questão é um **protótipo acadêmico** para triagem de risco de câncer oral, treinado sobre o dataset sintético *Oral Cancer Top 30 Countries*. Conforme detalhado no [Model Card](./MODEL_CARD.md) e no [Benchmark](./benchmark.md), o dataset carece de sinal preditivo real (ROC-AUC ≈ 0.50). 

Apesar dessa limitação fundamental de aprendizado, a **infraestrutura de deploy** e o pipeline de MLOps foram construídos em nível de produção, servindo como uma arquitetura de referência de engenharia. O uso pretendido do sistema (a persona) é o de **Apoio à Decisão Clínica (CDSS)** por requisição: um oncologista ou cirurgião interage com o sistema para estratificar o risco de um paciente imediatamente após o preenchimento de seus dados vitais.

---

## 2. Paradigmas de Inferência: Batch vs. Real-time

Existem duas abordagens principais para servir o modelo:

### 2.1 Batch Inference (Inferência em Lote)
- **Como funciona:** O modelo não fica online recebendo requisições. Periodicamente (ex.: a cada madrugada), um script consome novos registros de um banco de dados, gera predições para todos em massa e salva os resultados em uma tabela. O frontend apenas lê esses resultados pré-calculados.
- **Prós:** Altíssimo *throughput*, mais barato (a máquina liga, processa e desliga), simples de escalar e não exige SLAs rigorosos de latência (< 500ms).
- **Contras:** O dado não é "fresco". Se o médico insere um novo paciente ao meio-dia, o resultado só estará disponível no dia seguinte.
- **Cenário ideal:** Rastreamento populacional, envio de alertas de saúde pública por e-mail, processamento diário de milhares de prontuários históricos em background.

### 2.2 Real-time / Online Inference (Inferência em Tempo Real)
- **Como funciona:** O modelo é servido por uma API síncrona (como FastAPI). Cada requisição contém dados de um paciente; a inferência ocorre no momento exato em que a requisição chega (on-the-fly), e a resposta é devolvida imediatamente.
- **Prós:** Resposta imediata. O médico recebe o cálculo de risco na mesma sessão em que envia os dados.
- **Contras:** Requer que o serviço fique ligado 24/7 (custo maior), exige monitoramento rígido de latência, escalabilidade mais complexa diante de picos (load balancers, autoscaling).
- **Cenário ideal:** Consultas médicas online, assistentes conversacionais (chatbots), sistemas de triagem urgentes e portais iterativos como o da Aether Oncology.

---

## 3. Decisão e Justificativa

**Arquitetura Escolhida:** Inferência em Tempo Real (Real-time).

**Justificativa:** 
A decisão reflete o cenário de negócio pretendido para o Aether Oncology. O sistema conta com um **Portal Clínico** e um **Copiloto Chat (RAG)**. A experiência do usuário exige predições síncronas. Quando o cirurgião preenche os dados de um novo paciente para triagem de biópsia, ele espera receber o nível de probabilidade imediatamente no portal para definir os próximos passos na consulta. Uma abordagem de lote (*batch*) quebraria completamente esse fluxo de trabalho assistido em tempo real.

---

## 4. Arquitetura Atual Implementada

A infraestrutura provisionada e em produção opera com as seguintes tecnologias e componentes:

1. **Frontend (Vercel):** Aplicação Next.js/React. Aporta o Portal Clínico e a interface de Chat. Gerencia a segurança (criptografia IndexedDB, scrubber de dados LGPD) antes de enviar a requisição HTTP.
2. **Backend/API (Render):** FastAPI síncrona empacotada em uma imagem Docker otimizada (`python:3.12-slim-bookworm`).
   - A rota principal é a `POST /predict`.
3. **Gerenciamento de Artefatos no Startup:**
   - Durante a inicialização (`lifespan`), a API carrega o modelo PyTorch (`models/aether_mlp_v2.pth`) e o pipeline do Scikit-Learn (`preprocessor.joblib`).
   - A API valida se os artefatos existem e os aloca em memória.
4. **Fluxo da Requisição `/predict`:**
   - O payload JSON é recebido e estritamente validado com **Pydantic** (`OralCancerRequest`).
   - O array é passado pelo `ColumnTransformer` (StandardScaler + OneHotEncoder).
   - Ocorre a etapa de `.forward()` da rede neural PyTorch e é gerada a probabilidade de risco usando *Sigmoid*.
   - Avaliação de confiança (Confidence Tiering).
   - Um evento é disparado e logado de forma assíncrona (thread-offload), garantindo que não trave a inferência. A trilha é cifrada com **Fernet** (AES-128-CBC + HMAC) e encadeada por hash (chain-of-custody) — é um mecanismo de log de auditoria cifrado, **sem qualquer alegação de certificação de compliance**.
   - A resposta JSON contendo o alerta clínico e a probabilidade de risco é retornada.

---

## 5. Aviso de Responsabilidade (Caveat Honesto)

Conforme destacado no `MODEL_CARD.md`, essa arquitetura ilustra uma fundação **robusta** de engenharia (com logs estruturados, RAG e CI/CD). No entanto, o **modelo servido carece de valor clínico**. Como as bases sintéticas não têm sinal forte associado ao *ground truth*, o uso se atém a demonstração de infraestrutura e MLOps. Não há aplicabilidade diagnóstica real configurada.
