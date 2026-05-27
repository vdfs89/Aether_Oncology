import { TrustBand } from "./TrustBand"
import { BentoGrid } from "./BentoGrid"

export function Benefits() {
  return (
    <>
      {/* ═══ TRUST BAND ═══════════════════════════════════════════════════ */}
      <TrustBand />

      {/* ═══ 2. BENTO PLATFORM ════════════════════════════════════════════ */}
      <section id="platform" className="section" aria-label="Plataforma">
        <div className="container-premium">
          <div className="section-header">
            <div className="eyebrow">Arquitetura de Precisão</div>
            <h2 className="section-h2">Engenharia de<br />nível enterprise.</h2>
          </div>

          <BentoGrid />
        </div>
      </section>
    </>
  )
}
