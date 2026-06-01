"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/Button"
import { Footer } from "@/components/landing/Footer/Footer"
import {
  Activity,
  Brain,
  BarChart3,
  Shield,
  Terminal,
  Microscope,
  Cpu,
  FileText,
  Lock,
  Zap,
  GitBranch,
  Search,
} from "lucide-react"

/* ──────────────────────────── helpers ──────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: "easeOut" as const },
  }),
}

/* ──────────────────────────── data ─────────────────────────────── */

const MODULES = [
  {
    icon: Brain,
    title: "Clinical Inference Engine",
    desc: "Rede neural Bayesiana MLP v3.1 com calibração Platt e detecção OOD. Predição de risco de câncer oral com recall > 95% e fairness auditada.",
    color: "magenta" as const,
    badge: "CORE ML",
  },
  {
    icon: BarChart3,
    title: "Precision Dashboard",
    desc: "Painel interativo de métricas: ROC, calibração, fairness por subgrupo, data drift e cobertura de confiança. Visibilidade clínica em tempo real.",
    color: "cyan" as const,
    badge: "ANALYTICS",
    href: "/dashboard",
  },
  {
    icon: Terminal,
    title: "AI Runtime Sandbox",
    desc: "Copilot clínico com streaming SSE, pipeline de estados, telemetria de eventos e timeline de runtime. Teste interativo do motor de inferência.",
    color: "cyan" as const,
    badge: "INTERACTIVE",
    href: "/sandbox/ai-runtime",
  },
  {
    icon: Search,
    title: "RAG Científico",
    desc: "Busca vetorial em PubMed, ClinVar e NCCN Guidelines. Citações auditáveis com score de relevância para fundamentar cada decisão clínica.",
    color: "magenta" as const,
    badge: "RETRIEVAL",
  },
  {
    icon: Shield,
    title: "Governança & Aprovação",
    desc: "Workflow de aprovação médica com timeout configurável, override com audit trail, e sessão de médico autenticado. HIPAA-ready.",
    color: "cyan" as const,
    badge: "GOVERNANCE",
  },
  {
    icon: Microscope,
    title: "Explainable AI (XAI)",
    desc: "Valores SHAP por feature, counterfactuals e atribuição de contribuição. Cada predição é auditável e explicável para o oncologista.",
    color: "magenta" as const,
    badge: "XAI",
  },
]

const ARCH_LAYERS = [
  {
    icon: Zap,
    label: "Frontend Next.js",
    detail: "SSR + Client Components, Vercel Edge",
    color: "text-cyan-400",
  },
  {
    icon: GitBranch,
    label: "Clinical Event Bus",
    detail: "Pub/Sub tipado, state machine, telemetria",
    color: "text-purple-400",
  },
  {
    icon: Cpu,
    label: "FastAPI Runtime",
    detail: "SSE streaming, CORS, health checks, auth",
    color: "text-emerald-400",
  },
  {
    icon: Brain,
    label: "ML Pipeline",
    detail: "PyTorch MLP + Calibrator + OOD Detector",
    color: "text-pink-400",
  },
  {
    icon: FileText,
    label: "Audit & Compliance",
    detail: "MongoDB audit trail, HIPAA, LGPD",
    color: "text-amber-400",
  },
  {
    icon: Lock,
    label: "Security Layer",
    detail: "API Key auth, CSP, encryption at rest",
    color: "text-red-400",
  },
]

const STATS = [
  { value: "95.2%", label: "Recall Clínico" },
  { value: "3.1.0", label: "Model Version" },
  { value: "<200ms", label: "Latência p95" },
  { value: "SOC 2", label: "Compliance" },
]

/* ──────────────────────────── component ────────────────────────── */

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-white">
      {/* ═══ HERO ════════════════════════════════════════════════ */}
      <section className="relative min-h-[70vh] flex items-center justify-center pt-28 pb-20 overflow-hidden">
        {/* Ambient */}
        <div className="absolute inset-0 ambient" aria-hidden="true">
          <div className="mesh-blob mesh-blob--1" />
          <div className="mesh-blob mesh-blob--3" />
        </div>

        <div className="container-premium relative z-10 text-center max-w-4xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="hero-badge mx-auto mb-6">
              <span className="hero-badge__dot" aria-hidden="true" />
              Clinical AI Platform &middot; v3.1.0
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1]">
              A plataforma completa para{" "}
              <span className="bg-gradient-to-r from-[var(--cyan)] to-[var(--magenta)] bg-clip-text text-transparent">
                oncologia de precisão
              </span>
            </h1>

            <p className="mt-6 text-base md:text-lg text-[rgba(255,255,255,0.65)] max-w-2xl mx-auto leading-relaxed">
              Do dado genômico à decisão clínica — inferência ML explicável,
              governança médica, RAG científico e dashboard de precisão.
              Tudo em uma arquitetura auditável e pronta para produção.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/dashboard">Abrir Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link href="/sandbox/ai-runtime">Testar AI Runtime</Link>
              </Button>
            </div>
          </motion.div>

          {/* Stats bar */}
          <motion.div
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-[var(--cyan)] to-white bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-xs text-[rgba(255,255,255,0.5)] mt-1 uppercase tracking-wider font-medium">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ MÓDULOS ═════════════════════════════════════════════ */}
      <section className="section py-24" aria-label="Módulos da Plataforma">
        <div className="container-premium px-4">
          <div className="section-header text-center mb-16">
            <div className="eyebrow">Módulos</div>
            <h2 className="section-h2">
              Cada camada projetada para<br />
              <span className="text-[var(--cyan)]">decisões clínicas confiáveis.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {MODULES.map((mod, i) => {
              const Icon = mod.icon
              const isMagenta = mod.color === "magenta"
              const accent = isMagenta ? "#FF4FD8" : "#00E5FF"
              const accentBg = isMagenta
                ? "rgba(255,79,216,0.08)"
                : "rgba(0,229,255,0.08)"
              const accentBorder = isMagenta
                ? "rgba(255,79,216,0.2)"
                : "rgba(0,229,255,0.2)"

              const Card = (
                <motion.article
                  key={mod.title}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={fadeUp}
                  className="group p-6 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[280px] hover:border-[rgba(255,255,255,0.12)] transition-colors duration-300"
                >
                  <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
                      >
                        <Icon size={20} color={accent} />
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border"
                        style={{
                          color: accent,
                          borderColor: accentBorder,
                          background: accentBg,
                        }}
                      >
                        {mod.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {mod.title}
                      </h3>
                      <p className="text-xs text-[rgba(255,255,255,0.6)] mt-1.5 leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>
                  </div>

                  {mod.href && (
                    <div className="relative z-10 mt-4 flex items-center gap-1.5 text-xs font-semibold group-hover:gap-2.5 transition-all duration-300" style={{ color: accent }}>
                      <span>Acessar módulo</span>
                      <Activity size={14} />
                    </div>
                  )}
                </motion.article>
              )

              return mod.href ? (
                <Link key={mod.title} href={mod.href} className="block">
                  {Card}
                </Link>
              ) : (
                Card
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ ARQUITETURA ═════════════════════════════════════════ */}
      <section className="py-24 border-t border-[rgba(255,255,255,0.04)]" aria-label="Arquitetura">
        <div className="container-premium px-4 max-w-5xl mx-auto">
          <div className="section-header text-center mb-16">
            <div className="eyebrow">Arquitetura</div>
            <h2 className="section-h2">
              Stack verticalmente integrada.
            </h2>
            <p className="text-sm text-[rgba(255,255,255,0.5)] mt-4 max-w-xl mx-auto">
              Do frontend ao modelo ML, cada camada é observável, auditável e projetada para compliance clínico.
            </p>
          </div>

          <div className="space-y-4">
            {ARCH_LAYERS.map((layer, i) => {
              const Icon = layer.icon
              return (
                <motion.div
                  key={layer.label}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  className="flex items-center gap-5 p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl hover:border-[rgba(255,255,255,0.1)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-[rgba(255,255,255,0.04)] flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className={layer.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white">{layer.label}</div>
                    <div className="text-xs text-[rgba(255,255,255,0.5)]">{layer.detail}</div>
                  </div>
                  <div className="text-[10px] font-mono text-[rgba(255,255,255,0.3)] uppercase tracking-widest flex-shrink-0">
                    Layer {i + 1}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══ CTA FINAL ═══════════════════════════════════════════ */}
      <section className="py-24 border-t border-[rgba(255,255,255,0.04)]">
        <div className="container-premium px-4 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Pronto para explorar?
          </h2>
          <p className="mt-4 text-[rgba(255,255,255,0.6)] text-sm md:text-base">
            Acesse o dashboard de precisão para métricas em tempo real ou teste o motor de inferência clínica no sandbox interativo.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link href="/dashboard">Precision Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href="/sandbox/ai-runtime">AI Runtime Sandbox</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
