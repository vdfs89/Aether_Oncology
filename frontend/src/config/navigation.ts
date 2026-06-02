/**
 * config/navigation.ts
 * Single source of truth para a navegação do site.
 * Apenas rotas REAIS (páginas existentes) e links externos REAIS — sem rotas
 * "em breve"/stub (que gerariam 404 ou teatro de produto).
 */

export type NavLink = {
  title: string
  href: string
  external?: boolean
  badge?: string
  desc?: string
}

// Rotas internas reais (Next.js app router).
export const INTERNAL_LINKS: NavLink[] = [
  { title: "Home", href: "/", desc: "Visão geral do protótipo." },
  { title: "Platform", href: "/platform", desc: "Módulos e arquitetura do sistema." },
  { title: "Dashboard", href: "/dashboard", desc: "Métricas reais do modelo (benchmark)." },
  { title: "Model Card", href: "/model-card", desc: "Limitações, vieses e o null result." },
  { title: "AI Sandbox", href: "/sandbox/ai-runtime", badge: "demo", desc: "Copiloto clínico — runtime interativo." },
]

// Links externos reais (servidos pela API / GitHub).
export const EXTERNAL_LINKS: NavLink[] = [
  { title: "Portal", href: "https://api.vitorsilva.engineer/portal.html", external: true, badge: "demo", desc: "Terminal de triagem — inferência real /predict." },
  { title: "API Docs", href: "https://api.vitorsilva.engineer/docs", external: true, desc: "OpenAPI / Swagger da API FastAPI." },
  { title: "GitHub", href: "https://github.com/vdfs89/Aether_Oncology", external: true, desc: "Código-fonte (MIT)." },
]

// Itens do header (ordem de exibição).
export const HEADER_LINKS: NavLink[] = [...INTERNAL_LINKS, ...EXTERNAL_LINKS]
