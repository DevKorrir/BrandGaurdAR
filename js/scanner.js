/* ============================================
   BrandGuard AR — Scanner Module
   Camera access, image analysis, AR overlays
   Updated for AI-powered scanning
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
    analyzingText: null,
    scanLine: null,
    issuesBadge: null,
    issuesText: null,
    tooltipFinding: null,
    tooltipCategory: null,
    tooltipText: null,
    tooltipSuggestion: null,
    tooltipLabel: null,
    matchBadge: null,
    matchBadgeText: null,
  };

  function init() {
    elements.video = document.getElementById('camera-feed');
    elements.uploadedImage = document.getElementById('uploaded-image');
    elements.canvas = document.getElementById('ar-canvas');
    elements.ctx = elements.canvas?.getContext('2d');
    elements.placeholder = document.getElementById('scan-placeholder');
    elements.analyzingOverlay = document.getElementById('analyzing-overlay');
    elements.analyzingText = document.getElementById('analyzing-text');
    elements.scanLine = document.getElementById('scan-line');
    elements.issuesBadge = document.getElementById('scan-issues-badge');
    elements.issuesText = document.getElementById('scan-issues-text');
    elements.tooltipFinding = document.getElementById('tooltip-finding');
    elements.tooltipCategory = document.getElementById('tooltip-finding-category');
    elements.tooltipText = document.getElementById('tooltip-finding-text');
    elements.tooltipSuggestion = document.getElementById('tooltip-finding-suggestion');
    elements.tooltipLabel = document.getElementById('tooltip-finding-label');
    elements.matchBadge = document.getElementById('match-badge');
    elements.matchBadgeText = document.getElementById('match-badge-text');
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
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("No file provided"));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        elements.uploadedImage.onload = () => {
          elements.uploadedImage.style.display = 'block';
          elements.video.style.display = 'none';
          elements.placeholder.style.display = 'none';

          // Stop camera if running
          stopCamera();
          resizeCanvas();
          resolve();
        };
        elements.uploadedImage.onerror = reject;
        elements.uploadedImage.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

  // Show analyzing state
  function showAnalyzing(message) {
    if (elements.analyzingText) {
      elements.analyzingText.textContent = message || 'Analyzing brand assets with AI...';
    }
    if (elements.scanLine) {
      elements.scanLine.classList.add('scanning');
    }
    if (elements.analyzingOverlay) {
      elements.analyzingOverlay.classList.add('visible');
    }
    isScanning = true;
  }

  // Hide analyzing state
  function hideAnalyzing() {
    if (elements.analyzingOverlay) {
      elements.analyzingOverlay.classList.remove('visible');
    }
    if (elements.scanLine) {
      elements.scanLine.classList.remove('scanning');
    }
    isScanning = false;
  }

  // Draw AR overlays based on actual AI findings
  function drawAROverlays(findings) {
    if (!elements.ctx || !elements.canvas) return;
    if (!findings || findings.length === 0) return;

    const w = elements.canvas.width;
    const h = elements.canvas.height;
    const ctx = elements.ctx;

    ctx.clearRect(0, 0, w, h);

    // Position findings across the viewport
    findings.forEach((finding, i) => {
      const cols = Math.min(findings.length, 3);
      const row = Math.floor(i / cols);
      const col = i % cols;

      const cellW = w / cols;
      const cellH = h / Math.ceil(findings.length / cols);
      const cx = cellW * col + cellW / 2;
      const cy = cellH * row + cellH / 2;

      if (finding.status === 'pass') {
        // Green circle with checkmark
        const r = Math.min(cellW, cellH) * 0.18;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.lineWidth = 10;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Checkmark
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.3, cy);
        ctx.lineTo(cx - r * 0.05, cy + r * 0.25);
        ctx.lineTo(cx + r * 0.35, cy - r * 0.2);
        ctx.strokeStyle = '#22C55E';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      } else if (finding.status === 'fail') {
        // Red dashed rectangle
        const rw = cellW * 0.6;
        const rh = cellH * 0.35;
        const rx = cx - rw / 2;
        const ry = cy - rh / 2;

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.lineWidth = 8;
        ctx.strokeRect(rx - 3, ry - 3, rw + 6, rh + 6);

        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.setLineDash([]);

        // X mark
        const xSize = 8;
        ctx.beginPath();
        ctx.moveTo(cx - xSize, cy - xSize);
        ctx.lineTo(cx + xSize, cy + xSize);
        ctx.moveTo(cx + xSize, cy - xSize);
        ctx.lineTo(cx - xSize, cy + xSize);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Warning — Yellow rectangle with corner markers
        const rw = cellW * 0.55;
        const rh = cellH * 0.3;
        const rx = cx - rw / 2;
        const ry = cy - rh / 2;

        ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
        ctx.lineWidth = 6;
        ctx.strokeRect(rx - 2, ry - 2, rw + 4, rh + 4);

        ctx.strokeStyle = '#EAB308';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx, ry, rw, rh);

        // Corner markers
        const cLen = 10;
        ctx.strokeStyle = '#EAB308';
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(rx, ry + cLen);
        ctx.lineTo(rx, ry);
        ctx.lineTo(rx + cLen, ry);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rx + rw - cLen, ry);
        ctx.lineTo(rx + rw, ry);
        ctx.lineTo(rx + rw, ry + cLen);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rx, ry + rh - cLen);
        ctx.lineTo(rx, ry + rh);
        ctx.lineTo(rx + cLen, ry + rh);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(rx + rw - cLen, ry + rh);
        ctx.lineTo(rx + rw, ry + rh);
        ctx.lineTo(rx + rw, ry + rh - cLen);
        ctx.stroke();
      }
    });
  }

  // Show AR tooltip and badges with AI data
  function showARElements(report) {
    if (!report || !report.findings) return;

    const findings = report.findings;
    const issueCount = findings.filter(f => f.status !== 'pass').length;

    // Update issues badge
    setTimeout(() => {
      if (elements.issuesBadge) elements.issuesBadge.classList.add('visible');
      if (elements.issuesText) {
        elements.issuesText.textContent = issueCount > 0
          ? `${issueCount} Issue${issueCount > 1 ? 's' : ''} Found`
          : 'All Checks Passed!';
      }
    }, 200);

    // Show the first non-pass finding as tooltip
    const firstIssue = findings.find(f => f.status !== 'pass') || findings[0];
    if (firstIssue) {
      setTimeout(() => {
        if (elements.tooltipFinding) elements.tooltipFinding.classList.add('visible');
        if (elements.tooltipCategory) elements.tooltipCategory.textContent = firstIssue.category.toUpperCase();
        if (elements.tooltipText) elements.tooltipText.textContent = firstIssue.description;
        if (elements.tooltipSuggestion) elements.tooltipSuggestion.textContent = firstIssue.suggestion || '';
        if (elements.tooltipLabel) {
          elements.tooltipLabel.className = `tooltip-label ${firstIssue.status === 'fail' ? 'fail' : 'warning'}`;
          const icon = elements.tooltipLabel.querySelector('.material-symbols-rounded');
          if (icon) icon.textContent = firstIssue.status === 'fail' ? 'error' : 'warning';
        }
      }, 600);
    }

    // Update match badge
    setTimeout(() => {
      if (elements.matchBadge) elements.matchBadge.classList.add('visible');
      if (elements.matchBadgeText) elements.matchBadgeText.textContent = `Match: ${report.overallScore}%`;
    }, 1000);
  }

  // Hide AR overlays
  function hideAROverlays() {
    if (elements.ctx && elements.canvas) {
      elements.ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    }
    if (elements.issuesBadge) elements.issuesBadge.classList.remove('visible');
    if (elements.tooltipFinding) elements.tooltipFinding.classList.remove('visible');
    if (elements.matchBadge) elements.matchBadge.classList.remove('visible');
    if (elements.scanLine) elements.scanLine.classList.remove('scanning');
    if (elements.analyzingOverlay) elements.analyzingOverlay.classList.remove('visible');

    if (scanTimeout) {
      clearTimeout(scanTimeout);
      scanTimeout = null;
    }
  }

  // Capture current frame as base64
  function captureImageBase64() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');

    if (elements.uploadedImage && elements.uploadedImage.src && elements.uploadedImage.style.display !== 'none' && !elements.uploadedImage.src.endsWith('#')) {
      tempCanvas.width = elements.uploadedImage.naturalWidth;
      tempCanvas.height = elements.uploadedImage.naturalHeight;
      tempCtx.drawImage(elements.uploadedImage, 0, 0);
    } else if (elements.video && elements.video.srcObject) {
      tempCanvas.width = elements.video.videoWidth;
      tempCanvas.height = elements.video.videoHeight;
      tempCtx.drawImage(elements.video, 0, 0);
    } else {
      console.warn("captureImageBase64: Neither uploadedImage nor video has a source");
      return null;
    }

    return tempCanvas.toDataURL('image/jpeg', 0.85);
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
    showAnalyzing,
    hideAnalyzing,
    drawAROverlays,
    showARElements,
    captureImageBase64,
    extractDominantColors,
    hideAROverlays,
    resizeCanvas,
    showPlaceholder,
    get isScanning() { return isScanning; },
  };
})();
