import { HeroBackground } from "./HeroBackground"
import { HeroMetrics } from "./HeroMetrics"
import { HeroCTA } from "./HeroCTA"
import { ClinicalDashboardLive } from "./ClinicalDashboardLive"

export function Hero() {
  return (
    <section id="hero" className="relative min-h-[95svh] flex items-center justify-center pt-24 pb-16 overflow-hidden" aria-label="Hero">
      <HeroBackground />
      
      <div className="container-premium relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 xl:gap-16 items-center">
          
          {/* Lado esquerdo — Editorial Content */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            <div className="hero-badge" aria-label="Posição">
              <span className="hero-badge__dot" aria-hidden="true"></span>
              Protótipo Acadêmico · FIAP Tech Challenge · 2026
            </div>

            <h1 className="hero-h1 mt-2 text-white font-extrabold tracking-tight">
              Clinical Intelligence<br />
              for <em className="hero-h1__accent">Precision</em><br />
              Oncology.
            </h1>

            <p className="hero-sub mt-4 text-[rgba(255,255,255,0.7)] text-sm md:text-base leading-relaxed max-w-lg">
              Redes neurais Bayesianas, XAI explicável e RAG científico trabalhando juntos para transformar dados genômicos e biométricos em decisões oncológicas de alta precisão clínica.
            </p>

            <div className="mt-8">
              <HeroCTA />
            </div>

            <div className="mt-8 overflow-hidden">
              <HeroMetrics />
            </div>
          </div>

          {/* Lado direito — SO Clínico Vivo */}
          <div className="lg:col-span-7 w-full flex justify-center">
            <div className="w-full max-w-2xl relative">
              {/* Subtle glass effect behind the live dashboard for ambient lighting */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[var(--magenta)] to-[var(--cyan)] opacity-20 blur-2xl z-0 pointer-events-none" />
              <div className="relative z-10">
                <ClinicalDashboardLive />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
