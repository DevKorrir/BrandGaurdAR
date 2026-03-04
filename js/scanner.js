/* ============================================
   BrandGuard AR — Scanner Module
   Camera access, image analysis, AR overlays
   ============================================ */

const Scanner = (() => {
  let stream = null;
  let isScanning = false;
  let scanTimeout = null;

  const elements = {
    video: null,
    uploadedImage: null,
    canvas: null,
    ctx: null,
    placeholder: null,
    analyzingOverlay: null,
    scanLine: null,
    issuesBadge: null,
    tooltipFont: null,
    matchBadge: null,
  };

  function init() {
    elements.video = document.getElementById('camera-feed');
    elements.uploadedImage = document.getElementById('uploaded-image');
    elements.canvas = document.getElementById('ar-canvas');
    elements.ctx = elements.canvas?.getContext('2d');
    elements.placeholder = document.getElementById('scan-placeholder');
    elements.analyzingOverlay = document.getElementById('analyzing-overlay');
    elements.scanLine = document.getElementById('scan-line');
    elements.issuesBadge = document.getElementById('scan-issues-badge');
    elements.tooltipFont = document.getElementById('tooltip-font');
    elements.matchBadge = document.getElementById('match-badge');
  }

  // Start webcam
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      elements.video.srcObject = stream;
      elements.video.style.display = 'block';
      elements.uploadedImage.style.display = 'none';
      elements.placeholder.style.display = 'none';

      // Wait for video to load then resize canvas
      elements.video.addEventListener('loadedmetadata', () => {
        resizeCanvas();
      });

      return true;
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      showPlaceholder();
      return false;
    }
  }

  // Stop webcam
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    if (elements.video) {
      elements.video.srcObject = null;
    }
    hideAROverlays();
  }

  // Show uploaded image
  function showUploadedImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      elements.uploadedImage.src = e.target.result;
      elements.uploadedImage.style.display = 'block';
      elements.video.style.display = 'none';
      elements.placeholder.style.display = 'none';

      // Stop camera if running
      stopCamera();

      elements.uploadedImage.onload = () => {
        resizeCanvas();
        startAnalysis();
      };
    };
    reader.readAsDataURL(file);
  }

  function showPlaceholder() {
    if (elements.placeholder) {
      elements.placeholder.style.display = 'flex';
    }
  }

  // Resize canvas to match viewport
  function resizeCanvas() {
    const viewport = document.getElementById('scan-viewport');
    if (viewport && elements.canvas) {
      elements.canvas.width = viewport.offsetWidth;
      elements.canvas.height = viewport.offsetHeight;
    }
  }

  // Start scanning analysis (simulated)
  function startAnalysis() {
    isScanning = true;

    // Show scan line animation
    if (elements.scanLine) {
      elements.scanLine.classList.add('scanning');
    }

    // Show analyzing overlay briefly
    if (elements.analyzingOverlay) {
      elements.analyzingOverlay.classList.add('visible');
    }

    // Simulate ML processing delay
    scanTimeout = setTimeout(() => {
      // Hide analyzing overlay
      if (elements.analyzingOverlay) {
        elements.analyzingOverlay.classList.remove('visible');
      }

      // Stop scan line
      if (elements.scanLine) {
        elements.scanLine.classList.remove('scanning');
      }

      // Draw AR overlays
      drawAROverlays();

      // Show badges and tooltips
      showARElements();

      isScanning = false;
    }, 2500);
  }

  // Draw AR overlay elements on canvas
  function drawAROverlays() {
    if (!elements.ctx || !elements.canvas) return;

    const w = elements.canvas.width;
    const h = elements.canvas.height;
    const ctx = elements.ctx;

    ctx.clearRect(0, 0, w, h);

    // === Green circle for logo (pass) ===
    const logoX = w * 0.35;
    const logoY = h * 0.55;
    const logoR = Math.min(w, h) * 0.12;

    // Glow effect
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoR + 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.lineWidth = 12;
    ctx.stroke();

    // Main circle
    ctx.beginPath();
    ctx.arc(logoX, logoY, logoR, 0, Math.PI * 2);
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Checkmark inside
    ctx.beginPath();
    ctx.moveTo(logoX - logoR * 0.3, logoY);
    ctx.lineTo(logoX - logoR * 0.05, logoY + logoR * 0.25);
    ctx.lineTo(logoX + logoR * 0.35, logoY - logoR * 0.2);
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // === Red rectangle for font issue (fail) ===
    const fontX = w * 0.55;
    const fontY = h * 0.3;
    const fontW = w * 0.35;
    const fontH = h * 0.12;

    // Glow
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.lineWidth = 8;
    ctx.strokeRect(fontX - 4, fontY - 4, fontW + 8, fontH + 8);

    // Main rectangle
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(fontX, fontY, fontW, fontH);
    ctx.setLineDash([]);

    // === Yellow rectangle for color issue (warning) ===
    const colorX = w * 0.08;
    const colorY = h * 0.18;
    const colorW = w * 0.4;
    const colorH = h * 0.08;

    ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
    ctx.lineWidth = 6;
    ctx.strokeRect(colorX - 3, colorY - 3, colorW + 6, colorH + 6);

    ctx.strokeStyle = '#EAB308';
    ctx.lineWidth = 2;
    ctx.strokeRect(colorX, colorY, colorW, colorH);

    // Corner markers for color box
    const cornerLen = 10;
    ctx.strokeStyle = '#EAB308';
    ctx.lineWidth = 3;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(colorX, colorY + cornerLen);
    ctx.lineTo(colorX, colorY);
    ctx.lineTo(colorX + cornerLen, colorY);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(colorX + colorW - cornerLen, colorY);
    ctx.lineTo(colorX + colorW, colorY);
    ctx.lineTo(colorX + colorW, colorY + cornerLen);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(colorX, colorY + colorH - cornerLen);
    ctx.lineTo(colorX, colorY + colorH);
    ctx.lineTo(colorX + cornerLen, colorY + colorH);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(colorX + colorW - cornerLen, colorY + colorH);
    ctx.lineTo(colorX + colorW, colorY + colorH);
    ctx.lineTo(colorX + colorW, colorY + colorH - cornerLen);
    ctx.stroke();
  }

  // Show AR tooltip, badges etc.
  function showARElements() {
    setTimeout(() => {
      if (elements.issuesBadge) elements.issuesBadge.classList.add('visible');
    }, 200);

    setTimeout(() => {
      if (elements.tooltipFont) elements.tooltipFont.classList.add('visible');
    }, 600);

    setTimeout(() => {
      if (elements.matchBadge) elements.matchBadge.classList.add('visible');
    }, 1000);
  }

  // Hide AR overlays
  function hideAROverlays() {
    if (elements.ctx && elements.canvas) {
      elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    }
    if (elements.issuesBadge) elements.issuesBadge.classList.remove('visible');
    if (elements.tooltipFont) elements.tooltipFont.classList.remove('visible');
    if (elements.matchBadge) elements.matchBadge.classList.remove('visible');
    if (elements.scanLine) elements.scanLine.classList.remove('scanning');
    if (elements.analyzingOverlay) elements.analyzingOverlay.classList.remove('visible');

    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
  }

  // Capture current frame for analysis
  function captureFrame() {
    if (!elements.canvas || !elements.ctx) return null;

    const viewport = document.getElementById('scan-viewport');
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (elements.video && elements.video.srcObject) {
      tempCanvas.width = elements.video.videoWidth;
      tempCanvas.height = elements.video.videoHeight;
      tempCtx.drawImage(elements.video, 0, 0);
    } else if (elements.uploadedImage && elements.uploadedImage.src) {
      tempCanvas.width = elements.uploadedImage.naturalWidth;
      tempCanvas.height = elements.uploadedImage.naturalHeight;
      tempCtx.drawImage(elements.uploadedImage, 0, 0);
    } else {
      return null;
    }

    return tempCanvas;
  }

  // Extract dominant colors from an image
  function extractDominantColors(canvas, sampleSize = 20) {
    if (!canvas) return [];

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;

    const colorCounts = {};
    const step = Math.max(1, Math.floor(data.length / 4 / (sampleSize * sampleSize)));

    for (let i = 0; i < data.length; i += step * 4) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }

    return Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color.toUpperCase());
  }

  return {
    init,
    startCamera,
    stopCamera,
    showUploadedImage,
    startAnalysis,
    captureFrame,
    extractDominantColors,
    hideAROverlays,
    resizeCanvas,
    showPlaceholder,
    get isScanning() { return isScanning; },
  };
})();
