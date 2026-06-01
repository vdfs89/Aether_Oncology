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
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.5, ease: "easeOut" as const },
  }),
}

const GITHUB_DOC =
  "https://github.com/vitordiogofs/Aether-Oncology/blob/main/docs/MODEL_CARD.md"

/* ──────────────────────────── data ─────────────────────────────── */

const HEADER_STATS = [
  { value: "≈97%", label: "Recall (alvo)" },
  { value: "3.1.0", label: "Versão" },
  { value: "ISOTONIC", label: "Calibração" },
  { value: "production", label: "Stage" },
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

const CALIB_ROWS: [string, string, string][] = [
  ["Método selecionado", "ISOTONIC", "—"],
  ["Brier Score", "0.210", "menor é melhor"],
  ["Expected Calibration Error (ECE)", "≈ 3.84e-08", "10 bins"],
  ["Maximum Calibration Error (MCE)", "≈ 4.94e-08", "10 bins"],
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

const LIMITATIONS = [
  "Não diagnóstico — apenas apoio à triagem; não substitui biópsia ou histologia.",
  "Exclusão pediátrica — não validado para menores de 18 anos.",
  "Imunocomprometidos — não validado para pós-transplante / imunossupressão.",
  "Variância geográfica — validado nos 30 países de maior incidência.",
  "OOD — entradas fora da distribuição podem ser sinalizadas, mas não bloqueadas.",
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

function SectionShell({
  icon: Icon,
  n,
  title,
  children,
  i = 0,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  n: string
  title: string
  children: React.ReactNode
  i?: number
}) {
  return (
    <motion.section
      custom={i}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeUp}
      className="max-w-4xl mx-auto px-4 py-10 border-t border-[rgba(255,255,255,0.06)]"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[rgba(0,229,255,0.08)] border border-[rgba(0,229,255,0.2)] flex items-center justify-center flex-shrink-0">
          <Icon size={20} className="text-[var(--cyan)]" />
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[rgba(255,255,255,0.4)]">
            Seção {n}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
        </div>
      </div>
      {children}
    </motion.section>
  )
}

function KVTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
      {rows.map(([k, v], idx) => (
        <div
          key={k}
          className={`grid grid-cols-1 md:grid-cols-[200px_1fr] gap-1 md:gap-4 px-4 py-3 text-sm ${
            idx % 2 ? "bg-[rgba(255,255,255,0.02)]" : ""
          }`}
        >
          <div className="font-semibold text-[rgba(255,255,255,0.85)]">{k}</div>
          <div className="text-[rgba(255,255,255,0.6)] leading-relaxed">{v}</div>
        </div>
      ))}
    </div>
  )
}

/* ──────────────────────────── page ─────────────────────────────── */

export default function ModelCardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-white">
      {/* ═══ HERO ════════════════════════════════════════════════ */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="absolute inset-0 ambient" aria-hidden="true">
          <div className="mesh-blob mesh-blob--1" />
          <div className="mesh-blob mesh-blob--3" />
        </div>

        <div className="container-premium relative z-10 text-center max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-xs text-[rgba(255,255,255,0.5)] hover:text-white transition-colors mb-6"
            >
              <ArrowLeft size={14} /> Voltar à plataforma
            </Link>

            <div className="hero-badge mx-auto mb-6">
              <span className="hero-badge__dot" aria-hidden="true" />
              Model Card &middot; v3.1.0 &middot; production
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
              Aether Oncology —{" "}
              <span className="bg-gradient-to-r from-[var(--cyan)] to-[var(--magenta)] bg-clip-text text-transparent">
                Oral Cancer High-Risk Classifier
              </span>
            </h1>

            <p className="mt-6 text-sm md:text-base text-[rgba(255,255,255,0.65)] max-w-2xl mx-auto leading-relaxed">
              Modelo de triagem de risco de câncer oral (Inicial vs. Avançado),
              otimizado para <strong className="text-white">Recall</strong> e governado por um
              pipeline completo de MLOps. <strong className="text-white">Não é diagnóstico</strong> —
              apoio à decisão com supervisão médica obrigatória.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
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
            className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {HEADER_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[var(--cyan)] to-white bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-[10px] text-[rgba(255,255,255,0.5)] mt-1 uppercase tracking-wider font-medium">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ SEÇÕES ══════════════════════════════════════════════ */}
      <div className="pb-12">
        <SectionShell icon={Brain} n="1" title="Detalhes do Modelo" i={0}>
          <KVTable rows={DETAILS} />
          <p className="text-xs text-[rgba(255,255,255,0.45)] mt-4 leading-relaxed">
            A fonte da verdade gerada automaticamente (hashes de lineage, métricas de
            calibração, fairness por subgrupo) vive em{" "}
            <code className="text-[var(--cyan)]">models/model_card.md</code>, produzida pelo
            gerador a cada treino. Esta é a versão curada e contextualizada.
          </p>
        </SectionShell>

        <SectionShell icon={Target} n="2" title="Uso Pretendido" i={1}>
          <ul className="space-y-3 text-sm text-[rgba(255,255,255,0.7)] leading-relaxed">
            <li>
              <strong className="text-white">Público-alvo:</strong> oncologistas e cirurgiões de cabeça e pescoço.
            </li>
            <li>
              <strong className="text-white">Uso primário:</strong> CDSS para triagem de risco,
              classificando perfis em Estágio Inicial (Early) vs. Avançado (Moderate/Late).
            </li>
            <li>
              <strong className="text-white">Custo do erro:</strong> em oncologia o custo de um
              Falso Negativo é incomensuravelmente maior que o de um Falso Positivo — daí a
              calibração deliberada para Recall ≈ 97%.
            </li>
            <li>
              <strong className="text-white">Fora de escopo:</strong> não diagnostica
              autonomamente, não substitui biópsia/histologia, não prescreve terapias.
            </li>
          </ul>
        </SectionShell>

        <SectionShell icon={Database} n="3" title="Dados de Treinamento & Features" i={2}>
          <KVTable rows={DATA_ROWS} />
          <p className="text-xs text-[rgba(255,255,255,0.45)] mt-4 leading-relaxed">
            Governança aplicada no treino: contratos Pandera distintos para treino/inferência,
            regras de coerência clínica (OK/WARNING/HIGH/CRITICAL), auditoria de vazamento
            (Pearson |r|&gt;0,95, MI&gt;0,95, permutação&gt;0,45), detecção OOD (Isolation Forest)
            e snapshots imutáveis indexados por SHA-256.
          </p>
        </SectionShell>

        <SectionShell icon={Gauge} n="4" title="Calibração" i={3}>
          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_140px] gap-4 px-4 py-3 text-[11px] uppercase tracking-wider font-semibold text-[rgba(255,255,255,0.5)] bg-[rgba(255,255,255,0.03)]">
              <div>Métrica</div>
              <div>Valor</div>
              <div>Método</div>
            </div>
            {CALIB_ROWS.map(([m, v, meth], idx) => (
              <div
                key={m}
                className={`grid grid-cols-[1fr_120px_140px] gap-4 px-4 py-3 text-sm ${
                  idx % 2 ? "bg-[rgba(255,255,255,0.02)]" : ""
                }`}
              >
                <div className="text-[rgba(255,255,255,0.8)]">{m}</div>
                <div className="font-mono text-[var(--cyan)]">{v}</div>
                <div className="text-[rgba(255,255,255,0.5)]">{meth}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-[rgba(255,255,255,0.45)] mt-4">
            O modelo seleciona automaticamente o melhor método (Platt vs. Isotônica) por Brier score.
          </p>
        </SectionShell>

        <SectionShell icon={Scale} n="5" title="Auditoria de Fairness (Equalized Odds)" i={4}>
          <p className="text-sm text-[rgba(255,255,255,0.7)] leading-relaxed mb-5">
            A auditoria computa Recall / FPR / FNR / Brier por subgrupo de Gênero, faixa etária e
            País (30 países), com threshold de disparidade de 15%.
          </p>
          <div className="rounded-xl border border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.06)] p-5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
              <AlertTriangle size={16} /> Nota de integridade (transparência obrigatória)
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.75)] leading-relaxed">
              O relatório de fairness versionado reporta <strong>Recall 100% e FPR 100%</strong> em
              todos os subgrupos simultaneamente — matematicamente inconsistente com um holdout
              clínico real (compatível apenas com limiar degenerado ou conjunto sintético).
            </p>
            <p className="text-sm text-[rgba(255,255,255,0.75)] leading-relaxed mt-3">
              <strong className="text-white">Interpretação honesta:</strong> a infraestrutura de
              auditoria é de nível de produção e funcional; os números reportados são{" "}
              <strong>provisórios</strong> e não devem ser citados como evidência de equidade clínica
              até validação sobre dados reais rotulados (roadmap: Fairlearn).
            </p>
          </div>
        </SectionShell>

        <SectionShell icon={Microscope} n="6" title="Explicabilidade (XAI) & RAG" i={5}>
          <ul className="space-y-3 text-sm text-[rgba(255,255,255,0.7)] leading-relaxed">
            <li>
              <strong className="text-white">Interpretabilidade:</strong> atribuição via Integrated
              Gradients sobre o modelo local; o portal exibe o &ldquo;gatilho decisório&rdquo; em gráfico radar.
              <em className="text-[rgba(255,255,255,0.5)]"> (implementado; atribuição em produção em validação.)</em>
            </li>
            <li>
              <strong className="text-white">RAG:</strong> busca de evidência em PubMed (Entrez),
              Cochrane e Semantic Scholar, com circuit breaker por provedor, dedup por URL e cache 24h.
              <em className="text-[rgba(255,255,255,0.5)]"> (vector store semântico atualmente stub → fallback ao vivo.)</em>
            </li>
          </ul>
        </SectionShell>

        <SectionShell icon={AlertTriangle} n="7" title="Limitações & Contraindicações" i={6}>
          <ul className="space-y-2.5">
            {LIMITATIONS.map((l) => (
              <li key={l} className="flex gap-3 text-sm text-[rgba(255,255,255,0.7)] leading-relaxed">
                <span className="text-amber-400 mt-0.5 flex-shrink-0">▸</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </SectionShell>

        <SectionShell icon={ShieldCheck} n="8" title="Governança, Compliance & Ambiente" i={7}>
          <KVTable rows={GOVERNANCE} />
        </SectionShell>

        <SectionShell icon={BookOpen} n="9" title="Referências Técnicas" i={8}>
          <ol className="space-y-2.5 list-decimal list-inside">
            {REFERENCES.map((r) => (
              <li key={r} className="text-sm text-[rgba(255,255,255,0.65)] leading-relaxed">
                {r}
              </li>
            ))}
          </ol>
          <p className="text-xs text-[rgba(255,255,255,0.4)] mt-8 italic text-center">
            Aether Oncology — Medicina é Arte, Ciência é a Ferramenta.
          </p>
        </SectionShell>
      </div>

      <Footer />
    </div>
  )
}
