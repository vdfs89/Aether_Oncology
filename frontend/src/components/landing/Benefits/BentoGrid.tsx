export function BentoGrid() {
  return (
    <div className="bento-grid">
      {/* Card grande: IA Bayesiana */}
      <article className="bento-card bento-card--tall bento-card--glow-magenta" aria-label="IA Bayesiana">
        <div className="bento-card__icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke="var(--magenta)" strokeWidth="1.5" opacity=".4"/>
            <circle cx="16" cy="16" r="10" stroke="var(--magenta)" strokeWidth="1.5"/>
            <circle cx="16" cy="16" r="3" fill="var(--magenta)"/>
            <path d="M16 6v4M16 22v4M6 16h4M22 16h4" stroke="var(--magenta)" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
          </svg>
        </div>
        <h3 className="bento-card__h3">Incerteza Bayesiana</h3>
        <p className="bento-card__p">Monte Carlo Dropout quantifica a confiança em cada predição. Redução de 34% em falsos positivos comparado a modelos determinísticos.</p>
        <div className="bento-card__chip">Monte Carlo · 256 samples</div>
      </article>

      {/* Card: RAG */}
      <article className="bento-card bento-card--glow-cyan" aria-label="RAG Científico">
        <div className="bento-card__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="3" y="5" width="22" height="18" rx="2" stroke="var(--cyan)" strokeWidth="1.5"/>
            <path d="M8 13h4l2-4 2 9 2-5h2" stroke="var(--cyan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="bento-card__h3">RAG Clínico</h3>
        <p className="bento-card__p">Conexão em tempo real com PubMed e ClinVar.</p>
        <div className="bento-card__chip">LangChain · FAISS · 2.8K docs</div>
      </article>

      {/* Card: Edge Privacy */}
      <article className="bento-card bento-card--glow-lavender" aria-label="Edge Privacy">
        <div className="bento-card__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 3L4 8v9c0 5.5 4.4 9.3 10 10 5.6-.7 10-4.5 10-10V8L14 3z" stroke="var(--lavender)" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M10 14l3 3 5-5" stroke="var(--lavender)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3 className="bento-card__h3">Edge-Ready &amp; Privacy</h3>
        <p className="bento-card__p">Modelos INT8 executam localmente. Dados nunca saem do ambiente clínico.</p>
        <div className="bento-card__chip">ONNX · INT8 · On-Premise</div>
      </article>

      {/* Card grande: Dashboard visual */}
      <article className="bento-card bento-card--wide bento-card--dark" aria-label="MLOps Pipeline">
        <div className="bento-card__split">
          <div>
            <div className="bento-card__icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M5 21l5-7 4 5 3-4 4 6" stroke="var(--magenta)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="22" cy="7" r="3" fill="var(--magenta)" opacity=".3"/>
                <circle cx="22" cy="7" r="1.5" fill="var(--magenta)"/>
              </svg>
            </div>
            <h3 className="bento-card__h3">MLOps Enterprise</h3>
            <p className="bento-card__p">Pipeline CI/CD com MLflow, DVC, Optuna e Evidently. Treinamento contínuo com auditoria completa.</p>
            <div className="bento-card__chip">MLflow · DVC · Optuna</div>
          </div>
          <div className="mini-pipeline" aria-hidden="true">
            <div className="pipe-step pipe-step--done">Data</div>
            <div className="pipe-arrow">→</div>
            <div className="pipe-step pipe-step--done">Train</div>
            <div className="pipe-arrow">→</div>
            <div className="pipe-step pipe-step--active">Eval</div>
            <div className="pipe-arrow">→</div>
            <div className="pipe-step">Deploy</div>
          </div>
        </div>
      </article>

      {/* Card: Drift */}
      <article className="bento-card" aria-label="Drift Detection">
        <div className="bento-card__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="10" stroke="var(--magenta)" strokeWidth="1.5"/>
            <path d="M14 8v6l4 2" stroke="var(--pink)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <h3 className="bento-card__h3">Drift Detection</h3>
        <p className="bento-card__p">Monitoramento contínuo com alertas automáticos e recalibração adaptativa.</p>
        <div className="bento-card__chip">Evidently AI · PSI</div>
      </article>

      {/* Card: Green AI */}
      <article className="bento-card bento-card--green" aria-label="Green AI">
        <div className="green-orb" aria-hidden="true">🌱</div>
        <h3 className="bento-card__h3">Green AI</h3>
        <p className="bento-card__p">40% menos CO₂ por inferência. 100% energia renovável. INT8 quantização auditável.</p>
        <div className="bento-card__chip" style={{ color: "#00FF99", borderColor: "rgba(0,255,153,.25)" }}>Carbon Neutral 2026</div>
      </article>
    </div>
  )
}
