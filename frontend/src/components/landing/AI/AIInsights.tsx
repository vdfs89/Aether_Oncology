export function AIInsights() {
  return (
    <>
      {/* ═══ 3. CLINICAL INTELLIGENCE ════════════════════════════════════ */}
      <section id="clinical" className="section" aria-label="IA Clínica">
        <div className="container-premium">
          <div className="glass-section">
            <div className="glass-section__grid">
              <div className="glass-section__text">
                <div className="eyebrow">Monitoramento em Tempo Real</div>
                <h2 className="section-h2 section-h2--left">Clinical<br />Intelligence.</h2>
                <p>Redes neurais convolucionais analisam 47 biomarcadores em paralelo, correlacionando dados genômicos, laboratoriais e de imagem para gerar hipóteses diagnósticas com fundamento científico automático.</p>
                <ul className="feature-list" role="list">
                  <li>Análise paralela de 47 biomarcadores</li>
                  <li>Correlação automática com biópsias</li>
                  <li>Alerta preditivo de progressão tumoral</li>
                  <li>Rastreabilidade auditável completa</li>
                </ul>
              </div>
              <div className="glass-section__chart" role="img" aria-label="Gráfico de biomarcadores">
                {/* O gráfico Chart.js ou Recharts será injetado aqui na Fase 1.3 */}
                <div className="w-full h-64 bg-[var(--bg-card)] rounded flex items-center justify-center border border-[var(--glass-border)]">
                  <span className="text-[var(--t2)] text-sm font-mono">Clinical Chart Area</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. XAI ═══════════════════════════════════════════════════════ */}
      <section id="xai" className="section" aria-label="IA Explicável">
        <div className="container-premium">
          <div className="xai-layout">
            <div className="xai-layout__chart" role="img" aria-label="Radar de atributos XAI">
              {/* O gráfico radar Chart.js será injetado aqui */}
              <div className="w-full aspect-square max-h-[300px] bg-[var(--bg-card)] rounded-full flex items-center justify-center border border-[var(--glass-border)]">
                <span className="text-[var(--t2)] text-sm font-mono">XAI Radar Area</span>
              </div>
            </div>
            <div className="xai-layout__text">
              <div className="eyebrow">Transparência Radical</div>
              <h2 className="section-h2 section-h2--left">Cada decisão<br />explicada.</h2>
              <p>Não entregamos apenas um diagnóstico — entregamos o raciocínio completo. SHAP values e LIME permitem que oncologistas validem, contestem e aprendam com cada predição.</p>
              <div className="xai-legend" role="list">
                <div className="xai-legend__item" role="listitem">
                  <span className="xai-legend__dot" style={{ background: "var(--magenta)" }}></span>
                  SHAP — Atribuição por Feature
                </div>
                <div className="xai-legend__item" role="listitem">
                  <span className="xai-legend__dot" style={{ background: "var(--cyan)" }}></span>
                  LIME — Explicação Local
                </div>
                <div className="xai-legend__item" role="listitem">
                  <span className="xai-legend__dot" style={{ background: "var(--lavender)" }}></span>
                  Counterfactual Reasoning
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
