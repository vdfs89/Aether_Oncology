document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('clinical-form');
  const loader = document.getElementById('inference-loader');
  const verdict = document.getElementById('inference-verdict');
  const verdictText = document.getElementById('verdict-text');
  const verdictConfidence = document.getElementById('verdict-confidence');
  
  // Update slider display values dynamically
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const output = document.getElementById(`${slider.id}-val`);
    if(output) {
      slider.addEventListener('input', (e) => {
        output.textContent = e.target.value;
      });
    }
  });

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // UI Transition: Show loader, hide verdict
      verdict.classList.remove('active');
      loader.classList.add('active');
      
      // Extract data
      const radius = parseFloat(document.getElementById('radius').value);
      const texture = parseFloat(document.getElementById('texture').value);
      const perimeter = parseFloat(document.getElementById('perimeter').value);
      const area = parseFloat(document.getElementById('area').value);
      const smoothness = parseFloat(document.getElementById('smoothness').value);
      
      // Trigger XAI Chart update
      if (window.updateRadarChart) {
        // Normalizing data roughly for the radar scale (0-30)
        window.updateRadarChart([
          radius, 
          texture * 0.75, 
          perimeter / 6, 
          area / 80, 
          smoothness * 200
        ]);
      }

      // Hide any previous error toasts
      const errorToast = document.getElementById('error-toast');
      if (errorToast) errorToast.style.display = 'none';

      // Advanced Mock Fetch with Timeout Simulation (Render Cold-Start Protection)
      const fetchPromise = new Promise((resolve, reject) => {
        // Simulate a network failure 15% of the time to demonstrate robust Error Recovery
        const isColdStart = Math.random() < 0.15;
        if (isColdStart) {
          setTimeout(() => reject(new Error('Render Cold Start (503)')), 5000); // Fails after 5s
        } else {
          setTimeout(() => {
            const score = (radius * 0.3) + (texture * 0.2) + (perimeter * 0.1) + (area * 0.05) + (smoothness * 20);
            resolve({ isMalignant: score > 48, rawScore: score });
          }, 2500);
        }
      });

      fetchPromise.then(result => {
        loader.classList.remove('active');
        verdict.classList.add('active');
        
        verdict.classList.remove('malignant', 'benign');
        
        if (result.isMalignant) {
          verdict.classList.add('malignant');
          verdictText.textContent = "Maligno";
          verdictConfidence.textContent = "Confiança: " + (87 + Math.random() * 12).toFixed(2) + "%";
        } else {
          verdict.classList.add('benign');
          verdictText.textContent = "Benigno";
          verdictConfidence.textContent = "Confiança: " + (92 + Math.random() * 7).toFixed(2) + "%";
        }
      }).catch(err => {
        // Error Recovery (Luxury Clinical Error State)
        loader.classList.remove('active');
        if (errorToast) {
          errorToast.style.display = 'block';
          // Auto hide after 6s
          setTimeout(() => { errorToast.style.display = 'none'; }, 6000);
        }
      });
    });
  }
});
