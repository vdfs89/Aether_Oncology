import Link from "next/link"
import { Terminal, FileText, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { INTERNAL_LINKS, EXTERNAL_LINKS, type NavLink } from "@/config/navigation"

type IconType = React.ComponentType<{ size?: number; className?: string }>

// Ações primárias em destaque — ícone + acento por card.
const PRIMARY: { link: NavLink; icon: IconType; accent: string }[] = [
  { link: EXTERNAL_LINKS.find((l) => l.title === "Portal")!, icon: Terminal, accent: "#00E5FF" },
  { link: INTERNAL_LINKS.find((l) => l.title === "Model Card")!, icon: FileText, accent: "#FF4FD8" },
  { link: EXTERNAL_LINKS.find((l) => l.title === "GitHub")!, icon: GitBranch, accent: "#A78BFA" },
]

// Secundárias agrupadas (família de pílulas via Button ghost).
const SECONDARY: NavLink[] = [
  INTERNAL_LINKS.find((l) => l.title === "Platform")!,
  INTERNAL_LINKS.find((l) => l.title === "Dashboard")!,
  INTERNAL_LINKS.find((l) => l.title === "AI Sandbox")!,
  EXTERNAL_LINKS.find((l) => l.title === "API Docs")!,
]

function PrimaryCard({ link, icon: Icon, accent }: { link: NavLink; icon: IconType; accent: string }) {
  const cardClass =
    "group relative flex flex-col gap-3 p-5 rounded-2xl border border-[rgba(255,255,255,0.08)] " +
    "bg-[rgba(255,255,255,0.03)] backdrop-blur-sm transition-all duration-300 " +
    "hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.05)] hover:border-[var(--acc)] " +
    "hover:shadow-[0_14px_44px_-14px_var(--acc)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
  const style = { ["--acc"]: accent } as React.CSSProperties

  const inner = (
    <>
      <div className="flex items-center gap-2.5">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 transition-colors"
          style={{ background: `${accent}14`, borderColor: `${accent}33`, color: accent }}
        >
          <Icon size={18} />
        </span>
        <span className="text-[0.95rem] font-bold text-white">{link.title}</span>
        {link.badge && (
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
            style={{ background: `${accent}1f`, borderColor: `${accent}40`, color: accent }}
          >
            {link.badge}
          </span>
        )}
        {link.external && (
          <span className="ml-auto text-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: accent }}>
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

        {/* Primárias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {PRIMARY.map((p) => (
            <PrimaryCard key={p.link.href} {...p} />
          ))}
        </div>

        {/* Secundárias — família de pílulas */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SECONDARY.map((l) => (
            <Button key={l.href} asChild variant="ghost" size="sm">
              {l.external ? (
                <a href={l.href} target="_blank" rel="noopener noreferrer">
                  {l.title}
                  {l.badge ? ` · ${l.badge}` : ""} ↗
                </a>
              ) : (
                <Link href={l.href}>
                  {l.title}
                  {l.badge ? ` · ${l.badge}` : ""}
                </Link>
              )}
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
