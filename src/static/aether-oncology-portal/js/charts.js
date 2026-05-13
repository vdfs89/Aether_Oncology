document.addEventListener('DOMContentLoaded', () => {
  const ctxElement = document.getElementById('xaiRadarChart');
  if (!ctxElement) return;

  // Global defaults to match "Luxury Clinical" design system
  Chart.defaults.color = '#94A3B8';
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";

  const data = {
    labels: ['Raio Médio', 'Textura', 'Perímetro', 'Área', 'Suavidade'],
    datasets: [{
      label: 'SHAP Value (Impacto no Modelo)',
      data: [0, 0, 0, 0, 0], // Initial state
      backgroundColor: 'rgba(230, 57, 138, 0.25)',
      borderColor: '#E6398A',
      pointBackgroundColor: '#E6398A',
      pointBorderColor: '#FFFFFF',
      pointHoverBackgroundColor: '#FFFFFF',
      pointHoverBorderColor: '#E6398A',
      borderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
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
          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
          grid: { color: 'rgba(255, 255, 255, 0.1)' },
          pointLabels: {
            color: '#FFFFFF',
            font: { size: 12, weight: 500 }
          },
          ticks: {
            display: false, // Clean aesthetic
            min: 0,
            max: 30
          }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#FFFFFF', font: { size: 13 } }
        },
        tooltip: {
          backgroundColor: 'rgba(3, 6, 11, 0.9)',
          titleColor: '#FFFFFF',
          bodyColor: '#E6398A',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8
        }
      }
    }
  };

  const radarChart = new Chart(ctxElement, config);

  // Expose global updater for main.js
  window.updateRadarChart = function(newData) {
    radarChart.data.datasets[0].data = newData;
    radarChart.update();
  };
});
