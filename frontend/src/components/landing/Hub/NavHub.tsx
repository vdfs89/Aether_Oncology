import Link from "next/link"
import { Terminal, FileText, GitBranch, Cpu, BarChart3, Brain, BookOpen } from "lucide-react"
import { INTERNAL_LINKS, EXTERNAL_LINKS, type NavLink } from "@/config/navigation"

type IconType = React.ComponentType<{ size?: number; className?: string }>

const find = (title: string): NavLink =>
  [...INTERNAL_LINKS, ...EXTERNAL_LINKS].find((l) => l.title === title)!

// Todos os destinos — MESMA família de card (uniformes). Ícone por destino;
// acento único (cyan) para consistência visual.
const ITEMS: { link: NavLink; icon: IconType }[] = [
  { link: find("Portal"), icon: Terminal },
  { link: find("Model Card"), icon: FileText },
  { link: find("GitHub"), icon: GitBranch },
  { link: find("Platform"), icon: Cpu },
  { link: find("Dashboard"), icon: BarChart3 },
  { link: find("AI Sandbox"), icon: Brain },
  { link: find("API Docs"), icon: BookOpen },
]

const ACCENT = "#00E5FF"

function HubCard({ link, icon: Icon }: { link: NavLink; icon: IconType }) {
  const cardClass =
    "group relative flex flex-col gap-3 p-5 rounded-2xl border border-[rgba(255,255,255,0.08)] " +
    "bg-[rgba(255,255,255,0.03)] backdrop-blur-sm transition-all duration-300 h-full " +
    "hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.05)] hover:border-[var(--acc)] " +
    "hover:shadow-[0_14px_44px_-14px_var(--acc)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
  const style = { ["--acc"]: ACCENT } as React.CSSProperties

  const inner = (
    <>
      <div className="flex items-center gap-2.5">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0"
          style={{ background: `${ACCENT}14`, borderColor: `${ACCENT}33`, color: ACCENT }}
        >
          <Icon size={18} />
        </span>
        <span className="text-[0.95rem] font-bold text-white">{link.title}</span>
        {link.badge && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
            style={{ background: `${ACCENT}1f`, borderColor: `${ACCENT}40`, color: ACCENT }}
          >
            {link.badge}
          </span>
        )}
        {link.external && (
          <span
            className="ml-auto text-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ color: ACCENT }}
          >
            ↗
          </span>
        )}
      </div>
      <p className="text-xs text-[rgba(255,255,255,0.6)] leading-relaxed">{link.desc}</p>
    </>
  )

  return link.external ? (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={cardClass} style={style}>
      {inner}
    </a>
  ) : (
    <Link href={link.href} className={cardClass} style={style}>
      {inner}
    </Link>
  )
}

export function NavHub() {
  return (
    <section className="section" aria-label="Acesso rápido às páginas do projeto">
      <div className="container-premium max-w-5xl mx-auto px-4">
        <div className="section-header">
          <div className="eyebrow">Explore o projeto</div>
          <h2 className="section-h2">Tudo num só lugar</h2>
          <p className="section-sub">
            Protótipo acadêmico (FIAP Tech Challenge) — navegue pelas páginas, pela demo de
            inferência real e pelo código.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ITEMS.map((it) => (
            <HubCard key={it.link.href} {...it} />
          ))}
        </div>
      </div>
    </section>
  )
}
