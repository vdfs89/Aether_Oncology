export function CTASection() {
  return (
    <>
      {/* ═══ 6. SRE DOCK ══════════════════════════════════════════════════ */}
      <section className="section" aria-label="Status do Sistema">
        <div className="container-premium">
          <div className="sre-dock glass-card">
            <div className="sre-dock__header">
              <div>
                <div className="eyebrow" style={{ textAlign: "left" }}>SRE Health Dock</div>
                <h3 className="sre-dock__title">Infraestrutura Mission-Critical</h3>
              </div>
              <div className="sre-dock__live" aria-label="Sistema operacional">
                <span className="sre-dot sre-dot--green" aria-hidden="true"></span>
                Todos os sistemas operacionais
              </div>
            </div>
            <div className="sre-metrics" role="list">
              <div className="sre-metric" role="listitem">
                <div className="sre-dot sre-dot--green" aria-hidden="true"></div>
                <div>
                  <div className="sre-metric__label">Inference API</div>
                  <div className="sre-metric__val" style={{ color: "#00FF99" }}>Operacional</div>
                </div>
              </div>
              <div className="sre-metric" role="listitem">
                <div className="sre-dot sre-dot--green" aria-hidden="true"></div>
                <div>
                  <div className="sre-metric__label">Model Drift</div>
                  <div className="sre-metric__val" style={{ color: "#00FF99" }}>KS/PSI · Monitorado</div>
                </div>
              </div>
              <div className="sre-metric" role="listitem">
                <div className="sre-dot sre-dot--green" aria-hidden="true"></div>
                <div>
                  <div className="sre-metric__label">RAG Engine</div>
                  <div className="sre-metric__val" style={{ color: "#00FF99" }}>Ativo</div>
                </div>
              </div>
              <div className="sre-metric" role="listitem">
                <div className="sre-dot sre-dot--yellow" aria-hidden="true"></div>
                <div>
                  <div className="sre-metric__label">Training Pipeline</div>
                  <div className="sre-metric__val" style={{ color: "#FFD700" }}>Em Execução</div>
                </div>
              </div>
              <div className="sre-metric" role="listitem">
                <div>
                  <div className="sre-metric__label">Testes</div>
                  <div className="sre-metric__val sre-metric__val--accent">162 ✓</div>
                </div>
              </div>
              <div className="sre-metric" role="listitem">
                <div>
                  <div className="sre-metric__label">Benchmark</div>
                  <div className="sre-metric__val sre-metric__val--accent">5-fold CV</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 7. CTA FINAL ════════════════════════════════════════════════ */}
      <section id="cta" className="section section--cta" aria-label="Chamada para ação">
        <div className="container-premium">
          <div className="cta-card glass-card">
            <div className="cta-card__glow" aria-hidden="true"></div>
            <div className="cta-card__body">
              <div className="eyebrow">Comece Agora</div>
              <h2 className="cta-card__h2">Pronto para o próximo<br />nível da oncologia?</h2>
              <p className="cta-card__sub">Protótipo acadêmico open-source (FIAP Tech Challenge). Explore o pipeline, a API de inferência e o Model Card — código aberto sob licença MIT.</p>
              <div className="cta-card__actions">
                <a href="/platform" className="btn btn--primary btn--lg" aria-label="Agendar demonstração">Agendar Demonstração</a>
                <a href="https://github.com/vdfs89/Aether_Oncology" className="btn btn--ghost btn--lg" target="_blank" rel="noopener noreferrer">Ver no GitHub</a>
              </div>
              <p className="cta-card__note">Sem cartão de crédito. Setup em 15 minutos.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
