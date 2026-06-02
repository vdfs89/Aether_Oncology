"use client"

import { useState } from "react"
import Link from "next/link"
import { INTERNAL_LINKS, EXTERNAL_LINKS, type NavLink } from "@/config/navigation"

function ExternalArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="inline-block ml-0.5 opacity-60">
      <path d="M3 9L9 3M9 3H4M9 3V8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NavItem({ link, onClick }: { link: NavLink; onClick?: () => void }) {
  const badge = link.badge ? (
    <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[rgba(0,229,255,0.12)] text-[var(--cyan)] border border-[rgba(0,229,255,0.25)]">
      {link.badge}
    </span>
  ) : null

  const className =
    "inline-flex items-center text-sm font-medium text-[rgba(255,255,255,0.72)] hover:text-white transition-colors"

  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {link.title}
        {badge}
        <ExternalArrow />
      </a>
    )
  }
  return (
    <Link href={link.href} className={className} onClick={onClick}>
      {link.title}
      {badge}
    </Link>
  )
}

export function SiteNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[rgba(3,6,11,0.72)] border-b border-[rgba(255,255,255,0.07)]">
      <nav
        className="container-premium flex items-center justify-between h-16"
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-extrabold tracking-tight text-[0.95rem]">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: "linear-gradient(135deg,var(--cyan),var(--magenta))", boxShadow: "0 0 12px var(--cyan)" }}
            aria-hidden="true"
          />
          <span>
            AETHER{" "}
            <span className="bg-gradient-to-r from-[var(--cyan)] to-[var(--magenta)] bg-clip-text text-transparent">
              ONCOLOGY
            </span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-6">
          {INTERNAL_LINKS.filter((l) => l.href !== "/").map((l) => (
            <NavItem key={l.href} link={l} />
          ))}
          <span className="w-px h-5 bg-[rgba(255,255,255,0.12)]" aria-hidden="true" />
          {EXTERNAL_LINKS.map((l) => (
            <NavItem key={l.href} link={l} />
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[rgba(255,255,255,0.12)] text-white"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile panel */}
      {open && (
        <div
          id="mobile-nav"
          className="lg:hidden border-t border-[rgba(255,255,255,0.07)] bg-[rgba(3,6,11,0.96)] backdrop-blur-xl"
        >
          <div className="container-premium py-4 flex flex-col gap-4">
            {INTERNAL_LINKS.filter((l) => l.href !== "/").map((l) => (
              <NavItem key={l.href} link={l} onClick={() => setOpen(false)} />
            ))}
            <span className="h-px w-full bg-[rgba(255,255,255,0.1)]" aria-hidden="true" />
            {EXTERNAL_LINKS.map((l) => (
              <NavItem key={l.href} link={l} onClick={() => setOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
