export function TrustBand() {
  return (
    <div className="trust-band" aria-label="Certificações">
      <div className="container-premium">
        <div className="trust-band__inner">
          <span className="trust-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 2 .7-4.1L1 5.3l4.2-.7z" stroke="var(--magenta)" strokeWidth="1.2" fill="none"/>
            </svg>
            Protótipo Acadêmico
          </span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">FIAP Tech Challenge</span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">LGPD-aware Design</span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">Licença MIT</span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">Open Source</span>
        </div>
      </div>
    </div>
  )
}
