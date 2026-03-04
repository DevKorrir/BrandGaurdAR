/* ============================================
   BrandGuard AR — Main App Controller
   Navigation, events, map initialization
   Desktop website version
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize scanner module
  Scanner.init();

  // ---- Screen Navigation ----
  const screens = {
    welcome: document.getElementById('screen-welcome'),
    scan: document.getElementById('screen-scan'),
    results: document.getElementById('screen-results'),
    stores: document.getElementById('screen-stores'),
    history: document.getElementById('screen-history'),
  };

  let currentScreen = 'welcome';
  let currentReport = null;

  function navigateTo(screenName) {
    if (screenName === currentScreen) return;

    const current = screens[currentScreen];
    const target = screens[screenName];
    if (!target) return;

    // Cleanup previous screen
    if (currentScreen === 'scan') {
      Scanner.stopCamera();
      Scanner.hideAROverlays();
    }

    // Hide current screen
    if (current) {
      current.classList.remove('active');
    }

    // Show target screen
    target.classList.remove('active');
    // Force reflow for animation
    void target.offsetWidth;
    target.classList.add('active');

    // Update sidebar items
    document.querySelectorAll('.sidebar-item[data-screen]').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screenName);
    });

    // Screen-specific actions
    if (screenName === 'scan') {
      Scanner.startCamera();
    }

    if (screenName === 'history') {
      setTimeout(initMap, 200);
    }

    currentScreen = screenName;
  }

  // ---- Sidebar Navigation ----
  document.querySelectorAll('.sidebar-item[data-screen]').forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      if (screen) navigateTo(screen);
    });
  });

  // ---- Welcome Screen Actions ----

  // Start Scan card
  const btnStartScan = document.getElementById('btn-start-scan');
  if (btnStartScan) {
    btnStartScan.addEventListener('click', () => navigateTo('scan'));
  }

  // Upload Photo card
  const btnUploadPhoto = document.getElementById('btn-upload-photo');
  const fileInput = document.getElementById('file-input');

  if (btnUploadPhoto && fileInput) {
    btnUploadPhoto.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        navigateTo('scan');
        setTimeout(() => Scanner.showUploadedImage(file), 300);
      }
    });
  }

  // ---- Scan Screen Actions ----

  // Upload button inside scan screen
  const btnUploadInScan = document.getElementById('btn-upload-in-scan');
  const fileInputScan = document.getElementById('file-input-scan');

  if (btnUploadInScan && fileInputScan) {
    btnUploadInScan.addEventListener('click', () => fileInputScan.click());

    fileInputScan.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        Scanner.showUploadedImage(file);
      }
    });
  }

  // Shutter / Capture button
  const btnShutter = document.getElementById('btn-shutter');
  if (btnShutter) {
    btnShutter.addEventListener('click', () => {
      if (Scanner.isScanning) return;

      // Disable button during scan
      btnShutter.disabled = true;
      btnShutter.innerHTML = `
        <span class="material-symbols-rounded" style="font-size:18px; animation: spin 0.8s linear infinite;">sync</span>
        Analyzing...
      `;

      Scanner.startAnalysis();

      // After analysis, generate report and navigate
      setTimeout(() => {
        currentReport = Report.generateReport();
        Report.updateResultsUI(currentReport);

        btnShutter.disabled = false;
        btnShutter.innerHTML = `
          <span class="material-symbols-rounded" style="font-size:18px">center_focus_strong</span>
          Capture & Analyze
        `;

        setTimeout(() => navigateTo('results'), 500);
      }, 3000);
    });
  }

  // ---- Results Screen Actions ----

  // Save to Project
  const btnSaveProject = document.getElementById('btn-save-project');
  if (btnSaveProject) {
    btnSaveProject.addEventListener('click', () => {
      btnSaveProject.innerHTML = `
        <span class="material-symbols-rounded" style="font-size:20px">check_circle</span>
        Saved to Project!
      `;
      btnSaveProject.style.background = 'var(--green-600)';

      setTimeout(() => {
        btnSaveProject.innerHTML = `
          <span class="material-symbols-rounded" style="font-size:20px">save</span>
          Save to Project
        `;
        btnSaveProject.style.background = '';
      }, 2500);
    });
  }

  // New Scan
  const btnScanAgain = document.getElementById('btn-scan-again');
  if (btnScanAgain) {
    btnScanAgain.addEventListener('click', () => navigateTo('welcome'));
  }

  // Download Report
  const btnShareReport = document.getElementById('btn-share-report');
  if (btnShareReport) {
    btnShareReport.addEventListener('click', () => {
      const report = currentReport || Report.generateReport();
      Report.exportReport(report);
    });
  }

  // ---- Store Cards ----
  document.querySelectorAll('.store-card').forEach(card => {
    card.addEventListener('click', () => navigateTo('history'));
  });

  // ---- Map Initialization ----
  let mapInitialized = false;

  function initMap() {
    if (mapInitialized) return;

    try {
      const map = L.map('map', {
        zoomControl: true,
        attributionControl: false,
      }).setView([47.6062, -122.3321], 13);

      // Standard clean tiles (light theme)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Marker icons
      const markerIcon = (color) => L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 14px;
          height: 14px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      // Store locations
      const stores = [
        { lat: 47.6062, lng: -122.3321, name: 'Downtown Seattle #402', score: 96, color: '#059669' },
        { lat: 47.6163, lng: -122.2009, name: 'Bellevue Mall Kiosk', score: 74, color: '#D97706' },
        { lat: 47.6088, lng: -122.3402, name: 'Pike Place Flagship', score: 92, color: '#059669' },
        { lat: 47.6116, lng: -122.3376, name: 'Westlake Center', score: 0, color: '#4361EE' },
        { lat: 47.6150, lng: -122.3210, name: 'Capitol Hill Branch', score: 89, color: '#059669' },
        { lat: 47.6580, lng: -122.3130, name: 'University District', score: 91, color: '#059669' },
      ];

      stores.forEach(store => {
        const marker = L.marker([store.lat, store.lng], {
          icon: markerIcon(store.color),
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 13px; padding: 4px; min-width: 140px;">
            <strong>${store.name}</strong><br>
            <span style="color: ${store.color}; font-weight: 700;">
              ${store.score > 0 ? `${store.score}% Compliant` : 'Analyzing...'}
            </span>
          </div>
        `);
      });

      setTimeout(() => map.invalidateSize(), 300);
      mapInitialized = true;
    } catch (err) {
      console.warn('Map initialization failed:', err);
    }
  }

  // ---- Window Resize ----
  window.addEventListener('resize', () => {
    if (currentScreen === 'scan') Scanner.resizeCanvas();
  });

  // ---- Keyboard shortcuts (for demo) ----
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT') return;

    switch (e.key) {
      case '1': navigateTo('welcome'); break;
      case '2': navigateTo('scan'); break;
      case '3': navigateTo('results'); break;
      case '4': navigateTo('stores'); break;
      case '5': navigateTo('history'); break;
    }
  });
});
