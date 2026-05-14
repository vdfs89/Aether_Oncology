document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('clinical-form');
  const loader = document.getElementById('inference-loader');
  const verdict = document.getElementById('inference-verdict');
  const verdictText = document.getElementById('verdict-text');
  const verdictConfidence = document.getElementById('verdict-confidence');
  const evidenceSection = document.getElementById('evidence-section');
  const evidenceGrid = document.getElementById('evidence-grid');
  
  // Function to read sliders and update XAI Chart
  const updateChartFromSliders = () => {
    if (window.updateRadarChart) {
      const radius = parseFloat(document.getElementById('radius').value);
      const texture = parseFloat(document.getElementById('texture').value);
      const perimeter = parseFloat(document.getElementById('perimeter').value);
      const area = parseFloat(document.getElementById('area').value);
      const smoothness = parseFloat(document.getElementById('smoothness').value);
      
      window.updateRadarChart([
        radius, 
        texture * 0.75, 
        perimeter / 6, 
        area / 80, 
        smoothness * 200
      ]);
    }
  };

  // Update slider display values dynamically and update chart
  const sliders = document.querySelectorAll('input[type="range"]');
  sliders.forEach(slider => {
    const output = document.getElementById(`${slider.id}-val`);
    if(output) {
      slider.addEventListener('input', (e) => {
        output.textContent = e.target.value;
        updateChartFromSliders();
      });
    }
  });

  // Initialize chart with default values
  setTimeout(updateChartFromSliders, 100);

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // UI Transition: Show loader, hide verdict
      verdict.classList.add('hidden');
      loader.classList.remove('hidden');
      
      // Get values for scoring
      const radius = parseFloat(document.getElementById('radius').value);
      const texture = parseFloat(document.getElementById('texture').value);
      const perimeter = parseFloat(document.getElementById('perimeter').value);
      const area = parseFloat(document.getElementById('area').value);
      const smoothness = parseFloat(document.getElementById('smoothness').value);

      // Hide any previous error toasts
      const errorToast = document.getElementById('error-toast');
      if (errorToast) errorToast.classList.add('hidden');

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
        loader.classList.add('hidden');
        verdict.classList.remove('hidden');
        
        verdict.classList.remove('malignant', 'benign');
        
        if (result.isMalignant) {
          verdict.classList.add('malignant');
          verdictText.textContent = "Maligno";
          verdictConfidence.textContent = "Confiança: " + (87 + Math.random() * 12).toFixed(2) + "%";
          updateScientificEvidence('malignant');
        } else {
          verdict.classList.add('benign');
          verdictText.textContent = "Benigno";
          verdictConfidence.textContent = "Confiança: " + (92 + Math.random() * 7).toFixed(2) + "%";
          updateScientificEvidence('benign');
        }
      }).catch(err => {
        // Error Recovery (Luxury Clinical Error State)
        loader.classList.add('hidden');
        if (errorToast) {
          errorToast.classList.remove('hidden');
          // Auto hide after 6s
          setTimeout(() => { errorToast.classList.add('hidden'); }, 6000);
        }
      });
    });
  }

  /**
   * Update Scientific Evidence (RAG Mock)
   * Fetches contextually relevant articles based on verdict.
   */
  function updateScientificEvidence(type) {
    if (!evidenceSection || !evidenceGrid) return;
    
    // Clear previous
    evidenceGrid.innerHTML = '';
    evidenceSection.classList.remove('hidden');
    evidenceSection.classList.add('reveal-vault');

    const articles = {
      malignant: [
        { title: "Malignant patterns in FNA cytology", author: "Smith et al.", journal: "The Lancet Oncology", link: "https://pubmed.ncbi.nlm.nih.gov/" },
        { title: "Computational analysis of nuclear atypia", author: "Chen, X.", journal: "Nature Medicine", link: "https://pubmed.ncbi.nlm.nih.gov/" },
        { title: "Predictive modeling in breast carcinomas", author: "Garcia, M.", journal: "JCO Clinical Informatics", link: "https://pubmed.ncbi.nlm.nih.gov/" }
      ],
      benign: [
        { title: "Morphological features of fibroadenomas", author: "Wilson, J.", journal: "Breast Cancer Research", link: "https://pubmed.ncbi.nlm.nih.gov/" },
        { title: "Neural network interpretation of benign cysts", author: "Adams, K.", journal: "Diagnostic Pathology", link: "https://pubmed.ncbi.nlm.nih.gov/" },
        { title: "Stability of biomarkers in benign cases", author: "Lee, S.", journal: "Science Translational Medicine", link: "https://pubmed.ncbi.nlm.nih.gov/" }
      ]
    };

    const data = articles[type] || [];
    
    data.forEach((art, index) => {
      const card = document.createElement('div');
      card.className = 'evidence-card glass-panel';
      card.style.animationDelay = `${index * 0.15}s`;
      card.innerHTML = `
        <div class="evidence-tag">Artigo Científico</div>
        <h4 class="evidence-title">${art.title}</h4>
        <div class="evidence-meta">
          <span>${art.author}</span> • <span>${art.journal}</span>
        </div>
        <a href="${art.link}" target="_blank" class="evidence-link">Ver no PubMed</a>
      `;
      evidenceGrid.appendChild(card);
    });
  }
});
