import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { INTERNAL_LINKS, EXTERNAL_LINKS, type NavLink } from "@/config/navigation"

// Ações primárias em destaque (subconjunto curado dos links reais).
const PRIMARY: NavLink[] = [
  EXTERNAL_LINKS.find((l) => l.title === "Portal")!,
  INTERNAL_LINKS.find((l) => l.title === "Model Card")!,
  EXTERNAL_LINKS.find((l) => l.title === "GitHub")!,
]

// Secundárias agrupadas.
const SECONDARY: NavLink[] = [
  INTERNAL_LINKS.find((l) => l.title === "Platform")!,
  INTERNAL_LINKS.find((l) => l.title === "Dashboard")!,
  INTERNAL_LINKS.find((l) => l.title === "AI Sandbox")!,
  EXTERNAL_LINKS.find((l) => l.title === "API Docs")!,
]

function linkProps(l: NavLink) {
  return l.external
    ? { href: l.href, target: "_blank", rel: "noopener noreferrer" }
    : { href: l.href }
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {PRIMARY.map((l) => {
            const cardClass =
              "group p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)] hover:border-[rgba(0,229,255,0.3)] transition-colors flex flex-col gap-2"
            const inner = (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{l.title}</span>
                  {l.badge && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[rgba(0,229,255,0.12)] text-[var(--cyan)] border border-[rgba(0,229,255,0.25)]">
                      {l.badge}
                    </span>
                  )}
                  {l.external && <span className="text-[var(--cyan)] text-sm">↗</span>}
                </div>
                <p className="text-xs text-[rgba(255,255,255,0.6)] leading-relaxed">{l.desc}</p>
              </>
            )
            return l.external ? (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={cardClass}>
                {inner}
              </a>
            ) : (
              <Link key={l.href} href={l.href} className={cardClass}>
                {inner}
              </Link>
            )
          })}
        </div>

        {/* Secundárias */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {SECONDARY.map((l) => (
            <Button key={l.href} asChild variant="ghost" size="sm">
              {l.external ? (
                <a {...linkProps(l)}>
                  {l.title} {l.badge ? `· ${l.badge}` : ""} ↗
                </a>
              ) : (
                <Link href={l.href}>
                  {l.title} {l.badge ? `· ${l.badge}` : ""}
                </Link>
              )}
            </Button>
          ))}
        </div>
      </div>
    </section>
  )
}
