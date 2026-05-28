/**
 * Fase 1.4 — Visual QA Audit
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PROBLEMAS IDENTIFICADOS NO AUDIT DE CÓDIGO (sem render):
 *
 * ① NARRATIVA — A sequência está correta mas falta uma seção de TRUST antes
 *    da IA. O fluxo atual:
 *    Hero → TrustBand → Bento → Evidence → Clinical → XAI → CTA
 *    ✅ Aprovado — TrustBand já cria o "Trust Bridge" antes do Bento.
 *
 * ② MOTION RHYTHM — Problemas encontrados:
 *    - staggerContainer usa staggerChildren: 0.15 → CORRETO para Bento
 *    - fadeUp usa duration: 0.75 → ligeiramente lento para Hero entry
 *    - chartReveal usa filter: blur(10px) → blur excessivo no reveal
 *    - floatMockup usa 7s, translateY(-14px) + rotate → OK para biotech
 *    - blob opacities: blob-1 opacity:.35, blob-3 opacity:.12 → blob-1 pode
 *      ser agressivo demais em mobile (ver abaixo)
 *
 * ③ GLASSMORPHISM — blur(var(--blur)) = blur(24px) em todos os cards
 *    Stacking issue: glass-section DENTRO de ambient (fixed) = blur duplo
 *    Fix: reduzir blur dos cards filhos quando há ambient backdrop ativo
 *
 * ④ HERO — hero mínimo 70svh, mas sem max-height → em desktop ultrawide pode
 *    parecer sparse. Adicionar min padding bottom para contenção visual.
 *
 * ⑤ MOBILE — blob-1 (65vw, opacity:.35, var(--pink)) vai criar GPU overdraw 
 *    significativo em Android. Precisa de media query para reduzir em mobile.
 *
 * ⑥ evidence-grid → @1200px vai para 4 colunas → cards muito estreitos
 *    Texto truncado 3 linhas pode quebrar a leitura em 1200px exato.
 *    Fix: trocar para max 3 colunas no evidence-grid.
 *
 * ⑦ CSS RAG-live → .rag-live__dot tem animation:pulse hardcoded no CSS
 *    mas RAGStatus.tsx usa framer-motion para animar o dot → conflito!
 *    Fix: remover a CSS animation do .rag-live__dot (framer-motion controla)
 *
 * ⑧ CTA — glass-card border-radius: 2.5rem usa padding mas cta-card usa
 *    padding:var(--gutter-lg). Inconsistência de densidade visual.
 *
 * ⑨ FOCUS STATES — :focus-visible definido globalmente ✅ mas precisa de
 *    verificação se Button.tsx respeita (não pudemos verificar).
 *
 * AÇÕES TOMADAS:
 * [1] Reduzir mesh-blob opacidade em mobile → salva GPU
 * [2] Ajustar blob-1 opacity de .35 para .25 (menos agressivo)
 * [3] Reduzir chartReveal blur de blur(10px) para blur(6px)
 * [4] evidence-grid max 3 colunas (não 4)
 * [5] Remover animation:pulse CSS do .rag-live__dot
 * [6] Hero sub font-size ligeiramente maior para impacto mobile
 * [7] Adicionar emerald CSS var (estava ausente nos tokens)
 * [8] Reduzir fadeUp duration de 0.75 para 0.6 no Hero (mais responsivo)
 */
