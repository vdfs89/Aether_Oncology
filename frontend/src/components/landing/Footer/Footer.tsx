import Link from "next/link"

export function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container-premium footer-inner">
        <div className="footer-brand">
          <Link href="/" className="nav-logo" aria-label="Aether Oncology">
            {/* The SVG logo will need to be imported or inline */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="nav-logo__img text-[var(--magenta)]" aria-hidden="true">
              <path d="M12 2L2 12l10 10 10-10L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="nav-logo__text">AETHER ONCOLOGY</span>
          </Link>
          <p className="footer-brand__desc">Clinical Intelligence for the next generation of oncology. Powered by explainable AI.</p>
          <a href="https://github.com/vdfs89/Aether_Oncology" aria-label="GitHub" className="social-link" target="_blank" rel="noopener noreferrer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
          </a>
        </div>

        <nav className="footer-nav" aria-label="Produto">
          <h4 className="footer-nav__title">Produto</h4>
          <ul role="list">
            <li><Link href="/platform" className="footer-link">Plataforma</Link></li>
            <li><Link href="/research" className="footer-link">IA Clínica</Link></li>
            <li><Link href="/research" className="footer-link">XAI</Link></li>
            <li><Link href="/developers" className="footer-link">API Docs</Link></li>
          </ul>
        </nav>

        <nav className="footer-nav" aria-label="Empresa">
          <h4 className="footer-nav__title">Empresa</h4>
          <ul role="list">
            <li><Link href="/company" className="footer-link">Sobre</Link></li>
            <li><Link href="/careers" className="footer-link">Carreiras</Link></li>
            <li><Link href="/blog" className="footer-link">Blog</Link></li>
            <li><Link href="/contact" className="footer-link">Contato</Link></li>
          </ul>
        </nav>

        <nav className="footer-nav" aria-label="Compliance">
          <h4 className="footer-nav__title">Compliance</h4>
          <ul role="list">
            <li><Link href="/privacy" className="footer-link">Privacidade LGPD</Link></li>
            <li><Link href="/terms" className="footer-link">Termos de Uso</Link></li>
            <li><Link href="/model-card" className="footer-link">Model Card</Link></li>
          </ul>
        </nav>
      </div>

      <div className="footer-bottom container-premium">
        <span>&copy; 2026 Aether Oncology. Todos os direitos reservados.</span>
        <span className="footer-bottom__status">
          <span className="sre-dot sre-dot--green" style={{ width: "6px", height: "6px" }} aria-hidden="true"></span>
          Todos os sistemas operacionais
        </span>
      </div>
    </footer>
  )
}
