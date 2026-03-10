/* ============================================
   BrandGuard AR — Main App Controller
   Navigation, events, map, brand config wiring
   Fully dynamic — all data driven by scan history
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize modules
  Scanner.init();

  // ---- Theme Toggle ----
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  
  function applyTheme(isDark) {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeIcon) themeIcon.textContent = 'light_mode';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeIcon) themeIcon.textContent = 'dark_mode';
    }
  }

  // Load saved preference or default to light mode
  const savedTheme = localStorage.getItem('brandguard_theme');
  let isDarkMode = savedTheme === 'dark';
  applyTheme(isDarkMode);

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      localStorage.setItem('brandguard_theme', isDarkMode ? 'dark' : 'light');
      applyTheme(isDarkMode);
    });
  }

  // ---- Mobile Menu Toggle ----
  const btnMobileMenu = document.getElementById('btn-mobile-menu');
  const sidebar = document.querySelector('.sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  if (btnMobileMenu && sidebar && sidebarOverlay) {
    function toggleMobileMenu() {
      sidebar.classList.toggle('mobile-open');
      sidebarOverlay.classList.toggle('active');
    }

    btnMobileMenu.addEventListener('click', toggleMobileMenu);
    sidebarOverlay.addEventListener('click', toggleMobileMenu);
    
    // Close sidebar when a navigation item is clicked on mobile
    document.querySelectorAll('.sidebar-item[data-screen]').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('mobile-open');
          sidebarOverlay.classList.remove('active');
        }
      });
    });
  }

  // ---- Screen Navigation ----
  const screens = {
    welcome: document.getElementById('screen-welcome'),
    rules: document.getElementById('screen-rules'),
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
    void target.offsetWidth;
    target.classList.add('active');

    // Update sidebar items
    document.querySelectorAll('.sidebar-item[data-screen]').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screenName);
    });

    // Screen-specific actions
    if (screenName === 'scan') {
      // Don't auto-start camera if we're explicitly navigating here to show an uploaded image
      if (!document.body.classList.contains('is-uploading')) {
        Scanner.startCamera();
      }
      updateGuidelinesPanel();
      updateRecentScansPanel();
    }

    if (screenName === 'welcome') {
      updateDashboardStats();
    }

    if (screenName === 'rules') {
      updateRulesScreen();
    }

    if (screenName === 'history') {
      setTimeout(initMap, 200);
      updateAuditList();
    }

    if (screenName === 'stores') {
      updateStoresScreen();
    }

    currentScreen = screenName;
  }

  // ============================================
  //  DYNAMIC DASHBOARD
  // ============================================

  function updateDashboardStats() {
    const stats = ScanHistory.getStats();

    // Scans Today
    const scansValue = document.getElementById('stat-scans-today');
    const scansTrend = document.getElementById('stat-scans-trend');
    if (scansValue) scansValue.textContent = stats.scansToday;
    if (scansTrend) {
      if (stats.scansTrend > 0) {
        scansTrend.className = 'stat-change up';
        scansTrend.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px">trending_up</span> +${stats.scansTrend}%`;
      } else if (stats.scansTrend < 0) {
        scansTrend.className = 'stat-change down';
        scansTrend.innerHTML = `<span class="material-symbols-rounded" style="font-size:14px">trending_down</span> ${stats.scansTrend}%`;
      } else {
        scansTrend.className = 'stat-change';
        scansTrend.innerHTML = '';
      }
    }

    // Avg Compliance
    const avgValue = document.getElementById('stat-avg-compliance');
    if (avgValue) avgValue.textContent = stats.avgCompliance > 0 ? `${stats.avgCompliance}%` : '—';

    // Issues Found
    const issuesValue = document.getElementById('stat-issues-found');
    if (issuesValue) issuesValue.textContent = stats.totalIssues;

    // Stores Audited
    const storesValue = document.getElementById('stat-stores-audited');
    if (storesValue) storesValue.textContent = stats.storesAudited;

    // Total scans indicator
    const totalIndicator = document.getElementById('total-scans-indicator');
    if (totalIndicator) totalIndicator.textContent = `${stats.totalScans} total scans`;

    // Recent activity on dashboard
    updateDashboardActivity();
  }

  function updateDashboardActivity() {
    const container = document.getElementById('dashboard-recent-activity');
    if (!container) return;

    const recent = ScanHistory.getRecent(4);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="activity-empty">
          <span class="material-symbols-rounded" style="font-size:32px; color:var(--text-muted)">inbox</span>
          <p>No scans yet. Upload or scan a brand asset to get started!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(scan => {
      const time = new Date(scan.timestamp);
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric' });

      const scoreColor = scan.overallScore >= 80 ? 'var(--green-600)' :
                          scan.overallScore >= 60 ? 'var(--yellow-600)' : 'var(--red-600)';
      const scoreClass = scan.overallScore >= 80 ? 'high' : scan.overallScore >= 60 ? 'medium' : 'low';

      // Show dominant colors extracted
      const colorsHtml = (scan.dominantColors || []).slice(0, 4).map(c =>
        `<div class="extracted-color-dot" style="background:${c}" title="${c}"></div>`
      ).join('');

      return `
        <div class="activity-item" data-scan-id="${scan.id}">
          <div class="activity-thumb">
            ${scan.thumbnail
              ? `<img src="${scan.thumbnail}" alt="Scan thumbnail">`
              : `<span class="material-symbols-rounded" style="font-size:24px">image</span>`
            }
          </div>
          <div class="activity-info">
            <div class="activity-brand">${scan.brandName}</div>
            <div class="activity-meta">${dateStr} · ${timeStr} · ${scan.findings.length} findings</div>
            ${colorsHtml ? `<div class="extracted-colors-row">${colorsHtml}</div>` : ''}
          </div>
          <div class="activity-score">
            <span class="activity-score-value" style="color:${scoreColor}">${scan.overallScore}%</span>
            <span class="activity-ai-badge">${scan.aiPowered ? '⚡ AI' : '📋 Demo'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ============================================
  //  BRAND CONFIG INTEGRATION
  // ============================================

  function updateBrandUI() {
    const rules = BrandConfig.getActiveRules();
    const brandId = BrandConfig.getActiveBrand();

    const chipName = document.getElementById('brand-chip-name');
    const brandDot = document.getElementById('brand-dot');
    if (chipName) chipName.textContent = rules.name;
    if (brandDot) brandDot.style.background = rules.colors.primary;

    const quickSelect = document.getElementById('brand-quick-select');
    if (quickSelect) quickSelect.value = brandId;

    const glName = document.getElementById('guidelines-brand-name');
    if (glName) glName.textContent = rules.name;

    // Dynamically render brand tabs
    const tabsContainer = document.getElementById('brand-tabs-container');
    if (tabsContainer) {
      tabsContainer.innerHTML = '';
      BrandConfig.getAllBrands().forEach(b => {
        const btn = document.createElement('button');
        btn.className = `brand-tab ${b.id === brandId ? 'active' : ''}`;
        btn.innerHTML = `
          <span class="brand-tab-dot" style="background:${b.colors?.primary || '#000'}"></span>
          ${b.name || 'Unnamed Brand'}
        `;
        btn.addEventListener('click', () => {
          BrandConfig.setActiveBrand(b.id);
          updateBrandUI();
        });
        tabsContainer.appendChild(btn);
      });
    }

    // Update Quick Select Dropdown
    if (quickSelect) {
      const currentVal = quickSelect.value;
      quickSelect.innerHTML = BrandConfig.getAllBrands().map(b => 
        `<option value="${b.id}">${b.isPreset ? (b.id === 'safaricom' ? '🟢' : '🔴') : '🔵'} ${b.name || 'Unnamed'}</option>`
      ).join('');
      quickSelect.value = brandId; // restore selection
    }

    const histDot = document.getElementById('history-company-dot');
    const histName = document.getElementById('history-company-name');
    if (histDot) histDot.style.background = rules.colors.primary;
    if (histName) histName.textContent = `${rules.name} — Store Audits`;

    if (currentScreen === 'scan') { updateGuidelinesPanel(); updateRecentScansPanel(); }
    if (currentScreen === 'rules') updateRulesScreen();
    if (currentScreen === 'stores') updateStoresScreen();
    if (currentScreen === 'welcome') updateDashboardStats();

    mapInitialized = false;
    if (currentScreen === 'history') { setTimeout(initMap, 200); updateAuditList(); }
  }

  // ============================================
  //  GUIDELINES PANEL (scan sidebar)
  // ============================================

  function updateGuidelinesPanel() {
    const rules = BrandConfig.getActiveRules();
    const container = document.getElementById('guidelines-panel-content');
    if (!container) return;

    container.innerHTML = `
      <div class="guideline-item">
        <span class="gl-label">Primary Color</span>
        <span class="gl-value">
          <span class="color-dot" style="background:${rules.colors.primary}"></span>
          ${rules.colors.primary}
        </span>
      </div>
      <div class="guideline-item">
        <span class="gl-label">Secondary Color</span>
        <span class="gl-value">
          <span class="color-dot" style="background:${rules.colors.secondary}"></span>
          ${rules.colors.secondary}
        </span>
      </div>
      <div class="guideline-item">
        <span class="gl-label">Heading Font</span>
        <span class="gl-value">${rules.fonts.heading}</span>
      </div>
      <div class="guideline-item">
        <span class="gl-label">Body Font</span>
        <span class="gl-value">${rules.fonts.body}</span>
      </div>
      <div class="guideline-item">
        <span class="gl-label">Logo Min Space</span>
        <span class="gl-value">${rules.logo.minClearSpace}</span>
      </div>
    `;
  }

  // ============================================
  //  RECENT SCANS PANEL (scan sidebar)
  // ============================================

  function updateRecentScansPanel() {
    const container = document.getElementById('recent-scans-panel');
    if (!container) return;

    const recent = ScanHistory.getRecent(5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="guideline-item">
          <span class="gl-label">No scans yet</span>
          <span class="gl-value" style="color:var(--text-muted)">—</span>
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(scan => {
      const scoreColor = scan.overallScore >= 80 ? 'var(--green-600)' :
                          scan.overallScore >= 60 ? 'var(--yellow-600)' : 'var(--red-600)';
      const time = new Date(scan.timestamp);
      const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="guideline-item">
          <span class="gl-label">${scan.brandName} · ${timeStr}</span>
          <span class="gl-value" style="color:${scoreColor}">${scan.overallScore}%</span>
        </div>
      `;
    }).join('');
  }

  // ============================================
  //  BRAND RULES SCREEN
  // ============================================

  function updateRulesScreen() {
    const rules = BrandConfig.getActiveRules();
    const brandId = BrandConfig.getActiveBrand();
    const allBrands = BrandConfig.getAllBrands();
    const activeData = allBrands.find(b => b.id === brandId);
    const isCustom = activeData && !activeData.isPreset;

    const modeIndicator = document.getElementById('brand-mode-indicator');
    if (modeIndicator) {
      if (isCustom) {
        modeIndicator.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px">edit</span> EDIT MODE';
        modeIndicator.style.color = 'var(--blue-600)';
        modeIndicator.style.borderColor = 'var(--blue-200)';
        modeIndicator.style.background = 'var(--blue-50)';
      } else {
        modeIndicator.innerHTML = '<span class="material-symbols-rounded" style="font-size:14px">visibility</span> VIEW ONLY';
        modeIndicator.style.color = 'var(--text-secondary)';
        modeIndicator.style.borderColor = 'var(--border)';
        modeIndicator.style.background = 'var(--bg-section)';
      }
    }

    const nameInput = document.getElementById('rule-brand-name');
    const taglineInput = document.getElementById('rule-tagline');
    const logoDesc = document.getElementById('rule-logo-desc');
    const fontHeading = document.getElementById('rule-font-heading');
    const fontBody = document.getElementById('rule-font-body');
    const fontAlts = document.getElementById('rule-font-alternates');

    if (nameInput) { nameInput.value = rules.name || ''; nameInput.readOnly = !isCustom; }
    if (taglineInput) { taglineInput.value = rules.tagline || ''; taglineInput.readOnly = !isCustom; }
    if (logoDesc) { logoDesc.value = rules.logo?.description || ''; logoDesc.readOnly = !isCustom; }
    if (fontHeading) { fontHeading.value = rules.fonts?.heading || ''; fontHeading.readOnly = !isCustom; }
    if (fontBody) { fontBody.value = rules.fonts?.body || ''; fontBody.readOnly = !isCustom; }
    if (fontAlts) { fontAlts.value = rules.fonts?.alternates?.join(', ') || ''; fontAlts.readOnly = !isCustom; }

    // Color inputs update
    const priInput = document.getElementById('rule-color-primary-input');
    const secInput = document.getElementById('rule-color-secondary-input');
    const accInput = document.getElementById('rule-color-accent-input');
    
    if (priInput) { priInput.value = rules.colors?.primary || '#000000'; priInput.disabled = !isCustom; }
    if (secInput) { secInput.value = rules.colors?.secondary || '#000000'; secInput.disabled = !isCustom; }
    if (accInput) { accInput.value = rules.colors?.accent || '#ffffff'; accInput.disabled = !isCustom; }

    updateColorPreview('rule-color-primary', 'rule-color-primary-hex', rules.colors?.primary || '#000000');
    updateColorPreview('rule-color-secondary', 'rule-color-secondary-hex', rules.colors?.secondary || '#000000');
    updateColorPreview('rule-color-accent', 'rule-color-accent-hex', rules.colors?.accent || '#ffffff');

    // Prohibited colors
    const prohibContainer = document.getElementById('prohibited-swatches');
    const prohibInput = document.getElementById('rule-prohibited-input');
    
    if (isCustom) {
      if (prohibContainer) prohibContainer.style.display = 'none';
      if (prohibInput) {
        prohibInput.style.display = 'block';
        prohibInput.value = (rules.prohibitedColors || []).join(', ');
      }
    } else {
      if (prohibInput) prohibInput.style.display = 'none';
      if (prohibContainer) {
        prohibContainer.style.display = 'flex';
        prohibContainer.innerHTML = '';
        (rules.prohibitedColors || []).forEach(color => {
          const swatch = document.createElement('div');
          swatch.className = 'prohibited-swatch';
          swatch.style.background = color;
          swatch.title = color;
          prohibContainer.appendChild(swatch);
        });
        if (!rules.prohibitedColors?.length) {
          prohibContainer.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">None</span>';
        }
      }
    }

    // Brand Elements
    const rulesList = document.getElementById('brand-rules-list');
    const rulesElementsInput = document.getElementById('rule-elements-input');
    
    if (isCustom) {
      if (rulesList) rulesList.style.display = 'none';
      if (rulesElementsInput) {
        rulesElementsInput.style.display = 'block';
        rulesElementsInput.value = (rules.brandElements || []).join('\n');
      }
    } else {
      if (rulesElementsInput) rulesElementsInput.style.display = 'none';
      if (rulesList) {
        rulesList.style.display = 'block';
        rulesList.innerHTML = '';
        (rules.brandElements || []).forEach(el => {
          const li = document.createElement('li');
          li.innerHTML = `
            <span class="material-symbols-rounded" style="font-size:16px; color: var(--blue-600)">check_circle</span>
            ${el}
          `;
          rulesList.appendChild(li);
        });
        if (!rules.brandElements?.length) {
          rulesList.innerHTML = '<li style="color:var(--text-muted)">No specific compliance rules defined</li>';
        }
      }
    }

    // Actions
    const customActions = document.getElementById('custom-brand-actions');
    if (customActions) {
      customActions.style.display = isCustom ? 'flex' : 'none';
    }
  }

  function updateColorPreview(swatchId, hexId, color) {
    const swatch = document.getElementById(swatchId);
    const hex = document.getElementById(hexId);
    if (swatch) swatch.style.background = color;
    if (hex) hex.textContent = color.toUpperCase();
  }

  // ============================================
  //  STORES SCREEN (dynamic from brand config)
  // ============================================

  function updateStoresScreen() {
    const rules = BrandConfig.getActiveRules();
    const container = document.getElementById('stores-list');
    if (!container) return;

    const stores = rules.stores || [];
    if (stores.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted); padding:20px;">No store locations configured for this brand.</p>';
      return;
    }

    const icons = ['storefront', 'local_cafe', 'store', 'apartment', 'shopping_bag', 'business'];
    container.innerHTML = '';

    stores.forEach((store, i) => {
      const icon = icons[i % icons.length];
      const scoreColor = store.score >= 80 ? 'var(--green-600)' : store.score >= 60 ? 'var(--yellow-600)' : 'var(--blue-600)';
      const bgColor = store.score >= 80 ? 'var(--green-100)' : store.score >= 60 ? 'var(--yellow-100)' : 'var(--blue-100)';
      const pillClass = store.score >= 80 ? 'high' : store.score >= 60 ? 'medium' : '';

      const card = document.createElement('div');
      card.className = 'store-card';
      card.innerHTML = `
        <div class="store-thumbnail" style="background: ${bgColor}; color: ${scoreColor};">
          <span class="material-symbols-rounded">${icon}</span>
        </div>
        <div class="store-info">
          <div class="store-name">${store.name}</div>
          <div class="store-date">Mar 8 · 2:30 PM</div>
        </div>
        <div class="store-meta">
          ${store.score > 0
            ? `<span class="compliance-pill ${pillClass}">${store.score}% Compliant</span>
               ${store.score >= 90 ? `<span class="verified-badge">
                 <span class="material-symbols-rounded" style="font-size:14px">verified</span>
                 VERIFIED
               </span>` : ''}`
            : `<span class="analyzing-badge">
                 <span class="material-symbols-rounded" style="font-size:14px; animation: spin 1s linear infinite;">sync</span>
                 Analyzing...
               </span>`
          }
        </div>
        <span class="material-symbols-rounded store-chevron">chevron_right</span>
      `;
      card.addEventListener('click', () => navigateTo('history'));
      container.appendChild(card);
    });
  }

  // ============================================
  //  AUDIT LIST (history screen)
  // ============================================

  function updateAuditList() {
    const auditList = document.getElementById('audit-list');
    if (!auditList) return;

    const recent = ScanHistory.getRecent(10);
    const rules = BrandConfig.getActiveRules();
    const stores = rules.stores || [];

    // Mix real scan history with brand store data
    const items = [];

    // Add real scan history first
    recent.forEach(scan => {
      const time = new Date(scan.timestamp);
      items.push({
        name: `${scan.brandName} Scan`,
        date: time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' +
              time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        score: scan.overallScore,
        isReal: true,
      });
    });

    // Add store data
    stores.forEach(store => {
      items.push({
        name: store.name,
        date: 'Mar 8, 2026 · 2:30 PM',
        score: store.score,
        isReal: false,
      });
    });

    if (items.length === 0) {
      auditList.innerHTML = '<div style="padding:20px; color:var(--text-muted)">No audit data yet.</div>';
      return;
    }

    auditList.innerHTML = items.slice(0, 8).map(item => {
      const pinClass = item.score >= 80 ? 'pass' : item.score >= 60 ? 'warning' : 'pass';
      const scoreClass = item.score >= 80 ? 'high' : 'medium';
      return `
        <div class="audit-item">
          <div class="audit-pin ${pinClass}">
            <span class="material-symbols-rounded">${item.isReal ? 'qr_code_scanner' : 'location_on'}</span>
          </div>
          <div class="audit-details">
            <div class="audit-name">${item.name}</div>
            <div class="audit-date">${item.date}</div>
          </div>
          <span class="audit-score ${scoreClass}">${item.score > 0 ? `${item.score}%` : '...'}</span>
        </div>
      `;
    }).join('');
  }

  // ============================================
  //  SIDEBAR NAVIGATION
  // ============================================

  document.querySelectorAll('.sidebar-item[data-screen]').forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      if (screen) navigateTo(screen);
    });
  });

  // ============================================
  //  WELCOME SCREEN ACTIONS
  // ============================================

  const btnStartScan = document.getElementById('btn-start-scan');
  if (btnStartScan) {
    btnStartScan.addEventListener('click', () => navigateTo('scan'));
  }

  const btnUploadPhoto = document.getElementById('btn-upload-photo');
  const fileInput = document.getElementById('file-input');

  if (btnUploadPhoto && fileInput) {
    btnUploadPhoto.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        document.body.classList.add('is-uploading');
        navigateTo('scan');
        Scanner.showUploadedImage(file).then(() => {
          document.body.classList.remove('is-uploading');
          fileInput.value = ''; // Reset so same file can be selected again
        });
      }
    });
  }

  const linkRules = document.getElementById('link-setup-rules');
  if (linkRules) {
    linkRules.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('rules');
    });
  }

  // ============================================
  //  BRAND RULES ACTIONS
  // ============================================

  const btnAddBrand = document.getElementById('btn-add-brand');
  if (btnAddBrand) {
    btnAddBrand.addEventListener('click', () => {
      BrandConfig.saveCustomBrand({
        name: 'New Custom Brand',
        tagline: '',
        logo: { description: '', minClearSpace: '', mustBeVisible: true, acceptableBackgrounds: [] },
        colors: { primary: '#4361EE', secondary: '#1A1A2E', accent: '#FFFFFF', background: '#FFFFFF', text: '#333333' },
        fonts: { heading: '', body: '', alternates: [] },
        prohibitedColors: [],
        brandElements: [],
        stores: []
      });
      updateBrandUI();
      setTimeout(() => {
        const nameInput = document.getElementById('rule-brand-name');
        if (nameInput) {
          nameInput.focus();
          nameInput.select();
        }
      }, 0);
    });
  }

  const btnSaveBrand = document.getElementById('btn-save-brand');
  if (btnSaveBrand) {
    btnSaveBrand.addEventListener('click', () => {
      const activeId = BrandConfig.getActiveBrand();
      const name = document.getElementById('rule-brand-name')?.value || 'Unnamed Brand';
      const tagline = document.getElementById('rule-tagline')?.value || '';
      const logoDesc = document.getElementById('rule-logo-desc')?.value || '';
      const fontHeading = document.getElementById('rule-font-heading')?.value || '';
      const fontBody = document.getElementById('rule-font-body')?.value || '';
      
      const altsRaw = document.getElementById('rule-font-alternates')?.value || '';
      const alternates = altsRaw.split(',').map(s => s.trim()).filter(Boolean);

      const primary = document.getElementById('rule-color-primary-input')?.value || '#000000';
      const secondary = document.getElementById('rule-color-secondary-input')?.value || '#000000';
      const accent = document.getElementById('rule-color-accent-input')?.value || '#ffffff';

      const prohibRaw = document.getElementById('rule-prohibited-input')?.value || '';
      const prohibitedColors = prohibRaw.split(',').map(s => s.trim()).filter(Boolean);

      const elementsRaw = document.getElementById('rule-elements-input')?.value || '';
      const brandElements = elementsRaw.split('\n').map(s => s.trim()).filter(Boolean);

      BrandConfig.saveCustomBrand({
        id: activeId,
        name,
        tagline,
        logo: { description: logoDesc, minClearSpace: '1x logo height', mustBeVisible: true, acceptableBackgrounds: ['any'] },
        colors: { primary, secondary, accent, background: '#FFFFFF', text: '#333333' },
        fonts: { heading: fontHeading, body: fontBody, alternates },
        prohibitedColors,
        brandElements,
        stores: []
      });
      updateBrandUI();
      btnSaveBrand.innerHTML = `<span class="material-symbols-rounded" style="font-size:18px">check</span> Saved!`;
      setTimeout(() => {
        btnSaveBrand.innerHTML = `<span class="material-symbols-rounded" style="font-size:18px">save</span> Save Brand`;
      }, 2000);
    });
  }

  const btnDeleteBrand = document.getElementById('btn-delete-brand');
  if (btnDeleteBrand) {
    btnDeleteBrand.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete this brand?')) {
        BrandConfig.deleteCustomBrand(BrandConfig.getActiveBrand());
        updateBrandUI();
      }
    });
  }

  // Handle live color updating
  ['primary', 'secondary', 'accent'].forEach(type => {
    const input = document.getElementById(`rule-color-${type}-input`);
    if (input) {
      input.addEventListener('input', (e) => {
        updateColorPreview(`rule-color-${type}`, `rule-color-${type}-hex`, e.target.value);
      });
    }
  });

  // ============================================
  //  SCAN SCREEN ACTIONS
  // ============================================

  const btnUploadInScan = document.getElementById('btn-upload-in-scan');
  const fileInputScan = document.getElementById('file-input-scan');

  if (btnUploadInScan && fileInputScan) {
    btnUploadInScan.addEventListener('click', () => fileInputScan.click());
    fileInputScan.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        Scanner.showUploadedImage(file).then(() => {
          fileInputScan.value = ''; // Reset so same file can be selected again
        });
      }
    });
  }

  const brandQuickSelect = document.getElementById('brand-quick-select');
  if (brandQuickSelect) {
    brandQuickSelect.addEventListener('change', (e) => {
      BrandConfig.setActiveBrand(e.target.value);
      updateBrandUI();
    });
  }

  // ============================================
  //  SHUTTER BUTTON: FULL AI ANALYSIS FLOW
  // ============================================

  const btnShutter = document.getElementById('btn-shutter');
  if (btnShutter) {
    btnShutter.addEventListener('click', async () => {
      if (Scanner.isScanning) return;

      btnShutter.disabled = true;
      btnShutter.innerHTML = `
        <span class="material-symbols-rounded" style="font-size:18px; animation: spin 0.8s linear infinite;">sync</span>
        Analyzing...
      `;

      const hasKey = AIEngine.hasApiKey();
      Scanner.showAnalyzing(
        hasKey ? 'Sending to Gemini Vision AI...' : 'Running demo analysis...'
      );

      try {
        // 1. Capture image
        const imageBase64 = Scanner.captureImageBase64();

        if (!imageBase64) {
          Scanner.hideAnalyzing();
          btnShutter.disabled = false;
          btnShutter.innerHTML = `
            <span class="material-symbols-rounded" style="font-size:18px">center_focus_strong</span>
            Capture & Analyze
          `;
          alert('No image to analyze. Please upload an image or start the camera first. If you just uploaded an image, please wait a second for it to load.');
          return;
        }

        // 2. Extract dominant colors from the actual image
        Scanner.showAnalyzing(hasKey ? 'AI analyzing brand compliance...' : 'Extracting colors & analyzing...');

        const colorCanvas = document.createElement('canvas');
        const colorCtx = colorCanvas.getContext('2d');
        const img = new Image();
        const dominantColors = await new Promise((resolve) => {
          img.onload = () => {
            colorCanvas.width = img.width;
            colorCanvas.height = img.height;
            colorCtx.drawImage(img, 0, 0);
            resolve(Scanner.extractDominantColors(colorCanvas, 30));
          };
          img.onerror = () => resolve([]);
          img.src = imageBase64;
        });

        // 3. Call AI engine
        const brandRules = BrandConfig.getActiveRules();
        const aiResult = await AIEngine.analyzeImage(imageBase64, brandRules);

        // 4. Check for error
        if (aiResult.error) {
          Scanner.hideAnalyzing();
          alert(aiResult.error);
          btnShutter.disabled = false;
          btnShutter.innerHTML = `
            <span class="material-symbols-rounded" style="font-size:18px">center_focus_strong</span>
            Capture & Analyze
          `;
          return;
        }

        // 5. Hide analyzing overlay
        Scanner.hideAnalyzing();

        // 6. Draw AR overlays from findings
        Scanner.drawAROverlays(aiResult.findings);
        Scanner.showARElements(aiResult);

        // 7. Generate report
        currentReport = Report.generateReport(aiResult, brandRules);
        currentReport.dominantColors = dominantColors;
        Report.updateResultsUI(currentReport);

        // 8. Save to scan history
        const thumbnail = await ScanHistory.createThumbnail(imageBase64);
        ScanHistory.save({
          brandId: BrandConfig.getActiveBrand(),
          brandName: brandRules.name,
          brandDetected: aiResult.brandDetected,
          overallScore: aiResult.overallScore,
          aiPowered: aiResult.aiPowered,
          passed: currentReport.passed,
          warnings: currentReport.warnings,
          failed: currentReport.failed,
          totalIssues: currentReport.totalIssues,
          findings: aiResult.findings,
          thumbnail: thumbnail,
          dominantColors: dominantColors,
        });

        // 9. Update recent scans panel
        updateRecentScansPanel();

        // 10. Reset button
        btnShutter.disabled = false;
        btnShutter.innerHTML = `
          <span class="material-symbols-rounded" style="font-size:18px">center_focus_strong</span>
          Capture & Analyze
        `;

        // 11. Navigate to results after showing AR overlays briefly
        setTimeout(() => navigateTo('results'), 1500);

      } catch (err) {
        console.error('Scan error:', err);
        Scanner.hideAnalyzing();
        alert(`An unexpected error occurred during the scan: ${err.message}`);
        btnShutter.disabled = false;
        btnShutter.innerHTML = `
          <span class="material-symbols-rounded" style="font-size:18px">center_focus_strong</span>
          Capture & Analyze
        `;
      }
    });
  }

  // ============================================
  //  BRAND RULES SCREEN
  // ============================================

  document.querySelectorAll('.brand-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const brandId = tab.dataset.brand;
      if (brandId) {
        BrandConfig.setActiveBrand(brandId);
        updateBrandUI();
      }
    });
  });

  const btnStartScanRules = document.getElementById('btn-start-scan-rules');
  if (btnStartScanRules) {
    btnStartScanRules.addEventListener('click', () => navigateTo('scan'));
  }

  // ============================================
  //  RESULTS SCREEN ACTIONS
  // ============================================

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

  const btnScanAgain = document.getElementById('btn-scan-again');
  if (btnScanAgain) {
    btnScanAgain.addEventListener('click', () => navigateTo('welcome'));
  }

  const btnShareReport = document.getElementById('btn-share-report');
  if (btnShareReport) {
    btnShareReport.addEventListener('click', () => {
      if (currentReport) {
        Report.exportReport(currentReport);
      } else {
        alert('No report available. Run a scan first.');
      }
    });
  }

  // ============================================
  //  SETTINGS MODAL
  // ============================================

  const settingsModal = document.getElementById('settings-modal');
  const btnSettingsOpen = document.getElementById('btn-settings-open');
  const btnSettingsClose = document.getElementById('btn-settings-close');
  const btnSettingsCancel = document.getElementById('btn-settings-cancel');
  const btnSettingsSave = document.getElementById('btn-settings-save');
  const inputApiKey = document.getElementById('input-api-key');
  const apiStatusText = document.getElementById('api-status-text');
  const apiStatus = document.getElementById('api-status');

  function showSettingsModal() {
    if (settingsModal) settingsModal.style.display = 'flex';
    if (inputApiKey) inputApiKey.value = AIEngine.getGeminiKey();
    updateApiStatus();
  }

  function hideSettingsModal() {
    if (settingsModal) settingsModal.style.display = 'none';
  }

  function updateApiStatus() {
    const hasKey = AIEngine.hasApiKey();
    if (apiStatus) apiStatus.className = `api-status ${hasKey ? 'connected' : 'disconnected'}`;
    if (apiStatusText) {
      apiStatusText.textContent = hasKey
        ? '✅ API key configured — AI analysis active'
        : '⚠️ No API key set — demo mode active';
    }
  }

  if (btnSettingsOpen) btnSettingsOpen.addEventListener('click', showSettingsModal);
  if (btnSettingsClose) btnSettingsClose.addEventListener('click', hideSettingsModal);
  if (btnSettingsCancel) btnSettingsCancel.addEventListener('click', hideSettingsModal);

  if (btnSettingsSave) {
    btnSettingsSave.addEventListener('click', () => {
      const gKey = inputApiKey?.value?.trim() || '';
      if (gKey) AIEngine.setApiKey(gKey);
      updateApiStatus();
      hideSettingsModal();
    });
  }

  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) hideSettingsModal();
    });
  }

  // ============================================
  //  MAP INITIALIZATION (dynamic from brand)
  // ============================================

  let mapInitialized = false;

  function initMap() {
    if (mapInitialized) return;

    const rules = BrandConfig.getActiveRules();
    const stores = rules.stores || [];
    let center = [-1.2864, 36.8172];
    if (stores.length > 0) center = [stores[0].lat, stores[0].lng];

    try {
      const mapContainer = document.getElementById('map');
      if (mapContainer._leaflet_id) {
        mapContainer._leaflet_id = null;
        mapContainer.innerHTML = '';
      }

      const map = L.map('map', {
        zoomControl: true,
        attributionControl: false,
      }).setView(center, 12);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      const markerIcon = (color) => L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width: 14px; height: 14px;
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

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

  // ============================================
  //  INITIAL SETUP
  // ============================================

  updateBrandUI();
  updateApiStatus();
  updateDashboardStats();

  if (!AIEngine.hasApiKey()) {
    setTimeout(showSettingsModal, 800);
  }

  // ---- Window Resize ----
  window.addEventListener('resize', () => {
    if (currentScreen === 'scan') Scanner.resizeCanvas();
  });

  // ---- Keyboard shortcuts ----
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.key) {
      case '1': navigateTo('welcome'); break;
      case '2': navigateTo('rules'); break;
      case '3': navigateTo('scan'); break;
      case '4': navigateTo('results'); break;
      case '5': navigateTo('stores'); break;
      case '6': navigateTo('history'); break;
    }
  });
});
