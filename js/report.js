/* ============================================
   BrandGuard AR — Report Module
   Dynamic compliance analysis & report rendering
   ============================================ */

const Report = (() => {

  // Color distance utility (Euclidean in RGB space)
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  function colorDistance(hex1, hex2) {
    const c1 = hexToRgb(hex1);
    const c2 = hexToRgb(hex2);
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }

  // Generate a report from AI findings
  function generateReport(aiResult, brandRules) {
    const rules = brandRules || BrandConfig.getActiveRules();
    const findings = aiResult?.findings || [];

    const passed = findings.filter(f => f.status === 'pass').length;
    const warnings = findings.filter(f => f.status === 'warning').length;
    const failed = findings.filter(f => f.status === 'fail').length;

    return {
      timestamp: new Date().toISOString(),
      brandName: rules.name,
      brandDetected: aiResult?.brandDetected || 'Unknown',
      overallScore: aiResult?.overallScore || 0,
      aiPowered: aiResult?.aiPowered || false,
      totalIssues: warnings + failed,
      passed,
      warnings,
      failed,
      findings,
    };
  }

  // Update the results screen with report data
  function updateResultsUI(report) {
    // Score ring
    const scoreValue = document.getElementById('score-value');
    const scoreRingFill = document.getElementById('score-ring-fill');
    if (scoreValue) scoreValue.textContent = report.overallScore;
    if (scoreRingFill) {
      const circumference = 2 * Math.PI * 52;
      const offset = circumference - (report.overallScore / 100) * circumference;
      scoreRingFill.style.strokeDasharray = circumference;
      scoreRingFill.style.strokeDashoffset = offset;

      // Color based on score
      let color = '#EF4444'; // red
      if (report.overallScore >= 80) color = '#059669'; // green
      else if (report.overallScore >= 60) color = '#D97706'; // yellow
      scoreRingFill.style.stroke = color;
    }

    // Brand info
    const detectedName = document.getElementById('detected-brand-name');
    const checkingName = document.getElementById('checking-brand-name');
    if (detectedName) detectedName.textContent = report.brandDetected;
    if (checkingName) checkingName.textContent = report.brandName;

    // AI powered tag
    const aiTag = document.getElementById('ai-powered-tag');
    if (aiTag) aiTag.style.display = report.aiPowered ? 'inline-flex' : 'none';

    // Summary counts
    const countPassed = document.getElementById('count-passed');
    const countWarnings = document.getElementById('count-warnings');
    const countFailed = document.getElementById('count-failed');
    if (countPassed) countPassed.textContent = report.passed;
    if (countWarnings) countWarnings.textContent = report.warnings;
    if (countFailed) countFailed.textContent = report.failed;

    // Findings badge in sidebar
    const findingsBadge = document.getElementById('findings-badge');
    if (findingsBadge) {
      const issueCount = report.warnings + report.failed;
      findingsBadge.textContent = issueCount;
      findingsBadge.style.display = issueCount > 0 ? 'inline-flex' : 'none';
    }

    // Render extracted colors from the scanned image
    const colorsSection = document.getElementById('extracted-colors-section');
    const colorsGrid = document.getElementById('extracted-colors-grid');
    if (colorsSection && colorsGrid && report.dominantColors && report.dominantColors.length > 0) {
      colorsSection.style.display = 'block';
      const brandRules = BrandConfig.getActiveRules();
      const expectedColors = [brandRules.colors.primary, brandRules.colors.secondary, brandRules.colors.accent].filter(Boolean);

      colorsGrid.innerHTML = report.dominantColors.map(color => {
        // Check if color is close to any expected brand color
        const isMatch = expectedColors.some(exp => colorDistance(color, exp) < 80);
        const isProhibited = (brandRules.prohibitedColors || []).some(p => colorDistance(color, p) < 60);
        const status = isProhibited ? 'prohibited' : isMatch ? 'match' : 'neutral';
        const statusIcon = isProhibited ? 'block' : isMatch ? 'check_circle' : 'circle';
        const statusColor = isProhibited ? 'var(--red-600)' : isMatch ? 'var(--green-600)' : 'var(--text-muted)';
        const statusLabel = isProhibited ? 'Prohibited' : isMatch ? 'Brand Match' : 'Detected';

        return `
          <div class="extracted-color-card ${status}">
            <div class="extracted-color-swatch" style="background:${color}"></div>
            <div class="extracted-color-info">
              <span class="extracted-color-hex">${color}</span>
              <span class="extracted-color-status" style="color:${statusColor}">
                <span class="material-symbols-rounded" style="font-size:12px">${statusIcon}</span>
                ${statusLabel}
              </span>
            </div>
          </div>
        `;
      }).join('');
    } else if (colorsSection) {
      colorsSection.style.display = 'none';
    }

    // Render compliance cards
    const cardsContainer = document.getElementById('compliance-cards');
    if (cardsContainer) {
      cardsContainer.innerHTML = '';

      report.findings.forEach(finding => {
        const card = document.createElement('div');
        card.className = 'compliance-card';

        const statusIcon = finding.status === 'pass' ? 'check' :
                           finding.status === 'warning' ? 'warning' : 'close';
        const statusLabel = finding.status.toUpperCase();

        let detailsHTML = '';

        // Color swatch comparison if found/expected look like hex colors
        if (finding.details?.foundValue && finding.details?.expectedValue) {
          const isColor = /^#[0-9a-fA-F]{3,8}$/.test(finding.details.foundValue) &&
                          /^#[0-9a-fA-F]{3,8}$/.test(finding.details.expectedValue);
          if (isColor) {
            detailsHTML = `
              <div class="color-swatches">
                <div class="color-swatch">
                  <div class="swatch-circle" style="background: ${finding.details.foundValue};"></div>
                  <div class="swatch-info">
                    <div class="swatch-label">Found</div>
                    <div class="swatch-hex">${finding.details.foundValue}</div>
                  </div>
                </div>
                <span class="color-arrow">→</span>
                <div class="color-swatch">
                  <div class="swatch-circle" style="background: ${finding.details.expectedValue};"></div>
                  <div class="swatch-info">
                    <div class="swatch-label">Expected</div>
                    <div class="swatch-hex">${finding.details.expectedValue}</div>
                  </div>
                </div>
              </div>
            `;
          } else {
            detailsHTML = `
              <div class="finding-details-row">
                <span class="detail-found">Found: <strong>${finding.details.foundValue}</strong></span>
                <span class="detail-arrow">→</span>
                <span class="detail-expected">Expected: <strong>${finding.details.expectedValue}</strong></span>
              </div>
            `;
          }
        }

        const suggestionHTML = finding.suggestion && finding.suggestion !== 'N/A'
          ? `<div class="finding-suggestion">
               <span class="material-symbols-rounded" style="font-size:14px; color: var(--blue-600)">auto_fix_high</span>
               ${finding.suggestion}
             </div>`
          : '';

        const confidenceHTML = finding.confidence
          ? `<span class="confidence-chip">${finding.confidence}% confidence</span>`
          : '';

        card.innerHTML = `
          <div class="card-header">
            <div class="card-title-group">
              <div class="status-icon ${finding.status}">
                <span class="material-symbols-rounded">${statusIcon}</span>
              </div>
              <span class="card-title">${finding.category}</span>
              ${confidenceHTML}
            </div>
            <span class="status-badge ${finding.status}">${statusLabel}</span>
          </div>
          <div class="card-body">
            <p class="card-description">${finding.description}</p>
            ${detailsHTML}
            ${suggestionHTML}
          </div>
        `;

        cardsContainer.appendChild(card);
      });
    }
  }

  // Export report as text/download
  function exportReport(report) {
    const lines = [
      '===========================================',
      `  BrandGuard AR — Compliance Report`,
      '===========================================',
      '',
      `Date: ${new Date(report.timestamp).toLocaleString()}`,
      `Brand Checked: ${report.brandName}`,
      `Brand Detected: ${report.brandDetected}`,
      `Overall Score: ${report.overallScore}%`,
      `Total Issues: ${report.totalIssues}`,
      `Analysis: ${report.aiPowered ? 'AI-Powered (Google Gemini)' : 'Demo Mode'}`,
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

      if (finding.details?.foundValue) {
        lines.push(`   Found: ${finding.details.foundValue} → Expected: ${finding.details.expectedValue}`);
      }
      if (finding.suggestion && finding.suggestion !== 'N/A') {
        lines.push(`   💡 Suggestion: ${finding.suggestion}`);
      }
      if (finding.confidence) {
        lines.push(`   Confidence: ${finding.confidence}%`);
      }
      lines.push('');
    });

    lines.push('-------------------------------------------');
    lines.push('  Generated by BrandGuard AR (thebrand.ai)');
    lines.push('  AI Engine: Google Gemini Vision');
    lines.push('===========================================');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brandguard-report-${report.brandName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    generateReport,
    updateResultsUI,
    exportReport,
  };
})();
