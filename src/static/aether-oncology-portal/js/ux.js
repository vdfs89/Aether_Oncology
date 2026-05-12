/**
 * Aether Oncology | UX Controller
 * Cinematic motion and scroll reveals.
 */

const initScrollReveal = () => {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('section, .glass-card').forEach(el => {
        el.style.opacity = '0'; // Initial state for reveal
        observer.observe(el);
    });
};

const initParallax = () => {
    const heroImage = document.querySelector('.hero-image-container img');
    
    if (heroImage) {
        window.addEventListener('scroll', () => {
            const scrolled = window.scrollY;
            heroImage.style.transform = `translateY(${scrolled * 0.1}px) scale(${1 + scrolled * 0.0001})`;
        });
    }
};

// Initialize
initScrollReveal();
initParallax();
