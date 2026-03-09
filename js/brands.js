/* ============================================
   BrandGuard AR — Brand Config Module
   Brand presets & rules management
   ============================================ */

const BrandConfig = (() => {
  const STORAGE_KEY = 'brandguard_active_brand';
  const CUSTOM_BRANDS_KEY = 'brandguard_custom_brands';

  // ---- Built-in Brand Presets ----

  const presets = {
    safaricom: {
      id: 'safaricom',
      name: 'Safaricom',
      tagline: 'The Better Option',
      logo: {
        description: 'Green "Safaricom" wordmark with red swoosh arc',
        minClearSpace: '1.5x logo height',
        mustBeVisible: true,
        acceptableBackgrounds: ['white', 'light gray'],
      },
      colors: {
        primary: '#4CAF50',
        secondary: '#E60000',
        accent: '#FFFFFF',
        background: '#F5F5F5',
        text: '#333333',
      },
      fonts: {
        heading: 'Safaricom Sans Bold',
        body: 'Safaricom Sans Regular',
        alternates: ['Arial', 'Helvetica Neue', 'Helvetica'],
      },
      prohibitedColors: ['#0000FF', '#800080'],
      brandElements: [
        'Green primary color must be dominant',
        'Red accent used sparingly for highlights',
        'White/light backgrounds only',
        'No competitor brand colors (blue/purple)',
        'Tagline "The Better Option" must use approved font',
      ],
      stores: [
        { lat: -1.2864, lng: 36.8172, name: 'Safaricom CBD Shop', score: 94, color: '#059669' },
        { lat: -1.2635, lng: 36.8032, name: 'Westlands Branch', score: 87, color: '#059669' },
        { lat: -1.2190, lng: 36.8869, name: 'Thika Road Mall', score: 71, color: '#D97706' },
        { lat: -1.2322, lng: 36.8799, name: 'Garden City Mall', score: 92, color: '#059669' },
        { lat: -1.3195, lng: 36.7882, name: 'Junction Mall', score: 0, color: '#4361EE' },
        { lat: -1.2999, lng: 36.7749, name: 'Lavington Green', score: 88, color: '#059669' },
      ],
    },

    cocacola: {
      id: 'cocacola',
      name: 'Coca-Cola',
      tagline: 'Taste the Feeling',
      logo: {
        description: 'Classic Spencerian script "Coca-Cola" in white on red, with Dynamic Ribbon',
        minClearSpace: '2x logo height',
        mustBeVisible: true,
        acceptableBackgrounds: ['red', 'white', 'black'],
      },
      colors: {
        primary: '#F40009',
        secondary: '#000000',
        accent: '#FFFFFF',
        background: '#FFFFFF',
        text: '#1A1A1A',
      },
      fonts: {
        heading: 'TCCC Unity Headline',
        body: 'TCCC Unity Regular',
        alternates: ['Gotham', 'Helvetica Neue', 'Arial'],
      },
      prohibitedColors: ['#00B140', '#004B93'],
      brandElements: [
        '"Coca-Cola Red" (#F40009) must be exact — no oranges or crimsons',
        'Spencerian script logo cannot be stretched, tilted, or recolored',
        'Dynamic Ribbon device must appear in approved positions only',
        'Contour bottle silhouette is a protected element',
        'No competitor green (Sprite OK only in sub-brand context)',
      ],
      stores: [
        { lat: -1.2864, lng: 36.8172, name: 'Nairobi Bottlers HQ', score: 96, color: '#059669' },
        { lat: -1.2635, lng: 36.8032, name: 'Westlands Distributor', score: 78, color: '#D97706' },
        { lat: -1.2190, lng: 36.8869, name: 'Thika Road Mall Kiosk', score: 65, color: '#D97706' },
        { lat: -1.3195, lng: 36.7882, name: 'Junction Mall Stand', score: 91, color: '#059669' },
        { lat: -1.0408, lng: 37.0870, name: 'Thika Town', score: 0, color: '#4361EE' },
        { lat: -4.0435, lng: 39.6682, name: 'Mombasa Branch Kiosk', score: 83, color: '#059669' },
      ],
    }
  };

  let activeBrandId = localStorage.getItem(STORAGE_KEY) || 'safaricom';

  // ---- Private Helpers ----

  function getCustomBrandsList() {
    try {
      const stored = localStorage.getItem(CUSTOM_BRANDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function saveCustomBrandsList(brands) {
    localStorage.setItem(CUSTOM_BRANDS_KEY, JSON.stringify(brands));
  }

  // ---- Public API ----

  function getAllBrands() {
    const presetList = Object.keys(presets).map(id => ({
      ...presets[id],
      isPreset: true
    }));
    const customList = getCustomBrandsList().map(b => ({
      ...b,
      isPreset: false
    }));
    return [...presetList, ...customList];
  }

  function getActiveBrand() {
    // Validate active brand exists, otherwise fallback to safaricom
    const all = getAllBrands();
    if (!all.some(b => b.id === activeBrandId)) {
      activeBrandId = 'safaricom';
      localStorage.setItem(STORAGE_KEY, activeBrandId);
    }
    return activeBrandId;
  }

  function getActiveRules() {
    const id = getActiveBrand();
    return getBrandById(id);
  }

  function setActiveBrand(id) {
    const all = getAllBrands();
    if (all.some(b => b.id === id)) {
      activeBrandId = id;
      localStorage.setItem(STORAGE_KEY, id);
      return true;
    }
    return false;
  }

  function getBrandById(id) {
    if (presets[id]) return presets[id];
    const custom = getCustomBrandsList();
    return custom.find(b => b.id === id) || presets.safaricom;
  }

  function saveCustomBrand(brandData) {
    const list = getCustomBrandsList();
    
    // If it's a new brand, generate an ID
    if (!brandData.id || brandData.id === 'new_brand') {
      brandData.id = 'custom_' + Date.now();
    }

    const existingIndex = list.findIndex(b => b.id === brandData.id);
    if (existingIndex >= 0) {
      list[existingIndex] = brandData;
    } else {
      list.push(brandData);
    }

    saveCustomBrandsList(list);
    
    // Set as active
    activeBrandId = brandData.id;
    localStorage.setItem(STORAGE_KEY, activeBrandId);
    
    return brandData;
  }

  function deleteCustomBrand(id) {
    let list = getCustomBrandsList();
    const lenBefore = list.length;
    list = list.filter(b => b.id !== id);
    if (list.length < lenBefore) {
      saveCustomBrandsList(list);
      if (activeBrandId === id) {
        activeBrandId = 'safaricom';
        localStorage.setItem(STORAGE_KEY, activeBrandId);
      }
      return true;
    }
    return false;
  }

  // Build a human-readable summary of brand rules (for AI prompt)
  function getRulesSummary() {
    const r = getActiveRules();
    const lines = [
      `Brand: ${r.name}`,
      `Tagline: ${r.tagline || 'None'}`,
      `Primary Color: ${r.colors?.primary || '#000000'}`,
      `Secondary Color: ${r.colors?.secondary || '#000000'}`,
      `Accent Color: ${r.colors?.accent || '#FFFFFF'}`,
      `Heading Font: ${r.fonts?.heading || 'Default'}`,
      `Body Font: ${r.fonts?.body || 'Default'}`,
      `Logo: ${r.logo?.description || 'No description'}`,
      `Logo Min Clear Space: ${r.logo?.minClearSpace || 'None'}`,
      `Logo Must Be Visible: ${r.logo?.mustBeVisible !== false}`,
    ];

    if (r.prohibitedColors && r.prohibitedColors.length > 0) {
      lines.push(`Prohibited Colors: ${r.prohibitedColors.join(', ')}`);
    }

    if (r.brandElements && r.brandElements.length > 0) {
      lines.push('Brand Rules:');
      r.brandElements.forEach((el, i) => {
        lines.push(`  ${i + 1}. ${el}`);
      });
    }

    return lines.join('\n');
  }

  return {
    getAllBrands,
    getActiveBrand,
    getActiveRules,
    setActiveBrand,
    saveCustomBrand,
    deleteCustomBrand,
    getBrandById,
    getRulesSummary,
  };
})();
