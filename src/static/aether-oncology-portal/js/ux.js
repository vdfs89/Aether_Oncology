/**
 * Aether Oncology — UX Interactions
 * "Luxury Clinical" v1.0
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll Reveal Logic
    const revealElements = document.querySelectorAll('.animate-reveal');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: Stop observing after reveal
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));

    // 2. Range Input Value Synchronization
    const ranges = document.querySelectorAll('input[type="range"]');
    ranges.forEach(range => {
        const valSpan = document.getElementById(`${range.id}-val`);
        if (valSpan) {
            range.addEventListener('input', (e) => {
                valSpan.textContent = e.target.value;
            });
        }
    });

    // 3. Navbar Scrolled State
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(2, 6, 23, 0.8)';
                navbar.style.padding = '0.75rem 0';
            } else {
                navbar.style.background = 'rgba(2, 6, 23, 0.4)';
                navbar.style.padding = '1rem 0';
            }
        }
    });
});
