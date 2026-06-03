import { SiteNav } from "@/components/landing/Nav/SiteNav"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col w-full relative">
      <SiteNav />
      {/* Offset for the fixed SiteNav — single source: --nav-height (globals.css).
          Every marketing page (home, platform, model-card, sandbox) clears the nav. */}
      <div style={{ paddingTop: "var(--nav-height)" }}>{children}</div>
    </div>
  )
}
