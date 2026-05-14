/**
 * Aether Oncology — UX Module v4
 * Neural canvas (particle system), scroll reveal, counter animation,
 * smooth scroll hash links. CSP-friendly (no eval, no inline handlers).
 */

// ─── Neural particle canvas ──────────────────────────────────────────────
function initNeuralCanvas() {
  const canvas = document.getElementById('neuralCanvas');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  let w, h, particles = [], animId;

  // Check prefers-reduced-motion
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) { canvas.style.display = 'none'; return; }

  const resize = () => {
    w = canvas.width  = window.innerWidth;
    h = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  const NUM = Math.min(60, Math.floor(w / 18));
  const COLORS = ['rgba(230,57,138,', 'rgba(0,207,255,', 'rgba(237,230,255,'];

  class P {
    constructor() {
      this.reset();
    }
    reset() {
      this.x  = Math.random() * w;
      this.y  = Math.random() * h;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.vy = (Math.random() - 0.5) * 0.5;
      this.r  = Math.random() * 1.5 + 0.3;
      this.c  = COLORS[Math.floor(Math.random() * COLORS.length)];
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > w) this.vx *= -1;
      if (this.y < 0 || this.y > h) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.c + '0.6)';
      ctx.fill();
    }
  }

  for (let i = 0; i < NUM; i++) particles.push(new P());

  function draw() {
    ctx.clearRect(0, 0, w, h);
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 180) {
          const alpha = (1 - d / 180) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(237,230,255,${alpha})`;
          ctx.stroke();
        }
      }
    }
    particles.forEach((p) => { p.update(); p.draw(); });
    animId = requestAnimationFrame(draw);
  }

  draw();
}

// ─── Scroll reveal ────────────────────────────────────────────────────────
export function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

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
    { threshold: 0.08 }
  );
  els.forEach((el) => observer.observe(el));
}

// ─── Counter animation ────────────────────────────────────────────────────
function animateCounter(el) {
  const target   = parseFloat(el.dataset.count ?? '0');
  const suffix   = el.dataset.suffix ?? '';
  const duration = 1800;
  const start    = performance.now();
  const isFloat  = !Number.isInteger(target);

  const tick = (now) => {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 4);
    const value    = target * eased;
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
      el.textContent = `${el.dataset.count}${el.dataset.suffix ?? ''}`;
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

// ─── Smooth scroll for hash links ────────────────────────────────────────
export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id    = anchor.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', `#${id}`);
    });
  });
}

// ─── Bootstrap — called from main.js ──────────────────────────────────────
export function initNeural() {
  initNeuralCanvas();
}