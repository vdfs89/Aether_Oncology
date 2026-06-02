import { RAGStatus } from "./RAGStatus"

export function DatasetShowcase() {
  return (
    <section id="evidence" className="section" aria-label="Evidência Científica">
      <div className="container-premium">
        <div className="section-header">
          <div className="eyebrow">RAG Científico ao Vivo</div>
          <h2 className="section-h2">Busca de evidência<br />em fontes reais.</h2>
          <p className="section-sub">O motor de RAG consulta <strong>ao vivo</strong> PubMed (Entrez), Cochrane e Semantic Scholar — com circuit breaker por provedor, deduplicação por URL e cache. Nenhuma métrica ou estudo abaixo é uma alegação de validação clínica do Aether.</p>
        </div>

        <div className="evidence-grid">

          <div className="evidence-card">
            <div className="evidence-card__meta">
              <span className="evidence-badge">PubMed (Entrez)</span>
            </div>
            <h4 className="evidence-card__h4">Busca biomédica primária</h4>
            <p className="evidence-card__p">Consulta à base PubMed via API Entrez do NCBI, com extração de título, autores e abstract para fundamentar a resposta.</p>
          </div>

          <div className="evidence-card">
            <div className="evidence-card__meta">
              <span className="evidence-badge" style={{ background: "rgba(0,207,255,.12)", color: "var(--cyan)" }}>Cochrane</span>
            </div>
            <h4 className="evidence-card__h4">Revisões sistemáticas</h4>
            <p className="evidence-card__p">Provedor de evidência de alto nível para revisões e meta-análises, integrado à cadeia de recuperação.</p>
          </div>

          <div className="evidence-card">
            <div className="evidence-card__meta">
              <span className="evidence-badge" style={{ background: "rgba(237,230,255,.08)", color: "var(--lavender)" }}>Semantic Scholar</span>
            </div>
            <h4 className="evidence-card__h4">Cobertura ampla + citações</h4>
            <p className="evidence-card__p">Grafo de citações para ampliar a recuperação. <em>O vector store semântico é stub → fallback para busca ao vivo.</em></p>
          </div>

        </div>

        <RAGStatus />
      </div>
    </section>
  )
}
