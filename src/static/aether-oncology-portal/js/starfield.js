/**
 * Aether Oncology — Cinematic Starfield Engine
 * "Organic Twinkle" Pattern v1.0
 */

class Starfield {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.stars = [];
        this.starCount = 150;
        this.resize();

        window.addEventListener('resize', () => this.resize());
        this.init();
        this.animate();
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    init() {
        this.stars = [];
        for (let i = 0; i < this.starCount; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                size: Math.random() * 1.5 + 0.5,
                opacity: Math.random(),
                speed: Math.random() * 0.02 + 0.005,
                twinkle: Math.random() * 0.05
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.stars.forEach(star => {
            star.opacity += star.twinkle;
            if (star.opacity > 1 || star.opacity < 0.2) {
                star.twinkle = -star.twinkle;
            }

            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            this.ctx.fill();

            // Subtle drift
            star.y -= star.speed;
            if (star.y < 0) star.y = this.height;
        });

        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Starfield('starfield');
});
