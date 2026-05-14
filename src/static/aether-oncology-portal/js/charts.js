document.addEventListener('DOMContentLoaded', () => {
    const ctxElement = document.getElementById('xaiRadarChart');
    if (!ctxElement) return;

    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

    const data = {
        labels: ['Raio Médio', 'Textura', 'Perímetro', 'Área', 'Suavidade'],
        datasets: [{
            label: 'Impacto SHAP',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            borderColor: '#10b981',
            pointBackgroundColor: '#22d3ee',
            pointBorderColor: '#FFFFFF',
            borderWidth: 2,
            pointRadius: 4
        }]
    };

    const config = {
        type: 'radar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    pointLabels: {
                        color: '#F8FAFC',
                        font: { size: 10, weight: 600 }
                    },
                    ticks: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    };

    const radarChart = new Chart(ctxElement, config);

    window.updateRadarChart = function(newData) {
        radarChart.data.datasets[0].data = newData;
        radarChart.update();
    };
});
