import { SITE_CONFIG } from "@/config/site"
import { HeroBackground } from "./HeroBackground"
import { HeroMetrics } from "./HeroMetrics"
import { HeroCTA } from "./HeroCTA"

export function Hero() {
  return (
    <section id="hero" className="hero" aria-label="Hero">
      <HeroBackground />
      
      <div className="container-premium relative z-10 pt-[var(--nav-h)]">
        {/* Badge linha editorial */}
        <div className="hero-badge mt-12" aria-label="Posição">
          <span className="hero-badge__dot" aria-hidden="true"></span>
          Series A · AI Oncology Platform · 2026
        </div>

        {/* Headline editorial gigante */}
        <h1 className="hero-h1 mt-6">
          A Próxima<br />
          <em className="hero-h1__accent">Fronteira</em><br />
          da Medicina.
        </h1>

        <p className="hero-sub mt-6">
          Redes neurais Bayesianas, XAI explicável e RAG científico trabalhando juntos para transformar dados biométricos em diagnósticos oncológicos de precisão cirúrgica.
        </p>

        {/* Métricas hero (Client Component) */}
        <div className="mt-12">
          <HeroMetrics />
        </div>

        {/* CTAs (Client Component) */}
        <div className="mt-10">
          <HeroCTA />
        </div>

        {/* Floating mockup dashboard placeholder - can be refactored to its own component later */}
        <div className="hero-mockup mt-16" aria-hidden="true">
          <div className="mockup-frame">
            <div className="mockup-bar">
              <span className="mockup-dot" style={{ background: "#FF5F57" }}></span>
              <span className="mockup-dot" style={{ background: "#FEBC2E" }}></span>
              <span className="mockup-dot" style={{ background: "#28C840" }}></span>
              <span className="mockup-title">Aether Oncology Clinical Dashboard</span>
            </div>
            <div className="mockup-body h-[300px] flex items-center justify-center bg-[var(--bg-card)]">
              {/* Dashboard abstract representation */}
              <div className="dash-card dash-card--wide w-full max-w-md">
                <div className="dash-card__label">Análise Ativa</div>
                <div className="dash-card__val" style={{ color: "var(--pink)" }}>BRCA1 · TP53 · HER2</div>
                <div className="dash-sparkline mt-4">
                  <svg viewBox="0 0 200 40" fill="none" aria-hidden="true" className="w-full h-auto">
                    <polyline points="0,35 30,28 60,32 90,20 120,24 150,12 200,8" stroke="var(--pink)" strokeWidth="2" fill="none"/>
                    <polyline points="0,35 30,28 60,32 90,20 120,24 150,12 200,8 200,40 0,40" stroke="var(--pink)" strokeWidth="0" fill="url(#sg)"/>
                    <defs>
                      <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--pink)" stopOpacity=".3"/>
                        <stop offset="100%" stopColor="var(--pink)" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
