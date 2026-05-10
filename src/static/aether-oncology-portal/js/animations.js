// Canvas animations and performance optimizations

let animationId;
let isAnimating = true;
let canvas, ctx, particles = [];

export function initCanvas() {
    canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d', { alpha: false }); // alpha:false for optimization
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5,
            dx: (Math.random() - 0.5) * 0.5,
            dy: (Math.random() - 0.5) * 0.5
        });
    }

    // Observer to pause animation when out of view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                if (!isAnimating) {
                    isAnimating = true;
                    drawParticles();
                }
            } else {
                isAnimating = false;
                if (animationId) cancelAnimationFrame(animationId);
            }
        });
    });

    const hero = document.getElementById('hero');
    if (hero) observer.observe(hero);

    drawParticles();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function drawParticles() {
    if (!isAnimating) return;
    
    // Solid background
    ctx.fillStyle = '#0B1026';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });

    animationId = requestAnimationFrame(drawParticles);
}

export function destroyCanvas() {
    isAnimating = false;
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resizeCanvas);
    particles = [];
}
