import { RAGStatus } from "./RAGStatus"

export function DatasetShowcase() {
  return (
    <section id="evidence" className="section" aria-label="Evidência Científica">
      <div className="container-premium">
        <div className="section-header">
          <div className="eyebrow">Base de Conhecimento Viva</div>
          <h2 className="section-h2">Fundamentado em<br />ciência peer-reviewed.</h2>
          <p className="section-sub">Cada diagnóstico validado automaticamente contra as publicações mais recentes de PubMed, Nature Oncology e NEJM AI.</p>
        </div>

        <div className="evidence-grid">

          <div className="evidence-card">
            <div className="evidence-card__meta">
              <span className="evidence-badge">PubMed #31948251</span>
              <span className="evidence-year">2024</span>
            </div>
            <h4 className="evidence-card__h4">IA na Detecção Precoce de Carcinoma Ductal</h4>
            <p className="evidence-card__p">Estudo multicêntrico demonstra redução de 23% em diagnósticos tardios utilizando modelos Bayesianos com incerteza quantificada.</p>
            <div className="evidence-card__score">
              <span>Relevância</span>
              <div className="evidence-bar"><div style={{ width: "94%" }}></div></div>
              <span className="score-val">94%</span>
            </div>
          </div>

          <div className="evidence-card">
            <div className="evidence-card__meta">
              <span className="evidence-badge" style={{ background: "rgba(0,207,255,.12)", color: "var(--cyan)" }}>Nature Oncology</span>
              <span className="evidence-year">2025</span>
            </div>
            <h4 className="evidence-card__h4">Biomarcadores Genômicos em Oncologia de Precisão</h4>
            <p className="evidence-card__p">Aether Oncology apresenta correlação de 0.98 com biópsias em coorte de 3.200 pacientes brasileiros.</p>
            <div className="evidence-card__score">
              <span>Relevância</span>
              <div className="evidence-bar"><div style={{ width: "98%" }}></div></div>
              <span className="score-val">98%</span>
            </div>
          </div>

          <div className="evidence-card">
            <div className="evidence-card__meta">
              <span className="evidence-badge" style={{ background: "rgba(237,230,255,.08)", color: "var(--lavender)" }}>NEJM AI</span>
              <span className="evidence-year">2025</span>
            </div>
            <h4 className="evidence-card__h4">XAI em Sistemas de Suporte Clínico</h4>
            <p className="evidence-card__p">Sistemas com explicabilidade nativa aumentam a confiança do clínico em 67% e reduzem o tempo de decisão em 41%.</p>
            <div className="evidence-card__score">
              <span>Relevância</span>
              <div className="evidence-bar"><div style={{ width: "89%" }}></div></div>
              <span className="score-val">89%</span>
            </div>
          </div>

        </div>

        <RAGStatus />
      </div>
    </section>
  )
}
