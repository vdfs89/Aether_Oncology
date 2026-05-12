/**
 * Aether Oncology — UI Module
 * Navbar scroll, mobile menu, active nav link highlighting.
 * CSP-friendly: no inline event handlers, no eval.
 */

// ─── Navbar scroll state ──────────────────────────────────────────────────
export function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // apply immediately
}

// ─── Mobile hamburger menu ────────────────────────────────────────────────
export function initMobileMenu() {
  const btn  = document.querySelector('.nav-hamburger');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  const toggle = (forceClose = false) => {
    const isOpen = !forceClose && btn.getAttribute('aria-expanded') === 'false';
    btn.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
    btn.classList.toggle('open', isOpen);
    menu.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  btn.addEventListener('click', () => toggle());

  // Close on mobile link click
  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggle(true));
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggle(true);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      if (menu.classList.contains('open')) toggle(true);
    }
  });
}

// ─── Active nav link (IntersectionObserver) ───────────────────────────────
export function initActiveNav() {
  const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  if (!navLinks.length) return;

  const sectionIds = [...navLinks]
    .map((l) => l.getAttribute('href').slice(1))
    .filter(Boolean);

  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const setActive = (id) => {
    navLinks.forEach((l) => {
      l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));
}
