/**
 * Aether Oncology | Charts Controller
 * Data visualization for Clinical Intelligence.
 */

const initClinicalChart = () => {
    const ctx = document.getElementById('clinicalChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Precisão do Modelo',
                data: [92, 94, 95.5, 97, 98.1, 98.4],
                borderColor: '#E6398A',
                backgroundColor: 'rgba(230, 57, 138, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                }
            }
        }
    });
};

const initXaiChart = () => {
    const ctx = document.getElementById('xaiChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        indexAxis: 'y',
        data: {
            labels: ['Gene BRCA1', 'Idade', 'Histórico Familiar', 'Biomarcador HER2', 'Densidade Tecidual'],
            datasets: [{
                label: 'Importância (SHAP Value)',
                data: [0.45, 0.25, 0.15, 0.10, 0.05],
                backgroundColor: [
                    '#E6398A',
                    '#9D4EDD',
                    '#5a189a',
                    '#3c096c',
                    '#240046'
                ],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: 'rgba(255, 255, 255, 0.5)' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#fff', font: { weight: '500' } }
                }
            }
        }
    });
};

// Initialize
initClinicalChart();
initXaiChart();
