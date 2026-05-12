/**
 * Aether Oncology — UX Module
 * Scroll-reveal animations, counter animation, smooth scroll polyfill.
 * Uses IntersectionObserver — no jQuery, no GSAP dependency.
 */

// ─── Scroll reveal ────────────────────────────────────────────────────────
export function initScrollReveal() {
  const els = document.querySelectorAll('.animate-reveal');
  if (!els.length) return;

  // Respect prefers-reduced-motion
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    els.forEach((el) => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => observer.observe(el));
}

// ─── Counter animation ────────────────────────────────────────────────────
function animateCounter(el) {
  const target  = parseFloat(el.dataset.count ?? '0');
  const suffix  = el.dataset.suffix ?? '';
  const duration = 1800; // ms
  const start   = performance.now();
  const isFloat = !Number.isInteger(target);

  const tick = (now) => {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out-quart
    const eased = 1 - Math.pow(1 - progress, 4);
    const value = target * eased;
    el.textContent = isFloat
      ? `${value.toFixed(1)}${suffix}`
      : `${Math.round(value)}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

export function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    counters.forEach((el) => {
      const v = el.dataset.count;
      const s = el.dataset.suffix ?? '';
      el.textContent = `${v}${s}`;
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}

// ─── Keyboard-accessible smooth scroll for hash links ─────────────────────
export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // update URL without triggering scroll
      history.pushState(null, '', `#${id}`);
    });
  });
}
