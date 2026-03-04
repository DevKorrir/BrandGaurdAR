/* ============================================
   BrandGuard AR — Report Module
   Compliance analysis & report generation
   ============================================ */

const Report = (() => {
  // Demo brand guidelines (simulated brand data)
  const brandGuidelines = {
    name: 'Coffee Chain Inc.',
    colors: {
      primary: '#FF0000',
      secondary: '#1A1A2E',
      accent: '#FFFFFF',
    },
    fonts: {
      heading: 'Brand Sans',
      body: 'Brand Sans',
    },
    logoInfo: {
      minClearSpace: '2x',
      minSize: '24px',
    },
  };

  // Generate a simulated compliance report
  function generateReport(imageData) {
    // In production, this would call BrandWiz AI or TensorFlow.js
    // For demo, we return realistic sample data
    const report = {
      timestamp: new Date().toISOString(),
      overallScore: 72,
      totalIssues: 3,
      findings: [
        {
          id: 'logo-placement',
          category: 'Logo Placement',
          status: 'pass',
          description: 'Correct. Clear space rules respected on all sides.',
          details: {
            clearSpace: 'Minimum 2x clear space maintained',
            version: 'Primary logo (horizontal)',
          },
        },
        {
          id: 'color-mismatch',
          category: 'Color Mismatch',
          status: 'warning',
          description: 'Menu Header Red deviates from brand guidelines.',
          details: {
            foundColor: '#E33333',
            targetColor: '#FF0000',
            matchPercentage: 85,
            location: 'Header background',
          },
        },
        {
          id: 'font-usage',
          category: 'Font Usage',
          status: 'fail',
          description: 'Body text uses Arial instead of Brand Sans.',
          details: {
            foundFont: 'Arial',
            targetFont: 'Brand Sans',
            location: 'Menu body text',
          },
        },
      ],
    };

    return report;
  }

  // Calculate color similarity (0-100%)
  function colorSimilarity(hex1, hex2) {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);

    if (!rgb1 || !rgb2) return 0;

    const distance = Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
      Math.pow(rgb1.g - rgb2.g, 2) +
      Math.pow(rgb1.b - rgb2.b, 2)
    );

    // Max distance is sqrt(3 * 255^2) ≈ 441.67
    const maxDistance = 441.67;
    return Math.round((1 - distance / maxDistance) * 100);
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  // Update the results screen with report data
  function updateResultsUI(report) {
    // Update total issues count
    const totalEl = document.getElementById('total-issues');
    if (totalEl) {
      totalEl.textContent = report.totalIssues;
    }

    // Update color swatches if there's a color finding
    const colorFinding = report.findings.find(f => f.id === 'color-mismatch');
    if (colorFinding) {
      const swatchFound = document.getElementById('swatch-found');
      const swatchTarget = document.getElementById('swatch-target');
      const hexFound = document.getElementById('hex-found');
      const hexTarget = document.getElementById('hex-target');

      if (swatchFound) swatchFound.style.background = colorFinding.details.foundColor;
      if (swatchTarget) swatchTarget.style.background = colorFinding.details.targetColor;
      if (hexFound) hexFound.textContent = colorFinding.details.foundColor;
      if (hexTarget) hexTarget.textContent = colorFinding.details.targetColor;
    }
  }

  // Export report as text/download
  function exportReport(report) {
    const lines = [
      '===========================================',
      '  BrandGuard AR — Compliance Report',
      '===========================================',
      '',
      `Date: ${new Date(report.timestamp).toLocaleString()}`,
      `Overall Score: ${report.overallScore}%`,
      `Total Issues: ${report.totalIssues}`,
      '',
      '-------------------------------------------',
      '  FINDINGS',
      '-------------------------------------------',
      '',
    ];

    report.findings.forEach((finding, i) => {
      const statusEmoji =
        finding.status === 'pass' ? '✅' :
        finding.status === 'warning' ? '⚠️' : '❌';

      lines.push(`${i + 1}. ${statusEmoji} ${finding.category} — ${finding.status.toUpperCase()}`);
      lines.push(`   ${finding.description}`);

      if (finding.details.foundColor) {
        lines.push(`   Found: ${finding.details.foundColor} → Target: ${finding.details.targetColor}`);
        lines.push(`   Match: ${finding.details.matchPercentage}%`);
      }
      if (finding.details.foundFont) {
        lines.push(`   Found: ${finding.details.foundFont} → Required: ${finding.details.targetFont}`);
      }
      lines.push('');
    });

    lines.push('-------------------------------------------');
    lines.push('  Generated by BrandGuard AR (thebrand.ai)');
    lines.push('===========================================');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandguard-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    brandGuidelines,
    generateReport,
    colorSimilarity,
    updateResultsUI,
    exportReport,
  };
})();
