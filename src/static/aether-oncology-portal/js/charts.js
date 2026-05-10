import Chart from 'chart.js/auto';

let xaiChartInstance = null;

export function renderXAIChart(importances) {
    const ctx = document.getElementById('xaiChart');
    if (!ctx) return;
    
    if (xaiChartInstance) {
        xaiChartInstance.destroy();
    }

    // Top 5 features
    const sorted = Object.entries(importances || {})
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        .slice(0, 5);

    const labels = sorted.map(i => i[0].replace('_', ' ').toUpperCase());
    const data = sorted.map(i => i[1]);
    const colors = data.map(v => v > 0 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(34, 197, 94, 0.8)');

    xaiChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Atribuição (Integrated Gradients)',
                data: data,
                backgroundColor: colors,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)'
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleFont: { size: 10, family: 'monospace' },
                    bodyFont: { size: 12, weight: 'bold' },
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => `Impacto: ${ctx.raw.toFixed(4)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 9 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.7)', font: { size: 10, weight: 'bold' } }
                }
            }
        }
    });
}

export function resetChart() {
    if (xaiChartInstance) {
        xaiChartInstance.destroy();
        xaiChartInstance = null;
    }
}
