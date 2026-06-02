"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { Footer } from "@/components/landing/Footer/Footer"
import {
  Brain,
  Target,
  Database,
  Gauge,
  Scale,
  Microscope,
  AlertTriangle,
  ShieldCheck,
  BookOpen,
  ExternalLink,
  ArrowLeft,
} from "lucide-react"

/* ──────────────────────────── helpers ──────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const },
  },
}

const GITHUB_DOC =
  "https://github.com/vdfs89/Aether_Oncology/blob/main/docs/MODEL_CARD.md"

/* ──────────────────────────── data ─────────────────────────────── */

const HEADER_STATS = [
  { value: "≈0.50", label: "ROC-AUC (CV k=5)" },
  { value: "≈0.45", label: "Recall @0.5 (CV)" },
  { value: "3.1.0", label: "Versão" },
  { value: "protótipo", label: "Stage" },
]

const DETAILS: [string, string][] = [
  ["Desenvolvedor", "Vitor Diogo Fonseca da Silva — FIAP Pós-Tech (Tech Challenge 01)"],
  ["Tipo", "MLP — classificação binária probabilística calibrada"],
  ["Arquitetura", "Input → [128, 64, 32] → 1 logit · BatchNorm · ReLU · Dropout(0.3)"],
  ["Treino", "BCEWithLogitsLoss(pos_weight) · early stopping (patience=10) · HPO Optuna (TPE)"],
  ["Frameworks", "PyTorch · scikit-learn · Pandera (data contract)"],
  ["Registro MLflow", "AetherOncologyOralCancerHighRisk"],
  ["Artefatos", "aether_mlp_v2.pth · preprocessor.joblib · calibrator.joblib · ood_detector.joblib"],
  ["Licença", "MIT"],
]

const DATA_ROWS: [string, string][] = [
  ["Dataset", "Oral Cancer Top 30 Countries (MIT)"],
  ["Alvo", "high_risk = Diagnosis_Stage ∈ {Moderate, Late}"],
  ["Features brutas (8)", "Age, Survival_Rate, Tobacco_Use, Alcohol_Use, Country, Gender, Socioeconomic_Status, Treatment_Type"],
  ["Derivadas", "risk_index (tabaco+álcool+HPV), age_bucket, high_incidence_country"],
  ["Pré-proc", "ClinicalFeatureExtractor → StandardScaler + OneHotEncoder"],
  ["Split", "Temporal/sequencial por ID — 70% / 15% / 15%"],
  ["Fontes clínicas", "WHO · NCCN · SEER · IARC"],
]

const CALIB_METRICS = [
  { value: "ISOTONIC", label: "Método selecionado" },
  { value: "0.210", label: "Brier Score" },
  { value: "≈3.84e-8", label: "ECE (10 bins)" },
  { value: "≈4.94e-8", label: "MCE (10 bins)" },
]

const INTENDED: [string, string][] = [
  ["Público-alvo (persona)", "oncologistas e cirurgiões de cabeça e pescoço — cenário hipotético do exercício."],
  ["Uso primário (simulado)", "CDSS para triagem de risco — Estágio Inicial (Early) vs. Avançado (Moderate/Late)."],
  ["Custo do erro", "o custo de um Falso Negativo é incomensuravelmente maior que o de um Falso Positivo — por isso o objetivo de projeto priorizou Recall. Porém, o benchmark reprodutível (k=5) mostra ROC-AUC ≈ 0,50: o modelo não supera a taxa-base (ver §7)."],
  ["Fora de escopo (real)", "não é dispositivo médico, não foi validado clinicamente, não diagnostica autonomamente e não deve tocar decisões sobre pacientes reais."],
]

const XAI: [string, string][] = [
  ["Interpretabilidade", "atribuição via Integrated Gradients sobre o modelo local; o portal exibe o gatilho decisório em gráfico radar. (Implementado; atribuição em produção em validação.)"],
  ["RAG", "busca de evidência em PubMed (Entrez), Cochrane e Semantic Scholar, com circuit breaker por provedor, dedup por URL e cache 24h. (Vector store semântico stub → fallback ao vivo.)"],
]

const GOVERNANCE: [string, string][] = [
  ["HIPAA / LGPD", "Trilha de auditoria Fernet (AES-128-CBC + HMAC); IndexedDB cifrado (PBKDF2 + AES-GCM-256); scrubber de PHI."],
  ["FDA SaMD", "Classe II (apoio à decisão); model cards + lineage SHA-256 + replay event-sourced."],
  ["EU AI Act", "Alto Risco (Anexo III) com supervisão humana integrada."],
  ["Rastreabilidade", "Middleware X-Request-ID ligando request → audit trail → logs."],
  ["Drift", "KS-Test / PSI / JS divergence; gatilho global quando >33% das features sofrem drift."],
  ["Resiliência", "Circuit breakers em PubMed/Scholar/HF e na cadeia LLM (Groq → Gemini)."],
  ["Green AI", "Otimizado para CPU; rastreamento de energia/CO₂ por inferência."],
]

const LIMITATIONS: [string, string][] = [
  ["Dataset sintético", "Treinado sobre o Oral Cancer Top 30 Countries (MIT, ~160k registros), de origem sintética/gerada. Boas métricas indicam aderência ao gerador de dados, não capacidade preditiva real."],
  ["Métricas infladas por construção", "Um dataset sintético pode ser trivialmente separável. Sempre comparar contra DummyClassifier e baselines lineares — métricas quase perfeitas são artefato do dado."],
  ["Escopo de features reduzido", "Apenas 6 fatores demográficos/comportamentais. Sem exames, imagem, histopatologia ou biomarcadores — insuficiente para juízo de risco individual."],
  ["Ausência de validação", "Sem validação externa, validação clínica ou calibração em população real. As probabilidades não representam risco absoluto."],
]

const BIASES: [string, string][] = [
  ["Viés por país (country)", "Atribui risco diferente a indivíduos idênticos só pela nacionalidade — tratamento desigual inaceitável para decisão individual. Não generaliza fora dos 30 países."],
  ["Viés socioeconômico (socioeconomic_status)", "Faz o risco variar pela faixa socioeconômica, podendo codificar desigualdade estrutural e penalizar grupos vulneráveis."],
  ["Viés de representação", "Sintético e restrito a 30 países; não representa a diversidade real (etnia, acesso à saúde, hábitos regionais)."],
]

const FAILURES: [string, string][] = [
  ["Decisão clínica individual", "Triar/diagnosticar/priorizar um paciente real — principal cenário de falha; o modelo não tem base para isso."],
  ["Entrada fora da distribuição", "Idades extremas, país não listado ou combinações raras produzem predições não confiáveis."],
  ["Drift de distribuição", "Dados reais divergiriam da sintética desde o dia 1; o modelo degradaria imediatamente em produção real."],
  ["Interpretação indevida da probabilidade", "Tratar o percentual como certeza diagnóstica — erro de uso previsível e perigoso."],
]

const MITIGATIONS = [
  "Manter o enquadramento de protótipo / demonstração de engenharia, com disclaimer visível.",
  "Antes de qualquer uso real: recoletar dados clínicos reais, validação externa, calibração e auditoria de fairness por subgrupo.",
  "Reavaliar features sensíveis — idealmente remover country e socioeconomic_status como drivers individuais.",
  "Implementar monitoramento de drift (PSI/KS) e um playbook de resposta a dados fora do treino.",
]

const REFERENCES = [
  "GLOBOCAN / IARC. Global Cancer Observatory — Lip & Oral Cavity Cancer.",
  "NCCN. Clinical Practice Guidelines in Oncology — Head and Neck Cancers.",
  "Sundararajan, Taly & Yan (2017). Axiomatic Attribution for Deep Networks (Integrated Gradients). ICML.",
  "Guo et al. (2017). On Calibration of Modern Neural Networks. ICML.",
  "Hardt, Price & Srebro (2016). Equality of Opportunity in Supervised Learning. NeurIPS.",
  "Pandera Documentation. Data Contracts and Validation Patterns for ML.",
]

/* ──────────────────────────── primitives ──────────────────────── */

type IconType = React.ComponentType<{ size?: number; className?: string }>

function Panel({
  icon: Icon,
  n,
  title,
  children,
}: {
  icon: IconType
  n: string
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={fadeUp}
      className="rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] p-7 md:p-10"
    >
      <header className="flex flex-col items-center text-center gap-3 pb-6 mb-7 border-b border-[rgba(255,255,255,0.07)]">
        <div className="w-11 h-11 rounded-xl bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.22)] flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-[var(--cyan)]" />
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[rgba(255,255,255,0.4)] mb-1">
            {n} / 09
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-white leading-tight">
            {title}
          </h2>
        </div>
      </header>
      {children}
    </motion.section>
  )
}

function SubGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-7 first:mt-0">
      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--cyan)] text-center mb-2">
        {label}
      </div>
      {children}
    </div>
  )
}

function DefList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-[rgba(255,255,255,0.06)]">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex flex-col items-center text-center gap-1.5 py-4 first:pt-0 last:pb-0"
        >
          <dt className="text-sm font-semibold text-[rgba(255,255,255,0.9)]">{k}</dt>
          <dd className="text-sm text-[rgba(255,255,255,0.62)] leading-relaxed max-w-2xl mx-auto">
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/* ──────────────────────────── page ─────────────────────────────── */

export default function ModelCardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-white">
      <div className="ambient" aria-hidden="true">
        <div className="mesh-blob mesh-blob--1" />
        <div className="mesh-blob mesh-blob--3" />
      </div>

      {/* ═══ HERO ════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-20">
        <div className="container-premium relative z-10 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.5)] hover:text-white transition-colors mb-8"
            >
              <ArrowLeft size={14} /> Voltar à plataforma
            </Link>

            <div className="hero-badge mx-auto">
              <span className="hero-badge__dot" aria-hidden="true" />
              Model Card &middot; v3.1.0 &middot; production
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.08] mt-2">
              Oral Cancer{" "}
              <span className="bg-gradient-to-r from-[var(--cyan)] to-[var(--magenta)] bg-clip-text text-transparent">
                High-Risk Classifier
              </span>
            </h1>

            <p className="mt-7 text-base md:text-lg text-[rgba(255,255,255,0.65)] leading-relaxed">
              Modelo de triagem de risco de câncer oral (Inicial vs. Avançado),
              otimizado para <strong className="text-white">Recall</strong> e governado por um
              pipeline completo de MLOps. <strong className="text-white">Não é diagnóstico</strong> —
              apoio à decisão com supervisão médica obrigatória.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <a href={GITHUB_DOC} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} className="mr-2" /> Ver doc completo
                </a>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/dashboard">Métricas no dashboard</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {HEADER_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[var(--cyan)] to-white bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-[10px] text-[rgba(255,255,255,0.5)] mt-1.5 uppercase tracking-wider font-medium">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ CONTEÚDO ════════════════════════════════════════════ */}
      <section className="section pt-0">
        <div className="container-premium max-w-4xl mx-auto">
          <div className="section-header">
            <div className="eyebrow">Documentação</div>
            <h2 className="section-h2">Especificação completa do modelo</h2>
            <p className="section-sub">
              Transparência clínica de ponta a ponta — da arquitetura à fairness,
              limitações e compliance.
            </p>
          </div>

          <div className="space-y-6">
            {/* 1 */}
            <Panel icon={Brain} n="01" title="Detalhes do Modelo">
              <DefList rows={DETAILS} />
              <p className="text-xs text-[rgba(255,255,255,0.42)] mt-6 leading-relaxed text-center max-w-2xl mx-auto">
                A fonte da verdade gerada automaticamente (hashes de lineage, métricas de
                calibração, fairness por subgrupo) vive em{" "}
                <code className="text-[var(--cyan)] font-mono">models/model_card.md</code>,
                produzida a cada treino. Esta é a versão curada e contextualizada.
              </p>
            </Panel>

            {/* 2 */}
            <Panel icon={Target} n="02" title="Uso Pretendido">
              <div className="rounded-xl border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.05)] p-5 mb-6 text-center max-w-2xl mx-auto">
                <p className="text-sm text-[rgba(255,255,255,0.78)] leading-relaxed">
                  <strong className="text-[var(--cyan)]">Enquadramento real:</strong> protótipo
                  acadêmico (Tech Challenge FIAP) — demonstração de pipeline de ML end-to-end,{" "}
                  <strong>não</strong> um produto clínico. A narrativa de CDSS abaixo é a{" "}
                  <strong>persona/cenário hipotético</strong> do exercício, não uma reivindicação
                  de uso clínico real.
                </p>
              </div>
              <DefList rows={INTENDED} />
            </Panel>

            {/* 3 */}
            <Panel icon={Database} n="03" title="Dados de Treinamento & Features">
              <DefList rows={DATA_ROWS} />
              <p className="text-xs text-[rgba(255,255,255,0.42)] mt-6 leading-relaxed text-center max-w-2xl mx-auto">
                Governança no treino: contratos Pandera distintos para treino/inferência,
                regras de coerência clínica (OK/WARNING/HIGH/CRITICAL), auditoria de vazamento
                (Pearson |r|&gt;0,95, MI&gt;0,95, permutação&gt;0,45), detecção OOD (Isolation
                Forest) e snapshots imutáveis indexados por SHA-256.
              </p>
            </Panel>

            {/* 4 */}
            <Panel icon={Gauge} n="04" title="Calibração">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CALIB_METRICS.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-4 py-5 text-center"
                  >
                    <div className="text-lg md:text-xl font-bold font-mono text-[var(--cyan)] leading-none">
                      {m.value}
                    </div>
                    <div className="text-[10px] text-[rgba(255,255,255,0.5)] mt-2 uppercase tracking-wide leading-tight">
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[rgba(255,255,255,0.42)] mt-6 text-center max-w-2xl mx-auto">
                O modelo seleciona automaticamente o melhor método (Platt vs. Isotônica) por
                Brier score — menor é melhor.
              </p>
            </Panel>

            {/* 5 */}
            <Panel icon={Scale} n="05" title="Auditoria de Fairness (Equalized Odds)">
              <p className="text-sm text-[rgba(255,255,255,0.68)] leading-relaxed mb-6 text-center max-w-2xl mx-auto">
                A auditoria computa Recall / FPR / FNR / Brier por subgrupo de Gênero, faixa
                etária e País (30 países), com threshold de disparidade de 15%.
              </p>
              <div className="rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)] p-6 text-center">
                <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm mb-3">
                  <AlertTriangle size={16} /> Nota de integridade (transparência obrigatória)
                </div>
                <p className="text-sm text-[rgba(255,255,255,0.75)] leading-relaxed">
                  O relatório de fairness versionado reporta{" "}
                  <strong>Recall 100% e FPR 100%</strong> em todos os subgrupos simultaneamente —
                  matematicamente inconsistente com um holdout clínico real (compatível apenas
                  com limiar degenerado ou conjunto sintético).
                </p>
                <p className="text-sm text-[rgba(255,255,255,0.75)] leading-relaxed mt-3">
                  <strong className="text-white">Interpretação honesta:</strong> a infraestrutura
                  de auditoria é de nível de produção e funcional; os números reportados são{" "}
                  <strong>provisórios</strong> e não devem ser citados como evidência de equidade
                  clínica até validação sobre dados reais rotulados (roadmap: Fairlearn).
                </p>
              </div>
            </Panel>

            {/* 6 */}
            <Panel icon={Microscope} n="06" title="Explicabilidade (XAI) & RAG">
              <DefList rows={XAI} />
            </Panel>

            {/* 7 */}
            <Panel icon={AlertTriangle} n="07" title="Limitações, Vieses & Cenários de Falha">
              <SubGroup label="Limitações">
                <DefList rows={LIMITATIONS} />
              </SubGroup>

              <SubGroup label="Vieses identificados">
                <DefList rows={BIASES} />
              </SubGroup>

              <SubGroup label="Tratamento de vazamento (data leakage)">
                <p className="text-sm text-[rgba(255,255,255,0.68)] leading-relaxed text-center max-w-2xl mx-auto">
                  <code className="text-[var(--cyan)] font-mono">treatment_type</code> e{" "}
                  <code className="text-[var(--cyan)] font-mono">survival_rate</code> são{" "}
                  <strong>consequências do diagnóstico</strong>, não preditores — foram excluídas
                  da inferência. No servidor recebem valores neutros default; o portal de triagem
                  documenta a exclusão ao usuário.
                </p>
              </SubGroup>

              <SubGroup label="Cenários de falha">
                <DefList rows={FAILURES} />
              </SubGroup>

              <SubGroup label="Mitigações & recomendações">
                <ul className="space-y-3 max-w-2xl mx-auto">
                  {MITIGATIONS.map((m) => (
                    <li
                      key={m}
                      className="flex justify-center items-start gap-2.5 text-sm text-[rgba(255,255,255,0.68)] leading-relaxed text-center"
                    >
                      <span className="text-[#21e6b6] mt-0.5 flex-shrink-0">▸</span>
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </SubGroup>
            </Panel>

            {/* 8 */}
            <Panel icon={ShieldCheck} n="08" title="Governança, Compliance & Ambiente">
              <DefList rows={GOVERNANCE} />
            </Panel>

            {/* 9 */}
            <Panel icon={BookOpen} n="09" title="Referências Técnicas">
              <ol className="space-y-3 list-decimal list-inside marker:text-[rgba(255,255,255,0.35)] text-center max-w-2xl mx-auto">
                {REFERENCES.map((r) => (
                  <li
                    key={r}
                    className="text-sm text-[rgba(255,255,255,0.62)] leading-relaxed"
                  >
                    {r}
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <p className="text-xs text-[rgba(255,255,255,0.4)] mt-12 italic text-center">
            Aether Oncology — Medicina é Arte, Ciência é a Ferramenta.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
