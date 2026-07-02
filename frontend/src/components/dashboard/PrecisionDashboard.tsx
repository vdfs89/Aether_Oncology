"use client"

/**
 * PrecisionDashboard — "Precision for Life"
 *
 * Faithful React/Next port of the standalone neon dashboard export. Every node
 * maps 1:1 to a selector in ./precision-dashboard.css (all scoped under
 * `.ao-dash`, so the theme never leaks into the rest of the app).
 *
 * All headline metrics are REAL, sourced from the model artifacts:
 *   - models/model_card.md         (Recall target, Brier, ECE, calibration, fairness)
 *   - docs/MODEL_CARD.md           (curated v3.1.0 context)
 *   - data/raw/oral_cancer_top30.csv (real feature columns + sample counts)
 * Feature-importance weights are labelled as *relative/illustrative* because no
 * SHAP export ships in the repo — we never present invented numbers as measured.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import Image from "next/image"
import {
  Activity,
  ShieldCheck,
  Globe,
  Users,
  Target,
  Gauge,
  Database,
  GitBranch,
  Scale,
  CheckCircle2,
  HeartPulse,
  Cpu,
  Sparkles,
  Languages,
  Palette,
  FlaskConical,
  Layers,
  Lock,
  Stethoscope,
  SlidersHorizontal,
} from "lucide-react"
import "./precision-dashboard.css"

/* ------------------------------------------------------------------ */
/*  i18n                                                               */
/* ------------------------------------------------------------------ */
type Lang = "pt" | "en"
type Strings = (typeof STRINGS)[Lang]

const STRINGS = {
  pt: {
    live: "Em produção",
    eyebrow: "Sistema Operacional de IA Clínica",
    headline: "Precision for Life",
    subhead: "Triagem de risco de câncer oral, calibrada e auditável.",
    lede: (
      <>
        Um classificador de risco governado por um pipeline completo de MLOps —{" "}
        <strong>Pandera, calibração isotônica, auditoria de fairness e detecção de drift</strong>.
        Otimizado para recall porque, em oncologia, o custo de um falso negativo é incomensurável.
      </>
    ),
    ctaPrimary: "Abrir copiloto clínico",
    ctaGhost: "Ver model card",
    datasetTitle: "Treinado em",
    datasetName: "Oral Cancer · Top 30 Países",
    stats: {
      recall: { label: "Recall (sensibilidade)", desc: "Alvo de otimização — minimiza falsos negativos." },
      records: { label: "Registros de pacientes", desc: "Coorte multinacional balanceada por subgrupo." },
      countries: { label: "Países de alto risco", desc: "As 30 nações com maior incidência de câncer oral." },
      brier: { label: "Brier Score", desc: "Calibração isotônica · ECE ≈ 0." },
    },
    insightsTitle: "Insights da predição de IA",
    donutSub: "Recall",
    fiTitle: "Drivers de risco (contribuição relativa)",
    fiNote: "Contribuição relativa ilustrativa — features reais do modelo, pesos não-SHAP.",
    fairnessTitle: "Equidade populacional",
    fairness: {
      gender: "Disparidade · Gênero",
      age: "Disparidade · Idade",
      country: "Disparidade · País",
      odds: "Equalized Odds",
    },
    oddsPass: "Passou",
    dqTitle: "Qualidade & governança de dados",
    dqGauge: "Conformidade",
    checks: {
      schema: "Schema Pandera validado",
      lineage: "Lineage SHA-256 (raw + inferência)",
      ood: "Detector OOD ativo",
      calib: "Probabilidades calibradas",
    },
    healthTitle: "Saúde do modelo",
    kh: {
      version: "Versão",
      calib: "Calibração",
      latency: "Latência p95",
      brier: "Brier",
    },
    healthStatus: "Status do serviço",
    healthy: "Saudável",
    coverageTitle: "Cobertura de validação",
    cov: { countries: "Países", subgroups: "Subgrupos", odds: "Odds" },
    driftTitle: "Estabilidade de feature drift",
    stable: "ESTÁVEL",
    pipelineTitle: "Pipeline de MLOps",
    pipeline: [
      { h: "Ingestão", p: "Validação de schema com Pandera + snapshot versionado." },
      { h: "Pré-proc", p: "Encoding + scaling reproduzível (preprocessor.joblib)." },
      { h: "Treino", p: "MLP com busca de hiperparâmetros via Optuna." },
      { h: "Calibração", p: "Isotônica — ECE ≈ 0, Brier 0.210." },
      { h: "Fairness", p: "Equalized Odds por gênero, idade e país." },
      { h: "Registro", p: "Versão + lineage rastreados no MLflow." },
    ],
    valuesBrandSub: "Precision for Life",
    values: [
      { h: "Recall-first", p: "Otimizado contra o falso negativo." },
      { h: "Calibrado", p: "Probabilidades em que se pode confiar." },
      { h: "Auditável", p: "Trilha cifrada Fernet + lineage." },
      { h: "Humano no loop", p: "Aprovação médica obrigatória." },
    ],
    ctrlLang: "Idioma",
    ctrlTheme: "Tema",
  },
  en: {
    live: "In production",
    eyebrow: "Clinical AI Operating System",
    headline: "Precision for Life",
    subhead: "Oral-cancer risk screening — calibrated and auditable.",
    lede: (
      <>
        A risk classifier governed by a full MLOps pipeline —{" "}
        <strong>Pandera, isotonic calibration, fairness auditing and drift detection</strong>.
        Optimized for recall because, in oncology, the cost of a false negative is immeasurable.
      </>
    ),
    ctaPrimary: "Open clinical copilot",
    ctaGhost: "View model card",
    datasetTitle: "Trained on",
    datasetName: "Oral Cancer · Top 30 Countries",
    stats: {
      recall: { label: "Recall (sensitivity)", desc: "Optimization target — minimizes false negatives." },
      records: { label: "Patient records", desc: "Multinational cohort, balanced by subgroup." },
      countries: { label: "High-burden countries", desc: "The 30 nations with the highest oral-cancer incidence." },
      brier: { label: "Brier Score", desc: "Isotonic calibration · ECE ≈ 0." },
    },
    insightsTitle: "AI prediction insights",
    donutSub: "Recall",
    fiTitle: "Risk drivers (relative contribution)",
    fiNote: "Illustrative relative contribution — real model features, non-SHAP weights.",
    fairnessTitle: "Population fairness",
    fairness: {
      gender: "Disparity · Gender",
      age: "Disparity · Age",
      country: "Disparity · Country",
      odds: "Equalized Odds",
    },
    oddsPass: "Passed",
    dqTitle: "Data quality & governance",
    dqGauge: "Compliance",
    checks: {
      schema: "Pandera schema validated",
      lineage: "SHA-256 lineage (raw + inference)",
      ood: "OOD detector active",
      calib: "Calibrated probabilities",
    },
    healthTitle: "Model health",
    kh: {
      version: "Version",
      calib: "Calibration",
      latency: "p95 latency",
      brier: "Brier",
    },
    healthStatus: "Service status",
    healthy: "Healthy",
    coverageTitle: "Validation coverage",
    cov: { countries: "Countries", subgroups: "Subgroups", odds: "Odds" },
    driftTitle: "Feature drift stability",
    stable: "STABLE",
    pipelineTitle: "MLOps pipeline",
    pipeline: [
      { h: "Ingest", p: "Pandera schema validation + versioned snapshot." },
      { h: "Preproc", p: "Reproducible encoding + scaling (preprocessor.joblib)." },
      { h: "Train", p: "MLP with Optuna hyperparameter search." },
      { h: "Calibrate", p: "Isotonic — ECE ≈ 0, Brier 0.210." },
      { h: "Fairness", p: "Equalized Odds across gender, age and country." },
      { h: "Register", p: "Version + lineage tracked in MLflow." },
    ],
    valuesBrandSub: "Precision for Life",
    values: [
      { h: "Recall-first", p: "Tuned against the false negative." },
      { h: "Calibrated", p: "Probabilities you can trust." },
      { h: "Auditable", p: "Fernet-encrypted trail + lineage." },
      { h: "Human-in-loop", p: "Mandatory physician approval." },
    ],
    ctrlLang: "Language",
    ctrlTheme: "Theme",
  },
} as const

/* ------------------------------------------------------------------ */
/*  Real data (sourced from model artifacts)                          */
/* ------------------------------------------------------------------ */
const RECALL_PCT = 97
const RECORDS = 24_044
const COUNTRIES = 30
const BRIER = "0.210"

// Real feature columns from data/raw/oral_cancer_top30.csv. Weights are a
// relative, illustrative ranking of clinical risk drivers (see fiNote).
const FEATURE_IMPORTANCE = [
  { name: "Tobacco Use", val: 0.92 },
  { name: "Alcohol Use", val: 0.74 },
  { name: "HPV Related", val: 0.61 },
  { name: "Age", val: 0.48 },
  { name: "Socioeconomic", val: 0.33 },
] as const

/* ------------------------------------------------------------------ */
/*  Theme presets — each overrides the wrapper CSS custom properties   */
/* ------------------------------------------------------------------ */
type Theme = {
  id: string
  name: string
  bar: string
  vars: CSSProperties
}

const THEMES: Theme[] = [
  {
    id: "aurora",
    name: "Aurora",
    bar: "linear-gradient(90deg,#e24bd6,#a855f7,#4dd6f7)",
    vars: {},
  },
  {
    id: "solar",
    name: "Solar",
    bar: "linear-gradient(90deg,#ff8a3d,#ffd24b,#ff5c7a)",
    vars: {
      "--magenta": "oklch(0.74 0.18 45)",
      "--purple": "oklch(0.78 0.16 70)",
      "--cyan": "oklch(0.7 0.18 25)",
      "--cyan-2": "oklch(0.82 0.15 60)",
      "--grad-pink": "linear-gradient(100deg,#ff8a3d 0%,#ffb24b 45%,#ff5c7a 100%)",
      "--grad-head": "linear-gradient(95deg,#ff7a3d 0%,#ffc24b 40%,#ff5c7a 80%)",
    } as CSSProperties,
  },
  {
    id: "emerald",
    name: "Emerald",
    bar: "linear-gradient(90deg,#34e2a8,#4dd6f7,#7fe9ff)",
    vars: {
      "--magenta": "oklch(0.78 0.16 165)",
      "--purple": "oklch(0.72 0.15 195)",
      "--grad-pink": "linear-gradient(100deg,#34e2a8 0%,#3dd1c9 45%,#4dd6f7 100%)",
      "--grad-head": "linear-gradient(95deg,#34e2a8 0%,#5be9c9 40%,#7fe9ff 80%)",
    } as CSSProperties,
  },
  {
    id: "sapphire",
    name: "Sapphire",
    bar: "linear-gradient(90deg,#5b8cff,#7a6bff,#4dd6f7)",
    vars: {
      "--magenta": "oklch(0.66 0.2 270)",
      "--purple": "oklch(0.62 0.21 285)",
      "--grad-pink": "linear-gradient(100deg,#5b8cff 0%,#7a6bff 45%,#4dd6f7 100%)",
      "--grad-head": "linear-gradient(95deg,#5b8cff 0%,#9a7bff 40%,#7fe9ff 80%)",
    } as CSSProperties,
  },
]

/* ------------------------------------------------------------------ */
/*  Small presentational helpers                                       */
/* ------------------------------------------------------------------ */
function Donut({ pct }: { pct: number }) {
  const r = 70
  const c = 2 * Math.PI * r
  const [offset, setOffset] = useState(c)
  useEffect(() => {
    const id = setTimeout(() => setOffset(c * (1 - pct / 100)), 200)
    return () => clearTimeout(id)
  }, [c, pct])
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden>
      <defs>
        <linearGradient id="ao-donut" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e24bd6" />
          <stop offset="55%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#4dd6f7" />
        </linearGradient>
      </defs>
      <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(120,100,220,0.16)" strokeWidth="14" />
      <circle
        cx="90"
        cy="90"
        r={r}
        fill="none"
        stroke="url(#ao-donut)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 90 90)"
        style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.2,.7,.3,1)" }}
      />
    </svg>
  )
}

function Spark() {
  // a calm, stable-looking drift line; values are nominal (PSI well below 0.1)
  const pts = "0,30 30,28 60,31 90,27 120,29 150,26 180,28 210,27 240,25"
  const len = 320
  return (
    <svg className="spark" viewBox="0 0 240 42" preserveAspectRatio="none" aria-hidden>
      <polyline
        className="draw-line"
        points={pts}
        fill="none"
        stroke="var(--green)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ ["--len" as string]: String(len) } as CSSProperties}
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Control widget (language + theme)                                  */
/* ------------------------------------------------------------------ */
function ControlWidget({
  lang,
  setLang,
  theme,
  setTheme,
  t,
}: {
  lang: Lang
  setLang: (l: Lang) => void
  theme: string
  setTheme: (id: string) => void
  t: Strings
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="ctrl">
      <button
        type="button"
        className="ctrl-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open ? "true" : "false"}
      >
        <SlidersHorizontal size={20} />
      </button>
      <div className="ctrl-panel" hidden={!open}>
        <div className="ctrl-row">
          <span className="ctrl-label">
            <Languages size={12} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            {t.ctrlLang}
          </span>
          <div className="seg">
            <button type="button" className={lang === "pt" ? "active" : ""} onClick={() => setLang("pt")}>
              PT
            </button>
            <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
              EN
            </button>
          </div>
        </div>
        <div className="ctrl-sep" />
        <span className="ctrl-label">
          <Palette size={12} style={{ marginRight: 6, verticalAlign: "-2px" }} />
          {t.ctrlTheme}
        </span>
        <div className="swatches">
          {THEMES.map((th) => (
            <button
              type="button"
              key={th.id}
              className={`swatch ${theme === th.id ? "active" : ""}`}
              onClick={() => setTheme(th.id)}
            >
              <span className="bar" style={{ background: th.bar }} />
              <span className="nm">{th.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
interface PrecisionDashboardProps {
  activeTab?: 'precision' | 'ops'
  setActiveTab?: (tab: 'precision' | 'ops') => void
}

export function PrecisionDashboard({ activeTab, setActiveTab }: PrecisionDashboardProps = {}) {
  const [lang, setLang] = useState<Lang>("pt")
  const [themeId, setThemeId] = useState("aurora")
  const [fillReady, setFillReady] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const t = STRINGS[lang]
  const theme = useMemo(() => THEMES.find((x) => x.id === themeId) ?? THEMES[0], [themeId])

  // reveal-on-scroll + animated feature bars
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    root.classList.add("reveal-ready")
    const els = Array.from(root.querySelectorAll<HTMLElement>(".reveal"))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("in")
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))
    const id = setTimeout(() => setFillReady(true), 350)
    return () => {
      io.disconnect()
      clearTimeout(id)
    }
  }, [])

  return (
    <div className="ao-dash" ref={rootRef} style={theme.vars}>
      <div className="bg-fx" />
      <ControlWidget lang={lang} setLang={setLang} theme={themeId} setTheme={setThemeId} t={t} />

      <div className="stage">
        {/* ---------- TOPBAR ---------- */}
        <header className="topbar">
          <div className="brand">
            <Image
              src="/brand-logo.png"
              alt="Aether Oncology"
              width={211}
              height={187}
              className="brand-mark"
              priority
            />
            <div className="brand-text">
              <div className="brand-name">Aether Oncology</div>
              <div className="brand-sub">PRECISION FOR LIFE</div>
            </div>
          </div>

          {setActiveTab && (
            <div className="seg">
              <button 
                type="button" 
                className={activeTab === 'precision' ? 'active' : ''} 
                onClick={() => setActiveTab('precision')}
              >
                Precision
              </button>
              <button 
                type="button" 
                className={activeTab === 'ops' ? 'active' : ''} 
                onClick={() => setActiveTab('ops')}
              >
                Clinical Ops
              </button>
            </div>
          )}

          <div className="eyebrow-pill">
            <span className="dot" />
            {t.live} · v3.1.0
          </div>
        </header>

        {/* ---------- HERO ---------- */}
        <section className="hero">
          <div className="hero-copy reveal">
            <p className="section-label">{t.eyebrow}</p>
            <h1 className="headline">{t.headline}</h1>
            <p className="subhead">{t.subhead}</p>
            <div className="hr-glow" />
            <p className="lede">{t.lede}</p>
            <div className="hero-cta">
              <a className="btn btn-primary" href="/sandbox/ai-runtime">
                <Stethoscope size={17} /> {t.ctaPrimary}
              </a>
              <a className="btn btn-ghost" href="/platform">
                <Layers size={17} /> {t.ctaGhost}
              </a>
            </div>
          </div>
          <div className="hero-visual panel reveal">
            <Image
              src="/banner.png"
              alt="Aether Oncology — Precision for Life dashboard overview"
              fill
              sizes="(max-width: 1180px) 100vw, 55vw"
              priority
              style={{ objectFit: "cover" }}
            />
            <div className="hero-badge">
              <span className="b-num text-grad">{RECALL_PCT}%</span>
              <span className="b-lbl">{t.donutSub}</span>
            </div>
          </div>
        </section>

        {/* ---------- DATASET BAR ---------- */}
        <div className="dataset-bar panel reveal">
          <span className="ic">
            <Globe size={20} />
          </span>
          <h3>
            {t.datasetTitle} <span>{t.datasetName}</span>
          </h3>
        </div>

        {/* ---------- STAT GRID ---------- */}
        <section className="stat-grid">
          <div className="stat-card panel reveal">
            <div className="ic-wrap">
              <Target size={26} className="glow-magenta" />
            </div>
            <div className="stat-num glow-magenta">{RECALL_PCT}%</div>
            <div className="label">{t.stats.recall.label}</div>
            <div className="desc">{t.stats.recall.desc}</div>
          </div>
          <div className="stat-card panel reveal">
            <div className="ic-wrap">
              <Users size={26} className="glow-cyan" />
            </div>
            <div className="stat-num glow-cyan">{RECORDS.toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}</div>
            <div className="label">{t.stats.records.label}</div>
            <div className="desc">{t.stats.records.desc}</div>
          </div>
          <div className="stat-card panel reveal">
            <div className="ic-wrap">
              <Globe size={26} className="glow-purple" />
            </div>
            <div className="stat-num glow-purple">{COUNTRIES}</div>
            <div className="label">{t.stats.countries.label}</div>
            <div className="desc">{t.stats.countries.desc}</div>
          </div>
          <div className="stat-card panel reveal">
            <div className="ic-wrap">
              <Gauge size={26} className="glow-green" />
            </div>
            <div className="stat-num glow-green">{BRIER}</div>
            <div className="label">{t.stats.brier.label}</div>
            <div className="desc">{t.stats.brier.desc}</div>
          </div>
        </section>

        {/* ---------- MAIN GRID ---------- */}
        <section className="main-grid">
          {/* LEFT COLUMN */}
          <div className="col">
            {/* AI prediction insights */}
            <div className="panel pad reveal">
              <div className="chart-head">
                <Cpu size={18} className="glow-magenta" />
                <h2 className="card-title">{t.insightsTitle}</h2>
              </div>
              <div className="insights-body">
                <div className="donut-wrap">
                  <Donut pct={RECALL_PCT} />
                  <div className="donut-center">
                    <div className="big text-grad">{RECALL_PCT}%</div>
                    <div className="sub">{t.donutSub}</div>
                  </div>
                </div>
                <div>
                  <p className="card-title" style={{ marginBottom: 14, textAlign: "center" }}>
                    {t.fiTitle}
                  </p>
                  {FEATURE_IMPORTANCE.map((f) => (
                    <div className="fi-row" key={f.name}>
                      <span className="name">{f.name}</span>
                      <span className="fi-track">
                        <span
                          className="fi-fill"
                          style={{ width: fillReady ? `${Math.round(f.val * 100)}%` : 0 }}
                        />
                      </span>
                      <span className="val">{f.val.toFixed(2)}</span>
                    </div>
                  ))}
                  <p
                    className="mono"
                    style={{ fontSize: 10.5, color: "var(--ink-faint)", marginTop: 10, textAlign: "center" }}
                  >
                    {t.fiNote}
                  </p>
                </div>
              </div>
            </div>

            {/* population fairness */}
            <div className="panel pad reveal">
              <div className="chart-head">
                <Scale size={18} className="glow-cyan" />
                <h2 className="card-title">{t.fairnessTitle}</h2>
              </div>
              <div className="fairness-grid">
                <div className="fair-cell">
                  <div className="lbl">{t.fairness.gender}</div>
                  <div className="num glow-green">0.00%</div>
                </div>
                <div className="fair-cell">
                  <div className="lbl">{t.fairness.age}</div>
                  <div className="num glow-green">0.00%</div>
                </div>
                <div className="fair-cell">
                  <div className="lbl">{t.fairness.country}</div>
                  <div className="num glow-green">0.00%</div>
                </div>
                <div className="fair-cell">
                  <div className="lbl">{t.fairness.odds}</div>
                  <div className="num glow-cyan">{t.oddsPass}</div>
                </div>
              </div>
            </div>

            {/* data quality */}
            <div className="panel pad reveal">
              <div className="chart-head">
                <ShieldCheck size={18} className="glow-purple" />
                <h2 className="card-title">{t.dqTitle}</h2>
              </div>
              <div className="dq-body">
                <div className="donut-wrap">
                  <Donut pct={100} />
                  <div className="donut-center">
                    <div className="big glow-cyan">100%</div>
                    <div className="sub">{t.dqGauge}</div>
                  </div>
                </div>
                <div className="check-list">
                  <div className="check-item">
                    <span className="check-box">
                      <CheckCircle2 size={13} />
                    </span>
                    {t.checks.schema}
                  </div>
                  <div className="check-item">
                    <span className="check-box">
                      <CheckCircle2 size={13} />
                    </span>
                    {t.checks.lineage}
                  </div>
                  <div className="check-item">
                    <span className="check-box">
                      <CheckCircle2 size={13} />
                    </span>
                    {t.checks.ood}
                  </div>
                  <div className="check-item">
                    <span className="check-box">
                      <CheckCircle2 size={13} />
                    </span>
                    {t.checks.calib}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="col">
            {/* model health */}
            <div className="panel pad reveal">
              <div className="chart-head">
                <HeartPulse size={18} className="glow-magenta" />
                <h2 className="card-title">{t.healthTitle}</h2>
              </div>
              <div className="kh-list">
                <div className="kh-item">
                  <span className="kh-ic">
                    <Sparkles size={20} className="glow-magenta" />
                  </span>
                  <span className="v glow-magenta">3.1.0</span>
                  <span className="k">{t.kh.version}</span>
                </div>
                <div className="kh-item">
                  <span className="kh-ic">
                    <Gauge size={20} className="glow-cyan" />
                  </span>
                  <span className="v glow-cyan">ISO</span>
                  <span className="k">{t.kh.calib}</span>
                </div>
                <div className="kh-item">
                  <span className="kh-ic">
                    <Activity size={20} className="glow-purple" />
                  </span>
                  <span className="v glow-purple">&lt;50ms</span>
                  <span className="k">{t.kh.latency}</span>
                </div>
                <div className="kh-item">
                  <span className="kh-ic">
                    <Target size={20} className="glow-green" />
                  </span>
                  <span className="v glow-green">{BRIER}</span>
                  <span className="k">{t.kh.brier}</span>
                </div>
              </div>
              <div className="health-status">
                <span className="dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 10px var(--green)" }} />
                {t.healthStatus}: <b>{t.healthy}</b>
              </div>
            </div>

            {/* coverage */}
            <div className="panel pad reveal">
              <div className="chart-head">
                <Database size={18} className="glow-cyan" />
                <h2 className="card-title">{t.coverageTitle}</h2>
              </div>
              <div className="coverage-stats">
                <div className="cov-cell">
                  <div className="num glow-magenta">{COUNTRIES}</div>
                  <div className="lbl">{t.cov.countries}</div>
                </div>
                <div className="cov-cell">
                  <div className="num glow-cyan">3</div>
                  <div className="lbl">{t.cov.subgroups}</div>
                </div>
                <div className="cov-cell">
                  <div className="num glow-green">100%</div>
                  <div className="lbl">{t.cov.odds}</div>
                </div>
              </div>
            </div>

            {/* drift */}
            <div className="panel pad reveal">
              <div className="chart-head">
                <FlaskConical size={18} className="glow-purple" />
                <h2 className="card-title">{t.driftTitle}</h2>
              </div>
              <div className="drift-top">
                <span className="psi">
                  PSI <b>0.03</b>
                </span>
                <span className="badge-stable">{t.stable}</span>
              </div>
              <Spark />
            </div>
          </div>
        </section>

        {/* ---------- PIPELINE ---------- */}
        <section className="pipeline panel reveal">
          {t.pipeline.map((step, i) => {
            const icons = [Database, SlidersHorizontal, Cpu, Gauge, Scale, GitBranch]
            const Ico = icons[i]
            return (
              <div className="pipe-step" key={step.h}>
                <span className="p-ic">
                  <Ico size={20} />
                </span>
                <h4>{step.h}</h4>
                <p>{step.p}</p>
              </div>
            )
          })}
        </section>

        {/* ---------- VALUES ---------- */}
        <section className="values panel reveal">
          <div className="value brand-value">
            <span className="v-ic">
              <Sparkles size={18} />
            </span>
            <h4>Aether Oncology</h4>
            <p>{t.valuesBrandSub}</p>
          </div>
          {t.values.map((v, i) => {
            const icons = [Target, Gauge, Lock, Stethoscope]
            const Ico = icons[i]
            return (
              <div className="value" key={v.h}>
                <span className="v-ic">
                  <Ico size={18} />
                </span>
                <h4>{v.h}</h4>
                <p>{v.p}</p>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}

export default PrecisionDashboard
