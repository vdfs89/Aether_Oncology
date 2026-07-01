# Relatório de Auditoria Arquitetural — Aether Oncology

> **Verificado contra o código em 2026-05-29.** Esta versão substitui um relatório
> anterior que estava **desatualizado**: vários achados "🔴 críticos" (sobretudo de
> criptografia/HIPAA) já haviam sido resolvidos quando foram reportados. Cada item
> abaixo traz um **veredito verificado**: ✅ Resolvido · 🟡 Aberto · ⚪ Não verificado
> a fundo · ❌ Alegação falsa/desatualizada.

---

## 1. Conformidade HIPAA / Segurança

| Achado original | Veredito | Evidência atual |
| :--- | :---: | :--- |
| "Audit logs sem criptografia (plaintext JSONL)" | ❌ Falso | `src/services/audit.py`: `encrypt_entry()` (Fernet) + `f.write(encrypted_bytes)` |
| "IndexedDB não criptografado" | ❌ Falso | `frontend/.../persistence/crypto.ts`: PBKDF2 + AES-GCM-256 (`window.crypto.subtle`) |
| "PHI scrubber básico (sem CPF/datas)" | ❌ Falso | `phi.ts`: CPF, DOB, CNS/SUS, CRM, CEP, telefone, e-mail (42 testes) |
| **Judge fail-open** (auto-aprova sem OpenAI key) | ✅ Resolvido (2026-05-29) | `judge_provider.py`: agora **fail-safe** — retorna `WARNING` + `requires_physician_review=True` quando o juiz não pode avaliar |

**Pontos de hardening ainda abertos (HIPAA-adjacente):**
- 🟡 `crypto.ts`: salt fixo (aceitável p/ tokens de sessão, mas documentar) e `extractable: true` na CryptoKey (comentário admite que `false` é mais seguro).
- 🟡 Token de sessão demo permite rodar sem autenticação — bom p/ dev, deve ser bloqueado em produção.
- 🟡 Trilha de auditoria `.jsonl` sem política de retenção/cap de tamanho.
- 🟡 `AUDIT_ENCRYPTION_KEY` agora é setada de forma persistente no Render; em outros ambientes, garantir que seja persistente (chave efêmera = logs não decifráveis após restart).

---

## 2. Performance & Concorrência

| Achado original | Veredito | Observação |
| :--- | :---: | :--- |
| "Re-render: deep clone do state inteiro por token" | ❌ Exagerado | `ai.reducer.ts:UPDATE_STREAMING_MESSAGE` faz **cópia imutável shallow** padrão (spreads + 1 array). Re-render por token é inerente ao streaming. |
| "Buffer concat O(n²) no SSE" | ⚠️ Enganoso | `stream-reader.ts`: o buffer é **truncado** a cada iteração (`lines.pop()`); só a última linha parcial é retida. Não é O(n²) sobre o stream. |
| "feedback: `time.sleep` bloqueia async context" | ❌ Falso | `main.py`: `await asyncio.to_thread(_write_feedback)` — offloaded p/ thread. |
| "Carregamento síncrono de modelos no startup" | 🟡 Verdadeiro (aceitável) | `_load_oral_cancer_artifacts()` é síncrono no lifespan, mas o boot agora **degrada em vez de crashar** e responde 503 até prontidão. |
| **Streaming sem cleanup no unmount** | ✅ Resolvido (2026-05-29) | `useStreaming.ts`: adicionado `useEffect` que aborta o `AbortController` no unmount. |

**Otimizações abertas (baixo/médio ROI):**
- ⚪ Batching de tokens (acumular + `requestAnimationFrame`) reduziria re-renders no streaming — otimização, não bug. Risco em app funcionando: avaliar com profiling real antes.
- 🟡 `inference_client` sem pool size/timeout explícitos configuráveis (há httpx pool no `services/inference_client.py`, mas não parametrizado).

---

## 3. Hidratação / Estado (SSR-CSR)

| Achado original | Veredito | Observação |
| :--- | :---: | :--- |
| "Race condition: save antes do load" | 🟡 Mitigado | `useSessionHydration.ts`: o efeito de save só dispara se `messages.length > 0`, e o load tem guard `isMounted`. A "sobrescrita de sessão vazia" não ocorre. Uma barreira explícita `HydrationStatus=READY` seria um reforço opcional. |
| "Flash of empty state" | ⚪ Não verificado | Carregamento assíncrono pode causar tela vazia momentânea; não medido. |
| "Falta `<Suspense>` / loading declarativo" | ⚪ Não verificado | Observação de UX, não bug. |
| "Prop drilling (Copilot→…→CitationCard)" | ⚪ Não verificado | Observação de design; refator opcional. |

---

## 4. Correções aplicadas nesta auditoria (2026-05-29)

1. **`JudgeProvider` fail-safe** (`src/providers/judge_provider.py`) — sem OpenAI key,
   o juiz não aprova mais silenciosamente; sinaliza `WARNING` + revisão médica
   obrigatória. Crítico após tornar a OpenAI opcional no boot.
2. **Cleanup de streaming** (`frontend/.../hooks/useStreaming.ts`) — aborta inferência
   em voo no unmount, eliminando dispatch-após-unmount.

Ambas verificadas: backend `pytest` 109 passed / 2 xfailed, Ruff limpo; frontend `tsc --noEmit` OK.

---

## 5. Itens já implementados que o relatório antigo listava como "futuro"

A seção 11/12 do relatório anterior descrevia como *roadmap* coisas que **já existem**:

- ✅ **Multi-provider routing** — `src/providers/router.py` (Groq→Gemini + circuit breaker).
- ✅ **Planner layer** — `frontend/.../orchestration/planner/` (intent→tools→DAG).
- ✅ **Human Approval (`WAITING_APPROVAL`)** — `approvalManager.ts` + override engine.
- ✅ **Event sourcing clínico** — `eventBus.ts` + `ClinicalRuntimeEvent` (replay/audit).
- ✅ **Explainability visual** — componentes `rag/`, `intelligence/` (SHAP/confidence/risk).

> Os "scores 9.x/10 / Clinical Operating System" da versão anterior eram
> **autoavaliação aspiracional**, não medição. Removidos para evitar overclaim.
> A maturidade real de cada capacidade está na matriz do [README](./README.md).

---

## 6. Próximos passos de hardening (priorizados, verificados)

**Curto prazo (HIPAA/segurança):**
- [ ] `crypto.ts`: documentar o salt fixo; avaliar `extractable: false`.
- [ ] Bloquear o token de sessão demo em produção (flag de ambiente).
- [ ] Retenção/cap da trilha `.jsonl` (migração p/ Postgres já está no roadmap).

**Médio prazo (qualidade):**
- [ ] Profiling de streaming → decidir sobre batching de tokens com dados reais.
- [ ] Barreira de hidratação explícita (`HydrationStatus`) se a UX exigir.
- [ ] Parametrizar pool/timeout do `inference_client`.

> Documento de auditoria interno — **não é um documento oficial do projeto** e não
> é versionado por padrão.
