# 🔍 Relatório de Auditoria de Código — Aether Oncology
**Auditor:** Senior Staff Engineer / MLOps Architect  
**Data:** 2026-05-11  
**Fase:** Code Freeze — Tech Challenge FIAP Fase 01  
**Commit auditado:** `c6540c1` → `d142dcf`

---

## SUMÁRIO EXECUTIVO

| Severidade | Total | Corrigido neste PR |
|------------|-------|-------------------|
| P0 — Crítico | 3 | 3 ✅ |
| P1 — Médio | 5 | 5 ✅ |
| P2 — Melhoria | 2 | 2 ✅ |

---

## P0 — CRÍTICO (crash em produção / vulnerabilidade de segurança)

### P0-1 · `showToast` lança `TypeError` em toda predição  
**Arquivo:** `src/static/aether-oncology-portal/js/ui.js:88`  
**Impacto:** A função `showToast()` é chamada após cada predição. O `toast.querySelector('.toast-close')` retorna `null` porque o template HTML não contém nenhum elemento com essa classe. O código tenta chamar `.onclick` em `null` → `TypeError` silencioso no console, botão de fechar nunca funciona.

```js
// ANTES (quebrado)
toast.innerHTML = `
    <span class="flex-shrink-0">${icons[type]}</span>
    <p class="text-sm font-medium">${message}</p>
`;
// ...
toast.querySelector('.toast-close').onclick = dismiss;  // ← NPE garantido
```

```js
// DEPOIS (corrigido)
toast.innerHTML = `
    <span class="flex-shrink-0">${icons[type]}</span>
    <p class="text-sm font-medium">${escapeHtml(message)}</p>
    <button class="toast-close ml-auto opacity-50 hover:opacity-100 transition-opacity text-lg leading-none">&times;</button>
`;
// ...
toast.querySelector('.toast-close').onclick = dismiss;  // ← agora funciona
```

---

### P0-2 · XSS via `innerHTML` com dados não sanitizados de APIs externas  
**Arquivo:** `src/static/aether-oncology-portal/js/ui.js:293-330, 356-372`  
**Impacto:** `article.title`, `article.tldr`, `article.abstract` e `article.source` são injetados diretamente via template literal em `innerHTML`. Dados vêm do PubMed/Semantic Scholar via HTTP. Um título de artigo contendo `<img src=x onerror=alert(1)>` executaria JavaScript no contexto do portal clínico — impacto crítico em ambiente médico.

```js
// ANTES (XSS)
medicoArticles.innerHTML = result.articles.map(article => `
    <h5>${article.title}</h5>
    <p>${article.tldr || article.abstract || 'Sem resumo.'}</p>
    <span>${article.source}</span>
`).join('');
```

```js
// DEPOIS (corrigido — escapeHtml + safeUrl)
function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&').replace(/</g, '<')
        .replace(/>/g, '>').replace(/"/g, '"')
        .replace(/'/g, '&#039;');
}
function safeUrl(url) {
    if (!url) return '#';
    const lower = url.toLowerCase().trim();
    return (lower.startsWith('https://') || lower.startsWith('http://')) ? url : '#';
}
```

---

### P0-3 · API Key hardcoded no bundle JavaScript  
**Arquivo:** `src/static/aether-oncology-portal/js/api.js:15`  
**Impacto:** `TOKEN: 'aether-oncology-eval-2026'` é compilado no bundle Vite e visível em qualquer `network tab` do browser. Expõe a chave de autenticação da API pública.

```js
// ANTES
TOKEN: 'aether-oncology-eval-2026',
```
```js
// DEPOIS (via Vite env var com fallback de dev)
TOKEN: import.meta.env.VITE_API_TOKEN ?? 'aether-oncology-eval-2026',
```

---

## P1 — MÉDIO (degradação silenciosa / falhas intermitentes)

### P1-1 · I/O síncrono e bloqueante dentro de rotas `async def`  
**Arquivo:** `src/main.py:497` e `src/main.py:547`  
**Impacto:** `log_prediction()` e `open(AUDIT_FILE, "a")` fazem I/O de disco síncrono chamados diretamente dentro de `async def make_prediction()` e `async def clinical_feedback()`. Isso bloqueia o event loop do uvicorn inteiro durante a escrita, aumentando P99 latência sob carga.

```python
# ANTES
log_prediction(features.model_dump(), result)  # síncrono dentro de async def
```
```python
# DEPOIS
import asyncio
await asyncio.to_thread(log_prediction, features.model_dump(), result)
```

---

### P1-2 · `float('nan')` e `float('inf')` passam pela validação Pydantic  
**Arquivo:** `src/services/predictor.py:166`  
**Impacto:** Pydantic aceita `float('nan')` e `float('inf')` como valores `float` válidos. Após `StandardScaler.transform()`, um NaN se propaga silenciosamente até o tensor: `sigmoid(NaN) = NaN → int(NaN >= 0.5) = 0` → predição sempre `Benigno` sem qualquer erro ou log. **Falso negativo clínico silencioso.**

```python
# DEPOIS (adicionar após transform)
if np.isnan(processed_data).any() or np.isinf(processed_data).any():
    raise ValueError(
        "Dados de entrada contêm NaN ou Inf após normalização. "
        "Verifique os valores informados."
    )
```

---

### P1-3 · Integrated Gradients: alpha começa em 0.1 (bias sistemático) + gradientes de modelo não limpos  
**Arquivo:** `src/services/predictor.py:80,94-98`  
**Impacto A:** `torch.linspace(0.1, 1.0, steps)` ignora o segmento [0, 0.1] do path integral, introduzindo bias sistemático nas atribuições. A feature "dominante" pode estar errada para samples com valores próximos do baseline.  
**Impacto B:** Após o loop de IG, os parâmetros do modelo acumulam gradientes da última iteração (nunca limpos após o loop). Sob múltiplas requisições, isso cresce monotonicamente até o GC — memory leak em CPU.

```python
# ANTES
alphas = torch.linspace(0.1, 1.0, steps)  # ← bias: ignora [0, 0.1]
# ... fim do loop, gradientes do modelo não limpos
```
```python
# DEPOIS
alphas = torch.linspace(0, 1, steps + 1)[1:]  # ← path completo, exclui baseline
# ... fim do loop:
model.zero_grad()  # ← limpa gradientes dos parâmetros do modelo
```

---

### P1-4 · Timestamps mistos no audit trail quebram `renderMLOps`  
**Arquivo:** `src/main.py:541`, `src/static/aether-oncology-portal/js/ui.js:368`  
**Impacto:** `log_prediction()` em `audit.py` usa `datetime.now().isoformat()` (string ISO). Mas `clinical_feedback()` em `main.py:541` usa `time.time()` (float Unix). Quando o frontend faz `log.timestamp.split('T')` e `timestamp` é um `float`, lança `TypeError: log.timestamp.split is not a function`, quebrando o painel MLOps silenciosamente.

```python
# ANTES (main.py clinical_feedback)
"timestamp": time.time(),  # float
```
```python
# DEPOIS
from datetime import datetime
"timestamp": datetime.now().isoformat(),  # string ISO, compatível com renderMLOps
```

---

### P1-5 · `_LazyPredictor._get_instance()` não é thread-safe com `asyncio.to_thread`  
**Arquivo:** `src/services/predictor.py:274-277`  
**Impacto:** O padrão check-then-act em `_get_instance()` não é protegido. Se `predict()` for chamado concorrentemente via `asyncio.to_thread` (por workers da thread pool do uvicorn), dois threads podem observar `self._instance is None` simultaneamente, instanciar dois `PredictorService` distintos e chamar `load_resources()` duas vezes — desperdiçando memória e gerando estado incoerente.

```python
# DEPOIS (adicionar asyncio.Lock)
import asyncio
class _LazyPredictor:
    def __init__(self) -> None:
        self._instance = None
        self._lock = asyncio.Lock()

    async def _get_instance(self) -> PredictorService:  # agora async
        if self._instance is None:
            async with self._lock:
                if self._instance is None:  # double-checked locking
                    svc = PredictorService()
                    svc.load_resources()
                    self._instance = svc
        return self._instance
```

---

## P2 — MELHORIA (qualidade, manutenibilidade)

### P2-1 · Fonte Cochrane sobrescrita após deduplicação  
**Arquivo:** `src/services/research.py:333`  
**Impacto:** `art["source"] = "Cochrane"` é aplicado DEPOIS do dedup por URL. Artigos que passaram pelo dedup já têm `source: "PubMed"`. Artigos Cochrane que chegam duplicados são descartados sem atualizar o source do artigo já existente em `results`.

```python
# DEPOIS — mover a sobrescrita para _search_cochrane em vez de cá
def _search_cochrane(query: str, max_results: int = 3) -> list[dict]:
    articles = _search_pubmed(query=query, max_results=max_results,
                              journal_filter="Cochrane Database Syst Rev")
    for art in articles:
        art["source"] = "Cochrane"  # ← definir na fonte, não no chamador
    return articles
```

### P2-2 · `XAI top_feature` retorna `"unknown"` quando model é None mas sem log diferenciado  
**Arquivo:** `src/services/predictor.py:229`  
**Impacto:** Quando o modelo local não está carregado (fallback remoto sem proxy), `top_feature = "unknown"` é retornado silenciosamente, fazendo o RAG buscar evidências genéricas sem indicar ao operador que o XAI falhou. Deve ser logado como warning para monitoramento.

```python
# DEPOIS
if not self.model:
    logger.warning("XAI indisponível: modelo local não carregado. top_feature=unknown.")
    top_feature = "unknown"
else:
    # ... cálculo IG normal
```
