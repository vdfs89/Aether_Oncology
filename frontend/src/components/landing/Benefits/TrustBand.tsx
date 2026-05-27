export function TrustBand() {
  return (
    <div className="trust-band" aria-label="Certificações">
      <div className="container-premium">
        <div className="trust-band__inner">
          <span className="trust-item">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.3l-3.7 2 .7-4.1L1 5.3l4.2-.7z" stroke="var(--magenta)" strokeWidth="1.2" fill="none"/>
            </svg>
            ANVISA Compliance
          </span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">LGPD Ready</span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">SOC 2 Type II</span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">ISO 27001</span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">HL7 FHIR</span>
          <span className="trust-sep" aria-hidden="true">·</span>
          <span className="trust-item">120+ Hospitais</span>
        </div>
      </div>
    </div>
  )
}
