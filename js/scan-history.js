/* ============================================
   BrandGuard AR — Scan History Module
   Stores scan results in localStorage for
   dynamic dashboard, recent scans, and reports
   ============================================ */

const ScanHistory = (() => {
  const STORAGE_KEY = 'brandguard_scan_history';
  const MAX_HISTORY = 50;

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (_) {
      return [];
    }
  }

  function save(scanRecord) {
    const history = getAll();
    history.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      brandId: scanRecord.brandId || 'unknown',
      brandName: scanRecord.brandName || 'Unknown',
      brandDetected: scanRecord.brandDetected || 'Unknown',
      overallScore: scanRecord.overallScore || 0,
      aiPowered: scanRecord.aiPowered || false,
      passed: scanRecord.passed || 0,
      warnings: scanRecord.warnings || 0,
      failed: scanRecord.failed || 0,
      totalIssues: scanRecord.totalIssues || 0,
      findings: scanRecord.findings || [],
      thumbnail: scanRecord.thumbnail || null, // small base64 thumbnail
      dominantColors: scanRecord.dominantColors || [],
    });

    // Trim to max
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return history;
  }

  function getRecent(count = 5) {
    return getAll().slice(0, count);
  }

  function getTodayScans() {
    const today = new Date().toDateString();
    return getAll().filter(s => new Date(s.timestamp).toDateString() === today);
  }

  function getStats() {
    const all = getAll();
    const today = getTodayScans();

    const avgScore = all.length > 0
      ? Math.round(all.reduce((sum, s) => sum + s.overallScore, 0) / all.length)
      : 0;

    const totalIssues = all.reduce((sum, s) => sum + s.totalIssues, 0);
    const uniqueStores = new Set(all.map(s => s.brandName)).size;

    // Calculate trends (compare today vs yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toDateString();
    const yesterdayScans = all.filter(s => new Date(s.timestamp).toDateString() === yestStr);

    const scansTrend = yesterdayScans.length > 0
      ? Math.round(((today.length - yesterdayScans.length) / yesterdayScans.length) * 100)
      : (today.length > 0 ? 100 : 0);

    return {
      scansToday: today.length,
      avgCompliance: avgScore,
      totalIssues,
      storesAudited: uniqueStores,
      totalScans: all.length,
      scansTrend,
    };
  }

  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Generate a small thumbnail from base64 image
  function createThumbnail(base64, maxSize = 100) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.5));
      };
      img.onerror = () => resolve(null);
      img.src = base64;
    });
  }

  return {
    getAll,
    save,
    getRecent,
    getTodayScans,
    getStats,
    clearAll,
    createThumbnail,
  };
})();
