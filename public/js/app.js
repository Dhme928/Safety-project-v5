// My Observations App - main logic
// All browser code is wrapped so it’s safe if this file is linted in Node, etc.
(function () {
  if (typeof document === 'undefined') return;

  // -------------------- Small helpers --------------------

  function $(selector) {
    return document.querySelector(selector);
  }

  function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  // Very small CSV parser that understands quotes and commas.
  function parseEvidenceLinks(cell) {
  if (!cell) return [];
  if (Array.isArray(cell)) return cell;

  return String(cell)
    .split(/[\n;,]+/)
    .map(part => part.trim())
    .filter(part => part && /^https?:\/\//i.test(part));
}

function parseCSV(text) {
    const rows = [];
    let current = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (char === '"' && next === '"') {
          value += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          value += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          current.push(value.trim());
          value = '';
        } else if (char === '\n') {
          current.push(value.trim());
          rows.push(current);
          current = [];
          value = '';
        } else if (char !== '\r') {
          value += char;
        }
      }
    }
    if (value.length || current.length) {
      current.push(value.trim());
      rows.push(current);
    }
    return rows.filter(r => r.length > 0);
  }
  // Small helper for safe HTML text in dynamically-built cards
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }


  
  

  // Load an image URL and return a base64 data URL (JPEG) for embedding in PDFs
  function loadImageAsBase64(url) {
    return new Promise((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        } catch (err) {
          console.error('Error converting image to base64', err);
          resolve(null);
        }
      };
      img.onerror = function () {
        resolve(null);
      };
      img.src = url;
    });
  }

// -------------------- Evidence upload helpers (backend) --------------------

  async function fetchEvidenceList(category, refCode) {
    const params = new URLSearchParams({ category, refCode });
    const res = await fetch(`/api/evidence?${params.toString()}`);
    if (!res.ok) {
      throw new Error('Failed to load evidence list');
    }
    const data = await res.json();
    return Array.isArray(data.files) ? data.files : [];
  }

  async function uploadEvidenceFile(category, refCode, file) {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('refCode', refCode);
    formData.append('file', file);

    const res = await fetch('/api/evidence/upload', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('Upload failed: ' + text);
    }

    const data = await res.json();
    return data.file;
  }

  function renderEvidenceList(container, files) {
    if (!container) return;

    if (!files || !files.length) {
      container.innerHTML = '<p class="text-muted">No additional evidence uploaded yet.</p>';
      return;
    }

    const items = files
      .map(file => {
        const name = escapeHtml(file.original_name || 'Evidence');
        const url = escapeHtml(file.file_path || '');
        if (!url) return '';
        if (file.mime_type && file.mime_type.startsWith('image/')) {
          return `
            <div class="evidence-item">
              <a href="${url}" target="_blank" rel="noopener">
                <img src="${url}" alt="${name}" class="evidence-thumb" />
              </a>
            </div>
          `;
        }
        return `
          <div class="evidence-item">
            <a href="${url}" target="_blank" rel="noopener">
              <i class="fas fa-paperclip"></i> ${name}
            </a>
          </div>
        `;
      })
      .filter(Boolean)
      .join('');

    container.innerHTML = items
      ? `<div class="evidence-list-grid">${items}</div>`
      : '<p class="text-muted">No additional evidence uploaded yet.</p>';
  }

const EQUIPMENT_IMAGE_MAP = {
    'articulated trucks - pwas needed': 'Articulated Trucks - PWAS Needed.png',
    'backhoe loaders - pwas needed': 'Backhoe Loaders - PWAS Needed.png',
    'boom truck - articulating - pwas not needed': 'Boom Truck - Articulating - PWAS Not Needed.png',
    'boom truck - telescoping - pwas not needed': 'Boom Truck - Telescoping - PWAS Not Needed.png',
    'cherry pickers - pwas not needed': 'Cherry Pickers - PWAS Not Needed.png',
    'cold planer attachment - pwas needed': 'Cold Planer Attachment - PWAS Needed.png',
    'cold planers/milling machines - pwas not needed': 'Cold PlanersMilling Machines - PWAS Not Needed.png',
    'compactors/rollers - pwas needed': 'CompactorsRollers - PWAS Needed.png',
    'concrete trucks - pwas needed': 'Concrete Trucks - PWAS Needed.png',
    'crane - mobile - pwas not needed': 'Crane - Mobile - PWAS Not Needed.png',
    'crane - pedestal - pwas not needed': 'Crane - Pedestal - PWAS Not Needed.png',
    'crane - tower - pwas not needed': 'Crane - Tower - PWAS Not Needed.png',
    'crawler loader - pwas needed': 'Crawler Loader - PWAS Needed.png',
    'dump trucks - pwas needed': 'Dump Trucks - PWAS Needed.png',
    'excavator base with attachment - pwas needed': 'Excavator Base With Attachment - PWAS Needed.png',
    'excavators - pwas needed': 'Excavators - PWAS Needed.png',
    'forklift - pwas needed': 'Forklift - PWAS Needed.png',
    'front shovel excavators - pwas needed': 'Front Shovel Excavators - PWAS Needed.png',
    'gradall - pwas needed': 'Gradall - PWAS Needed.png',
    'grader - pwas needed': 'Grader - PWAS Needed.png',
    'loader - skid (bobcat) - pwas needed': 'Loader - Skid (Bobcat) - PWAS Needed.png',
    'manlift - hydraulic - pwas not needed': 'Manlift - Hydraulic - PWAS Not Needed.png',
    'manlift - scissor - pwas not needed': 'Manlift - Scissor - PWAS Not Needed.png',
    'manlift - telescoping - pwas not needed': 'Manlift - Telescoping - PWAS Not Needed.png',
    'mobile drilling rigs - pwas not needed': 'Mobile Drilling Rigs - PWAS Not Needed.png',
    'off-highway trucks - pwas needed': 'Off-Highway Trucks - PWAS Needed.png',
    'pavers - pwas not needed': 'Pavers - PWAS Not Needed.png',
    'pay welder - pwas not needed': 'Pay Welder - PWAS Not Needed.png',
    'scrapers - pwas needed': 'Scrapers - PWAS Needed.png',
    'sideboom - pipelayer - pwas not needed': 'Sideboom - Pipelayer - PWAS Not Needed.png',
    'straddle carrier - pwas not needed': 'Straddle Carrier - PWAS Not Needed.png',
    'telehandlers - pwas needed': 'Telehandlers - PWAS Needed.png',
    'traxcavator - pwas needed': 'Traxcavator - PWAS Needed.png',
    'trenchers - pwas not needed': 'Trenchers - PWAS Not Needed.png',
    'vacuum lifter - pwas needed': 'Vacuum Lifter - PWAS Needed.png',
    'water / fuel tanker - pwas needed': 'Water Fuel Tanker - PWAS Needed.png',
    'wheel loaders - pwas needed': 'Wheel Loaders - PWAS Needed.png',
    'wheel pipeloader - pwas needed': 'Wheel Pipeloader - PWAS Needed.png'
  };

  function getEquipmentImage(type) {
    if (!type) return null;
    const key = type.trim().toLowerCase();
    const filename = EQUIPMENT_IMAGE_MAP[key];
    if (!filename) return null;
    return `img/${filename}`;
  }



  function findColumnIndex(headers, candidates) {
    if (!headers) return -1;
    const lower = headers.map(h => (h || '').toLowerCase().trim());
    for (const c of candidates) {
      const target = c.toLowerCase();
      const idx = lower.findIndex(h => h === target);
      if (idx !== -1) return idx;
    }
    for (const c of candidates) {
      const target = c.toLowerCase();
      const idx = lower.findIndex(h => h.includes(target));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  function parseSheetDate(value) {
    if (!value) return null;
    let d = new Date(value);
    if (!isNaN(d.getTime())) return d;

    const parts = value.split(/[\/\-]/).map(p => p.trim());
    if (parts.length === 3) {
      let [a, b, c] = parts;
      if (c.length === 4) {
        const day = parseInt(a, 10);
        const month = parseInt(b, 10) - 1;
        const year = parseInt(c, 10);
        d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
    return null;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function isSameDay(a, b) {
    return (
      a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  function isSameMonth(a, b) {
    return (
      a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth()
    );
  }

  function daysBetween(a, b) {
    const ms = startOfDay(a) - startOfDay(b);
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  // -------------------- Global state --------------------

  const state = {
    darkMode: false,
    observations: [],
    observationsLoaded: false,
    lastHeatSummary: null,
    lastWindSummary: null,
    permits: [],
    permitsLoaded: false,
    heavyEquipment: [],
    heavyEquipmentLoaded: false
  };

  const obsFilterState = {
    range: 'month',
    area: '',
    status: '',
    search: ''
  };

  const permitsFilterState = {
    range: 'today',
    area: '',
    type: '',
    search: ''
  };

  const heavyEquipmentFilterState = {
    area: '',
    status: '',
    search: ''
  };

  // Chart instances for Home tab donut charts
  let homeTopAreasChart = null;
  let homeTopDirectChart = null;




  // -------------------- Tab navigation --------------------

  // track whether observations have been loaded at least once
  let observationsInitialized = false;
  let permitsInitialized = false;
  let heavyEquipmentInitialized = false;

  function openTab(evt, tabId) {
    // hide all tab contents
    $all('.tab-content').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
    });

    // show the selected tab
    const target = $('#' + tabId);
    if (target) {
      target.classList.add('active');
      target.style.display = 'block';
    }

    // ensure content area scrolls to top when switching tabs (mobile & desktop)
    const mainArea = document.querySelector('.content-area');
    if (mainArea) {
      mainArea.scrollTop = 0;
    }
    if (typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // update active state on bottom nav buttons
    const navButtons = $all('.nav-button');
    navButtons.forEach(btn => btn.classList.remove('active'));

    if (evt && evt.currentTarget) {
      evt.currentTarget.classList.add('active');
    } else {
      const match = navButtons.find(btn => btn.dataset.tab === tabId);
      if (match) match.classList.add('active');
    }

    // lazy-load heavy iframe (Tasks form)
    if (tabId === 'TasksTab') {
      initTasksIframe();
    }

    // 🔥 lazy-load observations ONLY when Observations tab is opened
    if (tabId === 'ObservationsTab' && !observationsInitialized) {
      observationsInitialized = true;
      loadObservations();
    }

    // 🧾 lazy-load permits when Permits tab is opened
    if (tabId === 'PermitsTab' && !permitsInitialized) {
      permitsInitialized = true;
      loadPermits();
      setupPermitsFilters();
    }

    // 🚜 lazy-load Heavy Equipment when Heavy Equipment tab is opened
    if (tabId === 'HeavyEquipmentTab' && !heavyEquipmentInitialized) {
      heavyEquipmentInitialized = true;
      loadHeavyEquipment();
      setupHeavyEquipmentFilters();
    }
  }

  // keep this so HTML can still call openTab if needed
  window.openTab = openTab;


  // expose for inline onclick (just in case)
  window.openTab = openTab;

  function setupNav() {
    $all('.nav-button').forEach(btn => {
      const tabId = btn.dataset.tab;
      if (!tabId) return;
      btn.addEventListener('click', e => openTab(e, tabId));
    });
    // default
    openTab(null, 'HomeTab');
  }

  // -------------------- Accordions --------------------

function setupAccordions() {
  const accordions = $all('.accordion');

  accordions.forEach(btn => {
    // 🔹 Skip rows that are used as modal triggers (no expand/collapse)
    if (btn.classList.contains('accordion-modal')) return;

    btn.addEventListener('click', () => {
      const panel = btn.nextElementSibling;
      if (!panel) return;

      const isOpen = panel.style.display === 'block';

      // close all
      accordions.forEach(otherBtn => {
        if (otherBtn.classList.contains('accordion-modal')) return;
        const otherPanel = otherBtn.nextElementSibling;
        if (!otherPanel) return;
        otherBtn.classList.remove('active');
        otherPanel.style.display = 'none';
      });

      // toggle clicked
      if (!isOpen) {
        btn.classList.add('active');
        panel.style.display = 'block';
      }
    });
  });
}



  // -------------------- Modals --------------------

  function showLeaderboardModal() {
    const modal = $('#leaderboardModal');
    if (modal) modal.classList.add('show');
  }

  function hideLeaderboardModal() {
    const modal = $('#leaderboardModal');
    if (modal) modal.classList.remove('show');
  }

  function showEmergencyContactsModal() {
    const modal = $('#emergencyContactsModal');
    if (modal) modal.classList.add('show');
  }

  function hideEmergencyContactsModal() {
    const modal = $('#emergencyContactsModal');
    if (modal) modal.classList.remove('show');
  }

  window.showLeaderboardModal = showLeaderboardModal;
  window.hideLeaderboardModal = hideLeaderboardModal;
  window.showEmergencyContactsModal = showEmergencyContactsModal;
  window.hideEmergencyContactsModal = hideEmergencyContactsModal;

  function setupModals() {
    $all('.modal').forEach(modal => {
      modal.addEventListener('click', e => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    });
  }

  // -------------------- Dark / light mode --------------------

  function applyDarkMode(dark) {
    const body = document.body;
    const modeIcon = $('#modeIcon');
    state.darkMode = dark;
    if (dark) {
      body.classList.add('dark-mode');
      if (modeIcon) modeIcon.className = 'fas fa-sun';
    } else {
      body.classList.remove('dark-mode');
      if (modeIcon) modeIcon.className = 'fas fa-moon';
    }
    try {
      localStorage.setItem('safetyAppDarkMode', dark ? '1' : '0');
    } catch (_) {}
  }

  function toggleDarkMode() {
    applyDarkMode(!state.darkMode);
  }

  window.toggleDarkMode = toggleDarkMode;

  function setupDarkMode() {
    let stored = null;
    try {
      stored = localStorage.getItem('safetyAppDarkMode');
    } catch (_) {}
    if (stored === '1') {
      applyDarkMode(true);
    } else {
      applyDarkMode(false);
    }
    const toggle = $('.mode-toggle');
    if (toggle) {
      toggle.addEventListener('click', toggleDarkMode);
    }
  }

  // -------------------- GPS helper --------------------

  function getGPSLocation() {
    const resultEl = $('#locationResult');
    if (!navigator.geolocation) {
      if (resultEl) {
        resultEl.textContent = 'Geolocation not supported on this device.';
      }
      return;
    }

    if (resultEl) {
      resultEl.textContent = 'Getting location...';
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const link = `https://maps.google.com/?q=${latitude},${longitude}`;
        if (resultEl) {
          resultEl.innerHTML = `
            <strong>Location:</strong> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
            <br><a href="${link}" target="_blank">Open in Google Maps</a>
          `;
        }
      },
      err => {
        if (resultEl) {
          resultEl.textContent = 'Unable to get location: ' + err.message;
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  window.getGPSLocation = getGPSLocation;
function getRotatingColorForCurrentMonth() {
  try {
    const m = new Date().getMonth(); // 0 = Jan ... 11 = Dec
    const map = {
      0: 'Yellow', // Jan
      1: 'Red',    // Feb
      2: 'Blue',   // Mar
      3: 'Green',  // Apr
      4: 'Yellow', // May
      5: 'Red',    // Jun
      6: 'Blue',   // Jul
      7: 'Green',  // Aug
      8: 'Yellow', // Sep
      9: 'Red',    // Oct
      10: 'Blue',  // Nov
      11: 'Green'  // Dec
    };
    return map[m] || window.DEFAULT_MONTH_COLOR_NAME || 'White';
  } catch (e) {
    return window.DEFAULT_MONTH_COLOR_NAME || 'White';
  }
}
function applyMonthColorBadge(el, name) {
  const label = (name || '').trim() || 'N/A';

  el.textContent = label;
  el.classList.add('month-color-badge');
  el.classList.remove('color-red', 'color-blue', 'color-green', 'color-yellow');

  const lower = label.toLowerCase();
  if (lower.includes('red')) el.classList.add('color-red');
  else if (lower.includes('blue')) el.classList.add('color-blue');
  else if (lower.includes('green')) el.classList.add('color-green');
  else if (lower.includes('yellow')) el.classList.add('color-yellow');
}

  // -------------------- EOM + Leaderboard --------------------

async function loadEomAndLeaderboard() {
  const url = window.EOM_SHEET_URL;
  const eomNameEl = $('#employeeOfMonth');
  const colorNameEl = $('#colorName');
  const leaderboardMini = $('#homeLeaderboardMini');
  const leaderboardContainer = $('#leaderboardContainer');

  if (!url) {
    if (eomNameEl) eomNameEl.textContent = 'Configure EOM_SHEET_URL in js/data.js';
    if (colorNameEl) {
      const fallback = getRotatingColorForCurrentMonth();
      applyMonthColorBadge(colorNameEl, fallback);
    }
    if (leaderboardMini) leaderboardMini.textContent = 'No leaderboard data.';
    if (leaderboardContainer) leaderboardContainer.textContent = 'No leaderboard data.';
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('Empty sheet');

    const headers = rows[0];
    const body = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

    if (!body.length) throw new Error('No data rows');

    const idxMonth = findColumnIndex(headers, ['Month', 'Period']);
    const idxColor = findColumnIndex(headers, ['Color', 'Color Code']);
    const idxEomName = findColumnIndex(headers, ['Employee', 'Employee of Month', 'Name']);
    const idxPoints = findColumnIndex(headers, ['Points', 'Score']);

    const current = body[0];

    const eomName = idxEomName !== -1 ? current[idxEomName] : '';
    const colorFromSheet = idxColor !== -1 ? current[idxColor] : '';
    const fallbackColor = getRotatingColorForCurrentMonth();
    const finalColorName = (colorFromSheet && colorFromSheet.trim()) || fallbackColor;

    if (eomNameEl) eomNameEl.textContent = eomName || 'Not set';
    if (colorNameEl) {
      applyMonthColorBadge(colorNameEl, finalColorName);
    }

    const leaderboardItems = body.slice(0, 50).map(row => ({
      name: idxEomName !== -1 ? row[idxEomName] : row[0],
      points: idxPoints !== -1 ? row[idxPoints] : ''
    })).filter(p => p.name);

    // ---------- Top 3 mini card with medals ----------
    if (leaderboardMini) {
      if (!leaderboardItems.length) {
        leaderboardMini.textContent = 'No leaderboard data.';
      } else {
        leaderboardMini.innerHTML = leaderboardItems
          .slice(0, 3)
          .map((p, i) => {
            const medalClass =
              i === 0 ? 'medal-gold' :
              i === 1 ? 'medal-silver' :
              i === 2 ? 'medal-bronze' : '';

            return `
              <div class="leaderboard-mini-item">
                <div class="leaderboard-mini-left">
                  <span class="leaderboard-medal ${medalClass}">
                    <i class="fas fa-medal"></i>
                  </span>
                  <div class="leaderboard-mini-text">
                    <div class="leaderboard-name">${p.name}</div>
                    ${p.points ? `<div class="leaderboard-points">${p.points} pts</div>` : ''}
                  </div>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // ---------- Full leaderboard in modal ----------
    if (leaderboardContainer) {
      if (!leaderboardItems.length) {
        leaderboardContainer.textContent = 'No leaderboard data.';
      } else {
        leaderboardContainer.innerHTML = leaderboardItems
          .map((p, i) => `
            <div class="leaderboard-row">
              <span class="leaderboard-rank">#${i + 1}</span>
              <span class="leaderboard-row-name">${p.name}</span>
              ${p.points ? `<span class="leaderboard-row-points">${p.points} pts</span>` : ''}
            </div>
          `)
          .join('');
      }
    }
  } catch (err) {
    console.error('EOM/Leaderboard error:', err);
    if (eomNameEl) eomNameEl.textContent = 'Error loading data';
    if (colorNameEl) {
      const fallback = getRotatingColorForCurrentMonth();
      applyMonthColorBadge(colorNameEl, fallback);
    }
    if (leaderboardMini) leaderboardMini.textContent = 'Error loading leaderboard.';
    if (leaderboardContainer) leaderboardContainer.textContent = 'Error loading leaderboard.';
  }
}

  // -------------------- TBT of the day + TBT/JSA libraries --------------------

  function pickTbtOfDay(list) {
    if (!list || !list.length) return null;
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = dayOfYear % list.length;
    return list[index];
  }

  function setupTbtOfDay() {
    const list = Array.isArray(window.tbtData) ? window.tbtData : [];
    const tbtSection = $('#homeTbtSection');
    const tbtContent = $('#homeTbtContent');
    const tbtPanel = $('#tbtPanel');

    if (!list.length) {
      if (tbtContent) tbtContent.textContent = 'No TBT data configured. Add items in js/data.js.';
      if (tbtPanel) tbtPanel.textContent = 'No TBT data configured.';
      return;
    }

    const todayTbt = pickTbtOfDay(list);
    if (tbtContent && todayTbt) {
      tbtContent.innerHTML = `
        <div class="tbt-title">${todayTbt.title}</div>
        <a href="${todayTbt.link}" class="tbt-link" target="_blank">Open TBT document</a>
      `;
    }

    // Update Home "Talks Today" KPI: 1 if we have a TBT of the day, otherwise 0
    const talksTodayEl = $('#homeTalksToday');
    if (talksTodayEl) {
      talksTodayEl.textContent = todayTbt ? '1' : '0';
    }

    if (tbtPanel) {
      tbtPanel.innerHTML = list.map(item => `
        <div class="tbt-item">
          <i class="fas fa-book-open"></i>
          <a href="${item.link}" target="_blank">${item.title}</a>
        </div>
      `).join('');
    }
  }

  
// =========================================
// CSM LIBRARY
// =========================================
// Initialize if not defined; items are { title: string, link: string }
window.csmData = window.csmData || [];

window.csmData = [
  { title: "CSM - index - الفهرس", link: "https://drive.google.com/file/d/1EUTfno4FZtL0uyrCr28KY5vAR--h8QuZ/view?usp=drivesdk" },
  { title: "CSM - Contractor Safety Administrative Requirements", link: "https://drive.google.com/file/d/14P2Yjmp2w54R2m1yOAOVKjv1auRpMmND/view?usp=drive_link" },
  { title: "CSM I-1 Emergency Reporting and Response", link: "https://drive.google.com/file/d/1z8karx9RyNKORpVE7UJkDwVus4vz2UPf/view?usp=drive_link" },
  { title: "CSM I-2 Incident Reporting and Investigation", link: "https://drive.google.com/file/d/1KwbXosNd5DwpLZ8MYWb8UUuEdWeh7NfX/view?usp=drive_link" },
  { title: "CSM I-3 Personal Protective Equipment (PPE)", link: "https://drive.google.com/file/d/152cfH1EqdIrk5_V9pcwzj8djl3O6-yJJ/view?usp=drive_link" },
  { title: "CSM I-4 Work Permit System and Stop Work Authority", link: "https://drive.google.com/file/d/1Qz8e2vnXC58XxUKJxSaqG2s-jza3sSz3/view?usp=drive_link" },
  { title: "CSM 1-5 Isolation, Lockout and Use of Hold Tags", link: "https://drive.google.com/file/d/1J_klce7pdbNA3cvaiP7QIOZJJFEDazlx/view?usp=drive_link" },
  { title: "CSM I-6 Confined Spaces", link: "https://drive.google.com/file/d/1ggwNBBuMJRpXAggc_pGCRHJP3jPhdB5Y/view?usp=drive_link" },
  { title: "CSM I-7 Fire Prevention", link: "https://drive.google.com/file/d/1qlOm6lfqblv_gpH0EReezkEs6EYDoted/view?usp=drivesdk" },
  { title: "CSM I-8 Traffic and Vehicle Safety ", link: "https://drive.google.com/file/d/1PQ7sg8sQntHro3Zgs49bopnsBjHz3hBy/view?usp=drivesdk" },
  { title: "CSM I-9 Compressed Gas Cylinders", link: "https://drive.google.com/file/d/1nMbZr89lnGwXoQ4LysxRxri-LlFyWY9K/view?usp=drivesdk" }, 
  { title: "CSM I-10 Hazardous Materials", link: "https://drive.google.com/file/d/1VvcaqQrzivHC5KLRUn3nfFAGlfUZMj0F/view?usp=drivesdk" },
  { title: "CSM I-11 Hand Tools and Power Tools", link: "https://drive.google.com/file/d/1ZMS7gxHaKwPmDj3BXec6SYZ0Ljcy0Ggk/view?usp=drivesdk" },
  { title: "CSM I-12 Materials Handling", link: "https://drive.google.com/file/d/1IpbgrGR0N5K4UBfszVkdtzX00jbZQ6oJ/view?usp=drivesdk" },
  { title: "CSM I-13 Heat Stress", link: "https://drive.google.com/file/d/1OaA5D8-BYsBL7ZReq96BfJ3_nYbgLaNv/view?usp=drivesdk" }, 
  { title: "CSM II-1 Excavations and Shoring", link: "https://drive.google.com/file/d/1imul0j3y9ONgLMSwWZ6aETE6xwvjK34L/view?usp=drivesdk" },
  { title: "CSM II-2 Scaffolding", link: "https://drive.google.com/file/d/1sMWbIwgPp4BO7yNUF-LxrSz1WmNGNeUS/view?usp=drivesdk" },
  { title: "CSM II-3 Ladders and Stepladders", link: "https://drive.google.com/file/d/1SLRwVCUUjJ6BYeDrMUsZnwHTgOt61ujl/view?usp=drivesdk" },
  { title: "CSM II-4 Temporary Walking & Working Surfaces", link: "https://drive.google.com/file/d/1IGR51m-92KQ-I0R3zLVxXbeS2nfmcKWH/view?usp=drivesdk" }, 
  { title: "CSM II-5 Fall Protection", link: "https://drive.google.com/file/d/1uQoZnTHT4VCJkm9SG3zVhW_2Rv-p8vp8/view?usp=drivesdk" },
  { title: "CSM II-6 Concrete Construction ", link: "https://drive.google.com/file/d/1xdtwzdkP4CXWPWL5m9gmz0w4-pzoqrsM/view?usp=drivesdk" },
  { title: "CSM II-7 Steel Erection", link: "https://drive.google.com/file/d/1X8dfslDfmJnYBztL7ZRaeWHz3qPBZ7gX/view?usp=drivesdk" },
  { title: "CSM II-8 Abrasive Blasting", link: "https://drive.google.com/file/d/1qLMljOlgR_EFvnlyWPXmCTt0dCKG4pb6/view?usp=drivesdk" }, 
  { title: "CSM II-9 Painting and Coating", link: "https://drive.google.com/file/d/1NMm17WJBC_7mcmX6GVtBIMToWIT_Hg9H/view?usp=drivesdk" },
  { title: "CSM II-10 Cutting, Welding and Brazing ", link: "https://drive.google.com/file/d/1Qj4-Xl5k76FqyeXUT2XdedLbvL7WJ7Rm/view?usp=drivesdk" },
  { title: "CSM II-11 Road works", link: "https://drive.google.com/file/d/1dbHE3rLRh195UzhfqToiWoqbBdmDAOUP/view?usp=drivesdk" },
  { title: "CSM II-12 Piling Operations and Cofferdams", link: "https://drive.google.com/file/d/1gjSHH7CuLIif6cg8AwA0Cy8yzpD2Nu9I/view?usp=drivesdk" }, 
  { title: "CSM II-13 Explosive Materials", link: "https://drive.google.com/file/d/14aSXwDr8GjK-1TBILalrIV53IXb1Z4lz/view?usp=drivesdk" },
  { title: "CSM II-14 Demolition", link: "https://drive.google.com/file/d/1m0Pk7RfNxftN81DMHIfo2Fu7p8bJu6KP/view?usp=drivesdk" },
  { title: "CSM II-15 Rope Access", link: "https://drive.google.com/file/d/1_C0l2UquZ4Nih_-WmWunQnXpDGAgrDKj/view?usp=drivesdk" },
  { title: "CSM III-1 Machine Guarding ", link: "https://drive.google.com/file/d/1kg9gsGgA6MVs7M515vAe5CEkDRiGm3I4/view?usp=drivesdk" }, 
  { title: "CSM III-2 Mechanical and Heavy Equipment", link: "https://drive.google.com/file/d/1W06lWO34CDskrHm5sfgGnbIuw6gBxnaY/view?usp=drivesdk" },
  { title: "CSM III-3 Electrical Equipment", link: "https://drive.google.com/file/d/1d2_KTb8KaKc7nZh24ZB-5MdBtWOY1ooE/view?usp=drivesdk" },
  { title: "CSM III-4 Pressure Testing", link: "https://drive.google.com/file/d/1MbAdlctVQuZK_WtaPjCPHY0M-BaBrh3r/view?usp=drivesdk" },
  { title: "CSM III-5 Ionizing Radiation", link: "https://drive.google.com/file/d/1j7wdxEhmf3-fjcbwB30cYmSWLs6TOBe6/view?usp=drivesdk" }, 
  { title: "CSM III-6 Non-Destructive Testing (NDT)", link: "https://drive.google.com/file/d/1bTf8WAI1ygyr9Cfvnwif33oEe1yWDE30/view?usp=drivesdk" },
  { title: "CSM III-7 Cranes and Lifting Equipment ", link: "https://drive.google.com/file/d/1jIqqCzc631vyFkDfsi5UYacax6tMFbsm/view?usp=drivesdk" },
  { title: "CSM III-8 Slings and Rigging Hardware", link: "https://drive.google.com/file/d/1WioaM8T9Do9KgzccJ0nXpUKkuWCfg9lR/view?usp=drivesdk" },
  { title: "CSM III-9 High Pressure Water Jetting", link: "https://drive.google.com/file/d/1zfqzW7SF_OROG6BZr2eUWCIcFjH-1pGq/view?usp=drivesdk" }, 
  { title: "CSM IV-1 Diving Operations", link: "https://drive.google.com/file/d/1duFN7U1Kv-i5_y9KPN2FiaVE-hStJHQM/view?usp=drivesdk" },
  { title: "CSM IV-2 Marine Operations ", link: "https://drive.google.com/file/d/1H2R-d02dA1vuBeQSMm9yGHYssb5Kbbkb/view?usp=drivesdk" },
  { title: "CSM IV-3 Drilling and Well Servicing", link: "https://drive.google.com/file/d/1pODZ0oZY5YzH8AURGBG7_ZKamjQIis-v/view?usp=drivesdk" },
  { title: "CSM IV-4 Aviation", link: "https://drive.google.com/file/d/1ZyOCVN7E4Rmf1k4DvJ4YkbdEO95XKxtQ/view?usp=drivesdk" },
  { title: "CSM X- Glossary of Terms", link: "https://drive.google.com/file/d/1LYNw-1mxakpk2a4-WGjKXM6w7nGMXm5K/view?usp=drivesdk" }, 
  { title: "CSM - WSSM Table of Contents ", link: "https://drive.google.com/file/d/14-WcTxSJTqawcvN7D0nmh0McBmqoy1W4/view?usp=drivesdk" },
  { title: "Full CSM Book", link: "https://drive.google.com/file/d/1JS1VQKXLHdOOFXpYcpRftM-kviBv-TYd/view?usp=drivesdk" }
];
// ---- Library cards (JSA & TBT) ----

  // Build one expandable "news-style" card for a library document
  function createLibraryDocCard(item, type) {
    const safeTitle = escapeHtml(item.title || '');
    const safeLink = item.link || '#';

    const desc =
      type === 'jsa'
        ? 'Job Safety Analysis document for specific site activities.'
        : 'Tool Box Talk document for daily or weekly safety briefings.';

    return `
      <article class="announcement-card library-doc-card" data-link="${safeLink}">
        <div class="card-title clickable">
          <span>${safeTitle}</span>
          <i class="fas fa-chevron-down toggle-icon"></i>
        </div>
        <div class="card-content">
          <p style="margin-bottom:0.5rem;">${desc}</p>
          <button type="button" class="library-open-btn">
            Open "${safeTitle}"
          </button>
        </div>
      </article>
    `;
  }

  // Attach expand/collapse + Open button behaviour to cards inside a container
  function wireLibraryCards(container) {
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('.library-doc-card'));

    cards.forEach(card => {
      const titleEl = card.querySelector('.card-title');
      const contentEl = card.querySelector('.card-content');
      const icon = card.querySelector('.toggle-icon');
      const btn = card.querySelector('.library-open-btn');
      const link = card.dataset.link;

      if (contentEl) {
        // start collapsed
        contentEl.style.display = 'none';
      }

      if (titleEl && contentEl) {
        titleEl.addEventListener('click', () => {
          const isOpen = card.classList.contains('open');

          // close all other cards first
          cards.forEach(other => {
            other.classList.remove('open');
            const otherContent = other.querySelector('.card-content');
            const otherIcon = other.querySelector('.toggle-icon');
            if (otherContent) otherContent.style.display = 'none';
            if (otherIcon) otherIcon.classList.remove('rotated');
          });

          if (!isOpen) {
            card.classList.add('open');
            contentEl.style.display = 'block';
            if (icon) icon.classList.add('rotated');
          }
        });
      }

      if (btn && link) {
        btn.addEventListener('click', ev => {
          ev.stopPropagation();
          window.open(link, '_blank');
        });
      }
    });
  }

  // TBT library: search + cards
function setupTbtLibrary() {
  const list = Array.isArray(window.tbtData) ? window.tbtData : [];
  const container = $('#tbtLibraryList');
  const search = $('#tbtSearch');
  if (!container) return;

  function render(filter) {
    const q = (filter || '').toLowerCase();
    const filtered = list.filter(item =>
      !q || (item.title && item.title.toLowerCase().includes(q))
    );

    if (!filtered.length) {
      container.innerHTML = '<p class="text-muted">No TBT found for this search.</p>';
      return;
    }

    container.innerHTML = filtered
      .map(item => `
        <div class="library-item-card">
          <div class="library-item-header">
            <div class="library-item-title">
              <i class="fas fa-book-open"></i>
              <span>${item.title}</span>
            </div>
            <i class="fas fa-chevron-down library-item-toggle"></i>
          </div>
          <div class="library-item-body">
            <a href="${item.link}" target="_blank" class="library-item-open-button">
              <i class="fas fa-external-link-alt"></i>
              Open "${item.title}"
            </a>
          </div>
        </div>
      `)
      .join('');

    const cards = Array.from(container.querySelectorAll('.library-item-card'));

    cards.forEach(card => {
      const headerEl = card.querySelector('.library-item-header');
      const bodyEl = card.querySelector('.library-item-body');
      const toggleIcon = card.querySelector('.library-item-toggle');
      if (!headerEl || !bodyEl) return;

      // start collapsed
      bodyEl.style.display = 'none';

      headerEl.addEventListener('click', () => {
        const isOpen = bodyEl.style.display === 'block';

        // 🔒 close all cards first
        cards.forEach(c => {
          const b = c.querySelector('.library-item-body');
          const i = c.querySelector('.library-item-toggle');
          if (b) b.style.display = 'none';
          if (i) i.classList.remove('rotated');
        });

        // then open the one that was clicked (if it was closed)
        if (!isOpen) {
          bodyEl.style.display = 'block';
          if (toggleIcon) toggleIcon.classList.add('rotated');
        }
      });
    });
  }

  if (!list.length) {
    container.textContent = 'No TBT items found.';
    return;
  }

  render('');

  if (search) {
    search.addEventListener('input', () => {
      render(search.value);
    });
  }
}
  // JSA library: search + cards
function setupJsaLibrary() {
  const list = Array.isArray(window.jsaData) ? window.jsaData : [];
  const container = $('#jsaListContainer');
  const search = $('#jsaSearch');
  if (!container) return;

  function render(filter) {
    const q = (filter || '').toLowerCase();
    const filtered = list.filter(item =>
      !q || (item.title && item.title.toLowerCase().includes(q))
    );

    if (!filtered.length) {
      container.innerHTML = '<p class="text-muted">No JSA found for this search.</p>';
      return;
    }

    container.innerHTML = filtered
      .map(item => `
        <div class="library-item-card">
          <div class="library-item-header">
            <div class="library-item-title">
              <i class="fas fa-clipboard-list"></i>
              <span>${item.title}</span>
            </div>
            <i class="fas fa-chevron-down library-item-toggle"></i>
          </div>
          <div class="library-item-body">
            <a href="${item.link}" target="_blank" class="library-item-open-button">
              <i class="fas fa-external-link-alt"></i>
              Open "${item.title}"
            </a>
          </div>
        </div>
      `)
      .join('');

    const cards = Array.from(container.querySelectorAll('.library-item-card'));

    cards.forEach(card => {
      const headerEl = card.querySelector('.library-item-header');
      const bodyEl = card.querySelector('.library-item-body');
      const toggleIcon = card.querySelector('.library-item-toggle');
      if (!headerEl || !bodyEl) return;

      bodyEl.style.display = 'none';

      headerEl.addEventListener('click', () => {
        const isOpen = bodyEl.style.display === 'block';

        // 🔒 close all JSA cards first
        cards.forEach(c => {
          const b = c.querySelector('.library-item-body');
          const i = c.querySelector('.library-item-toggle');
          if (b) b.style.display = 'none';
          if (i) i.classList.remove('rotated');
        });

        if (!isOpen) {
          bodyEl.style.display = 'block';
          if (toggleIcon) toggleIcon.classList.add('rotated');
        }
      });
    });
  }

  if (!list.length) {
    container.textContent = 'No JSA found.';
    return;
  }

  render('');

  if (search) {
    search.addEventListener('input', () => {
      render(search.value);
    });
  }
}

// CSM library: search + cards
function setupCsmLibrary() {
  const list = Array.isArray(window.csmData) ? window.csmData : [];
  const container = $('#csmLibraryList');
  const search = $('#csmSearch');
  if (!container) return;

  function render(filter) {
    const q = (filter || '').toLowerCase();
    const filtered = list.filter(item =>
      !q || (item.title && item.title.toLowerCase().includes(q))
    );

    if (!filtered.length) {
      container.innerHTML = '<p class="text-muted">No CSM found for this search.</p>';
      return;
    }

    container.innerHTML = filtered
      .map(item => `
        <div class="library-item-card">
          <div class="library-item-header">
            <div class="library-item-title">
              <i class="fas fa-hard-hat"></i>
              <span>${item.title}</span>
            </div>
            <i class="fas fa-chevron-down library-item-toggle"></i>
          </div>
          <div class="library-item-body">
            <a href="${item.link}" target="_blank" class="library-item-open-button">
              <i class="fas fa-external-link-alt"></i>
              Open "${item.title}"
            </a>
          </div>
        </div>
      `)
      .join('');

    const cards = Array.from(container.querySelectorAll('.library-item-card'));

    cards.forEach(card => {
      const headerEl = card.querySelector('.library-item-header');
      const bodyEl = card.querySelector('.library-item-body');
      const toggleIcon = card.querySelector('.library-item-toggle');
      if (!headerEl || !bodyEl) return;

      bodyEl.style.display = 'none';

      headerEl.addEventListener('click', () => {
        const isOpen = bodyEl.style.display == 'block';

        // close all CSM cards first
        cards.forEach(c => {
          const b = c.querySelector('.library-item-body');
          const i = c.querySelector('.library-item-toggle');
          if (b) b.style.display = 'none';
          if (i) i.classList.remove('rotated');
        });

        if (!isOpen) {
          bodyEl.style.display = 'block';
          if (toggleIcon) toggleIcon.classList.add('rotated');
        }
      });
    });
  }

  if (!list.length) {
    container.textContent = 'No CSM items found.';
    return;
  }

  render('');

  if (search) {
    search.addEventListener('input', () => {
      render(search.value);
    });
  }
}
// =========================================
// SAFETY WALKTHROUGH REPORTS LIBRARY
// =========================================
//
// Each item: { title: "Area / Date / Shift", link: "Google Drive or PDF link" }
//
// Initialize Safety Walkthrough reports.
//
// Each item should represent one documented site walkthrough or safety tour.
// Titles below follow the pattern:
// "<Area> - Safety Walkthrough Report on <MM/DD/YYYY>"
window.walkthroughData = [
  {
    title: "Hydro-test Area - Safety Walkthrough Report on 11/10/2025",
    link: "https://drive.google.com/file/d/1ncnvQj-ycV1HmELH_wPkYIHcLvb8_oyE/view?usp=drive_link"
  },
  {
    title: "GGM Fabrication Area - Safety Walkthrough Report on 11/17/2025",
    link: "https://drive.google.com/file/d/17HkZkEfUezXFESUXzA2PDnelo8QCowW4/view?usp=drive_link"
  }
];

function setupWalkthroughLibrary() {
  const list = Array.isArray(window.walkthroughData) ? window.walkthroughData : [];
  const container = $('#walkthroughLibraryList');
  const search = $('#walkthroughSearch');
  if (!container) return;

  function render(filter) {
    const q = (filter || '').toLowerCase();
    const filtered = list.filter(item =>
      !q || (item.title && item.title.toLowerCase().includes(q))
    );

    if (!filtered.length) {
      container.innerHTML = '<p class="text-muted">No Safety Walkthrough reports configured. Add items in js/app.js under window.walkthroughData.</p>';
      return;
    }

    container.innerHTML = filtered
      .map(item => `
        <div class="library-item-card">
          <div class="library-item-header">
            <div class="library-item-title">
              <i class="fa-solid fa-person-walking"></i>
              <span>${item.title}</span>
            </div>
            <i class="fas fa-chevron-down library-item-toggle"></i>
          </div>
          <div class="library-item-body">
            <a href="${item.link}" target="_blank" class="library-item-open-button">
              <i class="fas fa-external-link-alt"></i>
              Open "${item.title}"
            </a>
          </div>
        </div>
      `)
      .join('');

    const cards = Array.from(container.querySelectorAll('.library-item-card'));

    cards.forEach(card => {
      const headerEl = card.querySelector('.library-item-header');
      const bodyEl = card.querySelector('.library-item-body');
      const toggleIcon = card.querySelector('.library-item-toggle');
      let isOpen = false;

      if (bodyEl) bodyEl.style.display = 'none';

      if (headerEl) {
        headerEl.addEventListener('click', () => {
          isOpen = !isOpen;
          if (bodyEl) bodyEl.style.display = isOpen ? 'block' : 'none';
          if (toggleIcon) toggleIcon.classList.toggle('rotated', isOpen);
        });
      }
    });
  }

  render('');

  if (search) {
    search.addEventListener('input', () => {
      render(search.value);
    });
  }
}


  // Switch between "menu" / JSA view / TBT view
function setupLibrarySwitcher() {
  const chooser = $('#libraryChooser');
  const content = $('#libraryContent');
  const backBtn = $('#libraryBackButton');
  const titleEl = $('#libraryTitle');
  const jsaSearchWrapper = $('#libraryJsaSearchWrapper');
  const tbtSearchWrapper = $('#libraryTbtSearchWrapper');
  const csmSearchWrapper = $('#libraryCsmSearchWrapper');
  const walkthroughSearchWrapper = $('#libraryWalkthroughSearchWrapper');
  const tbtList = $('#tbtLibraryList');
  const jsaList = $('#jsaListContainer');
  const csmList = $('#csmLibraryList');
  const walkthroughList = $('#walkthroughLibraryList');

  if (!chooser || !content || !backBtn || !titleEl || !tbtList || !jsaList) return;

  function showChooser() {
    chooser.style.display = 'flex';
    content.style.display = 'none';

    if (jsaSearchWrapper) jsaSearchWrapper.style.display = 'none';
    if (tbtSearchWrapper) tbtSearchWrapper.style.display = 'none';
    if (csmSearchWrapper) csmSearchWrapper.style.display = 'none';
    if (walkthroughSearchWrapper) walkthroughSearchWrapper.style.display = 'none';

    jsaList.style.display = 'none';
    tbtList.style.display = 'none';
    if (csmList) csmList.style.display = 'none';
    if (walkthroughList) walkthroughList.style.display = 'none';
  }

  function openLibrary(type) {
    chooser.style.display = 'none';
    content.style.display = 'block';

    if (type === 'jsa') {
      titleEl.textContent = 'Job Safety Analysis Library';
      if (jsaSearchWrapper) jsaSearchWrapper.style.display = 'block';
      if (tbtSearchWrapper) tbtSearchWrapper.style.display = 'none';
      if (csmSearchWrapper) csmSearchWrapper.style.display = 'none';
      if (walkthroughSearchWrapper) walkthroughSearchWrapper.style.display = 'none';

      jsaList.style.display = 'block';
      tbtList.style.display = 'none';
      if (csmList) csmList.style.display = 'none';
      if (walkthroughList) walkthroughList.style.display = 'none';
    } else if (type === 'tbt') {
      titleEl.textContent = 'Tool Box Talk Library';
      if (jsaSearchWrapper) jsaSearchWrapper.style.display = 'none';
      if (tbtSearchWrapper) tbtSearchWrapper.style.display = 'block';
      if (csmSearchWrapper) csmSearchWrapper.style.display = 'none';
      if (walkthroughSearchWrapper) walkthroughSearchWrapper.style.display = 'none';

      jsaList.style.display = 'none';
      tbtList.style.display = 'block';
      if (csmList) csmList.style.display = 'none';
      if (walkthroughList) walkthroughList.style.display = 'none';
    } else if (type === 'csm') {
      titleEl.textContent = 'Construction Safety Manual (CSM)';
      if (jsaSearchWrapper) jsaSearchWrapper.style.display = 'none';
      if (tbtSearchWrapper) tbtSearchWrapper.style.display = 'none';
      if (csmSearchWrapper) csmSearchWrapper.style.display = 'block';
      if (walkthroughSearchWrapper) walkthroughSearchWrapper.style.display = 'none';

      jsaList.style.display = 'none';
      tbtList.style.display = 'none';
      if (csmList) csmList.style.display = 'block';
      if (walkthroughList) walkthroughList.style.display = 'none';
    } else if (type === 'walkthrough') {
      titleEl.textContent = 'Safety Walkthrough Reports';
      if (jsaSearchWrapper) jsaSearchWrapper.style.display = 'none';
      if (tbtSearchWrapper) tbtSearchWrapper.style.display = 'none';
      if (csmSearchWrapper) csmSearchWrapper.style.display = 'none';
      if (walkthroughSearchWrapper) walkthroughSearchWrapper.style.display = 'block';

      jsaList.style.display = 'none';
      tbtList.style.display = 'none';
      if (csmList) csmList.style.display = 'none';
      if (walkthroughList) walkthroughList.style.display = 'block';
    }

    // scroll to top of content
    content.scrollTop = 0;
  }

  backBtn.addEventListener('click', showChooser);

  $all('.library-choice-card').forEach(card => {
    card.addEventListener('click', () => {
      const type = card.dataset.library;
      openLibrary(type);
    });
  });

  // Default state
  showChooser();
}


// -------------------- Tools (KPI / Heat / Wind) --------------------
// -------------------- Tools (KPI / Heat / Wind) --------------------

  // Heat index formula: convert C to F, apply NOAA formula, back to C
  function calculateHeatIndexC(tempC, humidity) {
    if (tempC == null || humidity == null) return null;
    const T = tempC * 9 / 5 + 32;
    const R = humidity;

    const HI =
      -42.379 +
      2.04901523 * T +
      10.14333127 * R -
      0.22475541 * T * R -
      0.00683783 * T * T -
      0.05481717 * R * R +
      0.00122874 * T * T * R +
      0.00085282 * T * R * R -
      0.00000199 * T * T * R * R;

    const C = (HI - 32) * 5 / 9;
    return C;
  }

  function classifyHeatRisk(heatIndexC) {
    if (heatIndexC == null || isNaN(heatIndexC)) {
      return { label: '--', level: 'unknown' };
    }

    // Based on Saudi Aramco CSM I-13 / Safety Handbook Heat Index categories (°C)
    // Category I  : 25–29  → Caution
    // Category II : 30–38  → Extreme Caution
    // Category III: 39–51  → Danger
    // Category IV : 52+    → Extreme Danger
    if (heatIndexC < 25) {
      // Below Category I – still monitor, but no specific table band
      return { label: 'Safe', level: 'safe' };
    }
    if (heatIndexC < 30) {
      return { label: 'Caution', level: 'caution' };
    }
    if (heatIndexC < 39) {
      return { label: 'Extreme Caution', level: 'warning' };
    }
    if (heatIndexC < 52) {
      return { label: 'Danger', level: 'danger' };
    }
    return { label: 'Extreme Danger', level: 'extreme' };
  }

  
  function computeRiskMatrix(likelihoodLabel, severityLabel) {
    if (!likelihoodLabel || !severityLabel) {
      return {
        score: null,
        level: '--',
        code: '--',
        guidance: 'Select likelihood and severity to see guidance.'
      };
    }

    const likelihoodMap = {
      'Rare': 1,
      'Unlikely': 2,
      'Possible': 3,
      'Likely': 4,
      'Almost Certain': 5
    };

    const severityMap = {
      'First Aid': 1,
      'Medical Treatment': 2,
      'Restricted Work / LTI': 3,
      'Permanent Disability': 4,
      'Fatality': 5
    };

    const l = likelihoodMap[likelihoodLabel] || 0;
    const s = severityMap[severityLabel] || 0;
    if (!l || !s) {
      return {
        score: null,
        level: '--',
        code: '--',
        guidance: 'Select likelihood and severity to see guidance.'
      };
    }

    const score = l * s;
    let level = 'Low';
    let code = 'RA1';
    let guidance = 'RA1: Acceptable risk with existing controls. Maintain routine monitoring and good housekeeping. This helper does not replace the formal Saudi Aramco RA/JSA.';

    if (score >= 5 && score <= 9) {
      level = 'Medium';
      code = 'RA2';
      guidance = 'RA2: Reduce risk by improving controls (engineering/administrative/PPE) and monitor conditions. Obtain at least line supervisor approval before starting.';
    } else if (score >= 10 && score <= 16) {
      level = 'High';
      code = 'RA3';
      guidance = 'RA3: High risk. Do not start work until additional controls are implemented and verified. Require documented RA/JSA and supervisor/area authority authorization. Stop work if any critical control is missing or conditions change.';
    } else if (score >= 17) {
      level = 'Critical';
      code = 'RA4';
      guidance = 'RA4: Critical risk. Stop work / do not approve. Re-design the task or method and consult proponent/HSE. Only proceed if the risk is formally accepted through the Saudi Aramco RA process with higher-level management approval.';
    }

    return { score, level, code, guidance };
  }


  function classifyWindRisk(speed) {
    if (speed == null || isNaN(speed)) {
      return { label: '--', level: 'unknown' };
    }

    // Saudi Aramco Safety Handbook / CSM:
    // - Do not perform crane-suspended personnel platform operations > 25 km/h.
    // - Do not perform crane lifts at wind speeds above 32 km/h.
    //   (Always follow the most restrictive manufacturer limit.)
    if (speed < 20) {
      return { label: 'Safe for normal work', level: 'safe' };
    }

    if (speed < 25) {
      return {
        label: 'Caution – increasing wind, monitor lifts',
        level: 'caution'
      };
    }

    // ≥ 25 km/h – above manbasket limit; crane lifts must also stop once ≥ 32 km/h
    return {
      label: 'STOP manbasket ≥25 km/h; crane lifts ≥32 km/h',
      level: 'danger'
    };
  }

  function formatWindDirection(deg) {
    if (deg == null || isNaN(deg)) return '';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return dirs[index];
  }

  function updateHomeEnvironmentFromWeather(payload) {
    const homeHeat = $('#homeHeatSummary');
    const homeWind = $('#homeWindSummary');
    const hint = $('#homeEnvHint');

    if (!homeHeat || !homeWind) return;

    const { tempC, humidity, windSpeed, windDir } = payload || {};

    // ---- Heat index text ----
    let heatText = '--';
    if (typeof tempC === 'number' && typeof humidity === 'number') {
      const hiC = calculateHeatIndexC(tempC, humidity);
      const risk = classifyHeatRisk(hiC);
      if (hiC != null && !isNaN(hiC) && risk) {
        const roundedHi = Math.round(hiC);
        heatText = `${roundedHi}°C HI – ${risk.label}`;
      }
    }
    homeHeat.textContent = heatText;

    // ---- Wind text ----
    let windText = '--';
    if (typeof windSpeed === 'number') {
      const risk = classifyWindRisk(windSpeed);
      const roundedWind = Math.round(windSpeed);
      const dirLabel = formatWindDirection(windDir);
      if (risk && risk.label) {
        windText = dirLabel
          ? `${roundedWind} km/h ${dirLabel} – ${risk.label}`
          : `${roundedWind} km/h – ${risk.label}`;
      } else {
        windText = `${roundedWind} km/h`;
      }
    }
    homeWind.textContent = windText;

    // ---- Hint line ----
    if (hint) {
      const bits = [];
      if (typeof tempC === 'number') bits.push(`Temp ${Math.round(tempC)}°C`);
      if (typeof humidity === 'number') bits.push(`RH ${Math.round(humidity)}%`);
      if (typeof windSpeed === 'number') bits.push(`Wind ${Math.round(windSpeed)} km/h`);

      if (bits.length) {
        hint.textContent =
          'Live data for your approximate location – ' +
          bits.join(' · ') +
          '. Always verify against site instruments before making safety decisions.';
      } else {
        hint.textContent =
          'Unable to read full weather data. Please use site instruments and the Tools tab for manual calculations.';
      }
    }
  }

  function loadWeatherForCoords(lat, lon) {
    const hint = $('#homeEnvHint');
    const homeHeat = $('#homeHeatSummary');
    const homeWind = $('#homeWindSummary');

    if (homeHeat) homeHeat.textContent = 'Loading...';
    if (homeWind) homeWind.textContent = 'Loading...';
    if (hint) {
      hint.textContent = 'Loading weather for your approximate location...';
    }

    const url =
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${encodeURIComponent(lat)}` +
      `&longitude=${encodeURIComponent(lon)}` +
      '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m' +
      '&timezone=auto';

    fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error('Weather service error');
        }
        return res.json();
      })
      .then(data => {
        const current = data && data.current;
        if (!current) {
          throw new Error('No current weather data returned');
        }

        updateHomeEnvironmentFromWeather({
          tempC:
            typeof current.temperature_2m === 'number'
              ? current.temperature_2m
              : null,
          humidity:
            typeof current.relative_humidity_2m === 'number'
              ? current.relative_humidity_2m
              : null,
          windSpeed:
            typeof current.wind_speed_10m === 'number'
              ? current.wind_speed_10m
              : null,
          windDir:
            typeof current.wind_direction_10m === 'number'
              ? current.wind_direction_10m
              : null
        });
      })
      .catch(err => {
        console.error('Weather fetch failed', err);
        if (hint) {
          hint.textContent =
            'Unable to load weather for your location. Please check your connection or try again later.';
        }
      });
  }

  function askGeoAndLoadWeather() {
    const hint = $('#homeEnvHint');

    // Geolocation only works on HTTPS or localhost.
    const { protocol, hostname } = window.location;
    const isSecureContext =
      protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';

    if (!isSecureContext) {
      if (hint) {
        hint.textContent =
          'Geolocation is blocked on insecure connections. Please host this page on HTTPS or use localhost.';
      }
      alert(
        'To use "Use my location", run this app on HTTPS (or localhost). Browsers block GPS on file:/// or plain HTTP.'
      );
      return;
    }

    if (!navigator.geolocation) {
      if (hint) {
        hint.textContent =
          'Geolocation is not supported on this device. Enter values manually in the Tools tab.';
      }
      alert('Geolocation is not supported on this device/browser.');
      return;
    }

    if (hint) {
      hint.textContent =
        'Getting your location (you may need to allow permission in the browser)...';
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords || {};
        if (latitude == null || longitude == null) {
          if (hint) {
            hint.textContent =
              'Could not read GPS coordinates. Please try again or use manual input in the Tools tab.';
          }
          alert('Could not read GPS coordinates.');
          return;
        }
        loadWeatherForCoords(latitude, longitude);
      },
      err => {
        console.error('Geolocation error', err);
        if (hint) {
          hint.textContent =
            'Unable to get your location: ' +
            err.message +
            '. You can still use the Tools tab for manual calculations.';
        }
        alert('Unable to get your location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

function calculateHeatIndex() {
  const tempInput = $('#inputTemp');
  const humInput = $('#inputHumidity');
  const valueEl = $('#heatIndexValue');
  const levelEl = $('#heatRiskLevel');
  const listEl = $('#heatRecommendationsList');
  const homeHeat = $('#homeHeatSummary');
  const cardEl = $('#heatIndexResultCard');

  if (!tempInput || !humInput || !valueEl || !levelEl || !listEl || !cardEl) return;

  const t = parseFloat(tempInput.value);
  const h = parseFloat(humInput.value);

  // If fields are empty or not numbers, reset card + home card
  if (isNaN(t) || isNaN(h)) {
    valueEl.textContent = '--';
    levelEl.textContent = '--';
    listEl.innerHTML = '<li>Enter temperature and humidity to see results.</li>';

    cardEl.style.backgroundColor = '';
    cardEl.style.color = '';
    cardEl.style.borderColor = '';

    levelEl.style.backgroundColor = '';
    levelEl.style.color = '';
    listEl.style.color = '';

    if (homeHeat) {
      homeHeat.textContent = '--';
      const homeHeatCard = homeHeat.closest('.home-env-card');
      if (homeHeatCard) {
        homeHeatCard.style.backgroundColor = '';
        homeHeatCard.style.color = '';
        homeHeatCard.style.border = '';
      }
    }
    return;
  }

  const heatC = calculateHeatIndexC(t, h);
  const risk = classifyHeatRisk(heatC);

  if (heatC == null || isNaN(heatC)) {
    valueEl.textContent = '--';
    levelEl.textContent = '--';
    listEl.innerHTML = '<li>Enter temperature and humidity to see results.</li>';

    cardEl.style.backgroundColor = '';
    cardEl.style.color = '';
    cardEl.style.borderColor = '';

    levelEl.style.backgroundColor = '';
    levelEl.style.color = '';
    listEl.style.color = '';

    if (homeHeat) {
      homeHeat.textContent = '--';
      const homeHeatCard = homeHeat.closest('.home-env-card');
      if (homeHeatCard) {
        homeHeatCard.style.backgroundColor = '';
        homeHeatCard.style.color = '';
        homeHeatCard.style.border = '';
      }
    }
    return;
  }

  const rounded = Math.round(heatC);
  valueEl.textContent = `${rounded}°C`;

  // 🔁 Lowest category in UI is Caution (no "Safe")
  let label = risk && risk.label ? risk.label : 'Caution';
  if (label === 'Safe') label = 'Caution';

  // Default styling
  let bg = '#22c55e';
  let textColor = '#ffffff';
  let tagBg = 'rgba(15,23,42,0.30)';
  let tagColor = '#ffffff';

  let details = {
    symptoms: '',
    workRest: '',
    water: '',
    controls: ''
  };

  switch (label) {
    case 'Caution':
    case 'Safe':
      bg = '#22c55e'; // green
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.3)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Fatigue possible with prolonged exposure and/or physical activity.',
        workRest: 'Normal/Scheduled.',
        water: '1 cup (250ml) every 20 minutes.',
        controls: 'Visual monitoring of workers in direct sun and during heavy work.'
      };
      break;

    case 'Extreme Caution':
      bg = '#facc15'; // yellow
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.4)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Heat cramps, heat exhaustion, or heat stroke possible with prolonged exposure and physical activity',
        workRest: '50:10.',
        water: '1 cup (250ml) every 20 minutes.',
        controls: 'No working alone (buddy system).'
      };
      break;

    case 'Danger':
      bg = '#f97316'; // orange
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.45)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Heat cramps, heat exhaustion, or heat stroke likely with prolonged exposure and physical activity',
        workRest: '30:10',
        water: '1 cup (250ml) every 15 minutes.',
        controls: 'Work under shade.'
      };
      break;

    case 'Extreme Danger':
      bg = '#dc2626'; // red
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.5)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Collapse, loss of consciousness, heat stroke possible.',
        workRest: '20:10.',
        water: '1 cup (250ml) every 10 minutes.',
        controls: '<li>Assess the risks of working in direct sunlight for an extended period of time, and determine if the work should continue.</li><li>Use engineering controls such as shade and ventilation/ cooling systems for work activities that involve increased risk.</li><li>Seek immediate medical attention for workers exhibiting symptoms of serious heat-related illness.</li><li>Establish and maintain break periods during work activities.</li><li>Drink one cup of water every 10 minutes using a personal water bottle/insulated container (2-liter capacity).</li><li>Do not work alone (i.e., isolated).</li><li>Take extra precautions when flame resistant clothing is required, as such fabrics can intensify heat stress.</li><li>Do not wear fabrics that may increase heat stress (e.g., polyester, nylon).</li>.'
      };
      break;

    default:
      bg = '#64748b';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.35)';
      tagColor = '#ffffff';
      details = {
        symptoms: 'Check inputs and site heat-stress guideline.',
        workRest: 'Follow site GI / CSM recommendations.',
        water: 'Ensure regular drinking schedule is in place.',
        controls: 'Consult HSE for correct category and controls.'
      };
      break;
  }

  // 👉 Tools tab card colors
  cardEl.style.backgroundColor = bg;
  cardEl.style.color = textColor;
  cardEl.style.borderColor = 'rgba(15,23,42,0.15)';

  levelEl.textContent = label;
  levelEl.style.backgroundColor = tagBg;
  levelEl.style.color = tagColor;

  listEl.style.color = textColor;
  listEl.innerHTML = `
    <li><strong>Symptoms:</strong> ${details.symptoms}</li>
    <li><strong>Work / Rest Periods:</strong> ${details.workRest}</li>
    <li><strong>Min. Water Needed:</strong> ${details.water}</li>
    <li><strong>Progressive Controls:</strong> ${details.controls}</li>
  `;

  // 👉 Home tab mini card (same color)
  if (homeHeat) {
    homeHeat.textContent = `${label} (${rounded}°C HI)`;
    state.lastHeatSummary = homeHeat.textContent;

    const homeHeatCard = homeHeat.closest('.home-env-card');
    if (homeHeatCard) {
      homeHeatCard.style.backgroundColor = bg;
      homeHeatCard.style.color = '#ffffff';
      homeHeatCard.style.border = '1px solid rgba(15,23,42,0.20)';
    }
  }
}

  window.calculateHeatIndex = calculateHeatIndex;

function calculateWindSafety() {
  const windInput = $('#inputWind');
  const valueEl = $('#windValue');
  const levelEl = $('#windRiskLevel');
  const listEl = $('#windRecommendationsList');
  const homeWind = $('#homeWindSummary');
  const cardEl = $('#windSpeedResultCard');

  if (!windInput || !valueEl || !levelEl || !listEl || !cardEl) return;

  const v = parseFloat(windInput.value);

  // Reset state if invalid
  if (v == null || isNaN(v)) {
    valueEl.textContent = '--';
    levelEl.textContent = '--';
    listEl.innerHTML = '<li>Enter wind speed to see limits.</li>';

    cardEl.style.backgroundColor = '';
    cardEl.style.color = '';
    cardEl.style.borderColor = '';

    levelEl.style.backgroundColor = '';
    levelEl.style.color = '';
    listEl.style.color = '';

    if (homeWind) {
      homeWind.textContent = '--';
      const homeWindCard = homeWind.closest('.home-env-card');
      if (homeWindCard) {
        homeWindCard.style.backgroundColor = '';
        homeWindCard.style.color = '';
        homeWindCard.style.border = '';
      }
    }
    return;
  }

  const risk = classifyWindRisk(v); // your existing helper

  valueEl.textContent = `${v.toFixed(0)} km/h`;

  // Default: green (safe)
  let bg = '#22c55e';
  let textColor = '#ffffff';
  let tagBg = 'rgba(15,23,42,0.30)';
  let tagColor = '#ffffff';

  let details = {
    operations: '',
    manbasket: '',
    monitoring: '',
    controls: ''
  };

  switch (risk.level) {
    case 'safe':
      // 🟢 Safe – normal work
      bg = '#22c55e';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.35)';
      tagColor = '#ffffff';
      details = {
        operations: 'Normal crane and equipment operations allowed per approved lift plan.',
        manbasket: 'Personnel platforms allowed below 32 km/h with full pre-use checks.',
        monitoring: 'Check wind at least every 30 minutes and whenever conditions change.',
        controls: 'Ensure calibrated anemometer, clear communications, follow CSM I-11 limits.'
      };
      break;

    case 'caution':
      // 🟡 Caution – approaching limit
      bg = '#facc15';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.45)';
      tagColor = '#ffffff';
      details = {
        operations: 'Limit or postpone non-essential lifts; reduce radius / load where possible.',
        manbasket: 'Review the need for man-basket; be ready to suspend if speed increases.',
        monitoring: 'Continuous monitoring with readings logged; watch for gusts.',
        controls: 'Brief crew, extend exclusion zone, supervisor to approve each lift individually.'
      };
      break;

    case 'danger':
      // 🔴 Danger – above man-basket limit
      bg = '#dc2626';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.55)';
      tagColor = '#ffffff';
      details = {
        operations: 'Suspend non-critical crane / lifting operations until wind returns to safe limits.',
        manbasket: 'STOP all man-basket / personnel platform operations and lower basket safely.',
        monitoring: 'Continue monitoring; only restart when wind is stable back in safe range.',
        controls: 'Notify supervisor / HSE, apply Stop Work Authority, barricade the area per CSM.'
      };
      break;

    default:
      bg = '#64748b';
      textColor = '#ffffff';
      tagBg = 'rgba(15,23,42,0.40)';
      tagColor = '#ffffff';
      details = {
        operations: 'Check input values and refer to site wind-limit guideline.',
        manbasket: 'Follow man-basket limits from CSM / GI.',
        monitoring: 'Keep monitoring until a clear category is confirmed.',
        controls: 'Consult HSE for correct limits and required controls.'
      };
      break;
  }

  // 👉 Tools tab card
  cardEl.style.backgroundColor = bg;
  cardEl.style.color = textColor;
  cardEl.style.borderColor = 'rgba(15,23,42,0.15)';

  levelEl.textContent = risk.label;
  levelEl.style.backgroundColor = tagBg;
  levelEl.style.color = tagColor;

  listEl.style.color = textColor;
  listEl.innerHTML = `
    <li><strong>Crane &amp; Equipment:</strong> ${details.operations}</li>
    <li><strong>Man-basket / Personnel:</strong> ${details.manbasket}</li>
    <li><strong>Monitoring:</strong> ${details.monitoring}</li>
    <li><strong>Required Controls:</strong> ${details.controls}</li>
  `;

  // 👉 Home tab mini card
  if (homeWind) {
    homeWind.textContent = `${risk.label} (${v.toFixed(0)} km/h)`;
    state.lastWindSummary = homeWind.textContent;

    const homeWindCard = homeWind.closest('.home-env-card');
    if (homeWindCard) {
      homeWindCard.style.backgroundColor = bg;
      homeWindCard.style.color = '#ffffff';
      homeWindCard.style.border = '1px solid rgba(15,23,42,0.20)';
    }
  }
}

  window.calculateWindSafety = calculateWindSafety;

  
// -------------------- Training Matrix tool --------------------

const TRAINING_MODULES = [
  { id: 'site-orientation', title: 'SITE SPECIFIC SAFETY ORIENTATION / COC', years: 2 },
  { id: 'environmental-orientation', title: 'ENVIRONMENTAL ORIENTATION', years: 2 },
  { id: 'defensive-driving', title: 'DEFENSIVE & OFF-ROAD DRIVING / JMP', years: 2 },
  { id: 'emergency-response', title: 'EMERGENCY RESPONSE PROCEDURE', years: 2 },
  { id: 'fire-prevention', title: 'FIRE PREVENTION & PROTECTION', years: 2 },
  { id: 'hand-power-tools', title: 'HAND & POWER TOOLS / ELECTRICAL SAFETY', years: 2 },
  { id: 'ppe', title: 'PERSONAL PROTECTIVE EQUIPMENT (PPE)', years: 2 },
  { id: 'heat-stress', title: 'HEAT STRESS AWARENESS', years: 2 },
  { id: 'haz-chem', title: 'HAZARDOUS CHEMICALS / RPE', years: 1 },
  { id: 'heavy-equipment', title: 'HEAVY EQUIPMENT SAFETY', years: 1 },
  { id: 'work-permit', title: 'WORK PERMIT SYSTEM', years: 2 },
  { id: 'authorized-gas-tester', title: 'AUTHORIZED GAS TESTER', years: 2 },
  { id: 'confined-space', title: 'CONFINED SPACE ENTRY / RESCUE', years: 2 },
  { id: 'hazard-recognition', title: 'HAZARD RECOGNITION', years: 2 },
  { id: 'safe-rigging-lifting', title: 'SAFE RIGGING & LIFTING', years: 2 },
  { id: 'loto-isolation', title: 'LOTO - ISOLATION', years: 2 },
  { id: 'excavation-safety', title: 'EXCAVATION SAFETY', years: 2 },
  { id: 'work-at-height', title: 'WORK AT HEIGHT & LADDERS SAFETY', years: 2 },
  { id: 'hip-cssp', title: 'HIP / CSSP', years: 2 },
  { id: 'h2s', title: 'HYDROGEN SULFIDE (H2S)', years: 2 },
  { id: 'incident-reporting', title: 'INCIDENT REPORTING & INVESTIGATION', years: 2 },
  { id: 'housekeeping', title: 'HOUSEKEEPING', years: 2 },
  { id: 'jsa', title: 'JOB SAFETY ANALYSIS & PRE JOB BRIEFING', years: 2 },
  { id: 'manual-handling', title: 'MATERIALS / MANUAL HANDLING', years: 2 },
  { id: 'line-of-fire', title: 'LINE OF FIRE', years: 2 },
  { id: 'sa-safety-handbook', title: 'SA SAFETY HAND BOOK / CSM 24 HRS / CSAR', years: 2 },
  { id: 'compressed-gas', title: 'COMPRESSED GAS CYLINDERS', years: 2 },
  { id: 'first-aid-bls', title: 'FIRST AID (FA) & BASIC LIFE SUPPORT (BLS)', years: 2 },
  { id: 'hmi', title: 'HUMAN MACHINE INTERFACE', years: 2 },
  { id: 'hydrotest-safety', title: 'HYDROTEST SAFETY', years: 2 },
  { id: 'abrasive-blasting', title: 'ABRASIVE BLASTING SAFETY', years: 2 },
  { id: 'pwas-awareness', title: 'PWAS AWARENESS', years: 2 },
  { id: 'flagman-resp', title: 'FLAG MAN RESPONSIBILITIES', years: 2 },
  { id: 'fire-watch-resp', title: 'FIRE WATCH RESPONSIBILITIES', years: 2 },
  { id: 'standby-man-resp', title: 'STANDBY MAN RESPONSIBILITIES', years: 2 },
  { id: 'stop-work', title: 'STOP WORK AUTHORITY', years: 2 },
];

// Job roles taken from the project HSE training matrix
const TRAINING_ROLES = [
  { id: 'project-manager', label: 'Project Manager' },
  { id: 'construction-manager', label: 'Construction Manager' },
  { id: 'project-engineers', label: 'Project Engineers' },
  { id: 'site-engineers', label: 'Site Engineers' },
  { id: 'surveyors', label: 'Surveyors' },
  { id: 'supervisors', label: 'Supervisors' },
  { id: 'foremen', label: 'Foremen' },
  { id: 'chargehands', label: 'Chargehands' },
  { id: 'welders', label: 'Welders' },
  { id: 'masons', label: 'Masons' },
  { id: 'electricians', label: 'Electricians' },
  { id: 'equipment-operators', label: 'Equipment Operators' },
  { id: 'crane-operators', label: 'Crane Operators' },
  { id: 'riggers', label: 'Riggers' },
  { id: 'heavy-duty-drivers', label: 'Heavy Duty Drivers' },
  { id: 'light-duty-drivers', label: 'Light Duty Drivers' },
  { id: 'store-personnel', label: 'Store Personnel' },
  { id: 'pipe-fitters', label: 'Pipe Fitters' },
  { id: 'sand-blasters', label: 'Sand Blasters' },
  { id: 'hsse-wp-coordinator', label: 'HSSE & WP Coordinator' },
  { id: 'safety-officers', label: 'Safety Officers' },
  { id: 'work-permit-receiver', label: 'Work Permit Receiver' },
  { id: 'office-workers', label: 'Office Workers' },
  { id: 'kitchen-staff', label: 'Kitchen Staff' },
  { id: 'camp-staff', label: 'Camp Staff' },
  { id: 'qaqc-personnel', label: 'QA/QC Personnel' },
  { id: 'labor', label: 'Labor' },
];

const ALL_TRAINING_IDS = TRAINING_MODULES.map(m => m.id);

const TRAINING_MATRIX = {
  'project-manager': ALL_TRAINING_IDS,
  'construction-manager': ALL_TRAINING_IDS,
  'project-engineers': ALL_TRAINING_IDS,
  'site-engineers': ALL_TRAINING_IDS,
  'surveyors': ALL_TRAINING_IDS,
  'supervisors': ALL_TRAINING_IDS,
  'foremen': ALL_TRAINING_IDS,
  'chargehands': ALL_TRAINING_IDS,
  'welders': ALL_TRAINING_IDS,
  'masons': ALL_TRAINING_IDS,
  'electricians': ALL_TRAINING_IDS,
  'equipment-operators': ALL_TRAINING_IDS,
  'crane-operators': ALL_TRAINING_IDS,
  'riggers': ALL_TRAINING_IDS,
  'heavy-duty-drivers': ALL_TRAINING_IDS,
  'light-duty-drivers': ALL_TRAINING_IDS,
  'store-personnel': ALL_TRAINING_IDS,
  'pipe-fitters': ALL_TRAINING_IDS,
  'sand-blasters': ALL_TRAINING_IDS,
  'hsse-wp-coordinator': ALL_TRAINING_IDS,
  'safety-officers': ALL_TRAINING_IDS,
  'work-permit-receiver': ALL_TRAINING_IDS,
  'office-workers': ALL_TRAINING_IDS,
  'kitchen-staff': ALL_TRAINING_IDS,
  'camp-staff': ALL_TRAINING_IDS,
  'qaqc-personnel': ALL_TRAINING_IDS,
  'labor': ALL_TRAINING_IDS,
};

const TRAINING_MODULES_BY_ID = TRAINING_MODULES.reduce((acc, mod) => {
  acc[mod.id] = mod;
  return acc;
}, {});

function setupTrainingMatrixTool() {
  const roleSelect = $('#trainingRoleSelect');
  const searchInput = $('#trainingSearchInput');
  const resultsEl = $('#trainingMatrixResults');
  if (!roleSelect || !resultsEl) return;

  // Populate roles dropdown
  roleSelect.innerHTML =
    '<option value="">Select job role…</option>' +
    TRAINING_ROLES.map(role =>
      '<option value="' + role.id + '">' + escapeHtml(role.label) + '</option>'
    ).join('');

  function render() {
    const roleId = roleSelect.value;
    const search = (searchInput && searchInput.value || '').toLowerCase().trim();

    if (!roleId) {
      resultsEl.innerHTML =
        '<p class="text-muted">Select a job role above to view mandatory trainings.</p>';
      return;
    }

    const moduleIds = TRAINING_MATRIX[roleId] || [];
    if (!moduleIds.length) {
      resultsEl.innerHTML =
        '<p class="text-muted">No trainings configured yet for this role.</p>';
      return;
    }

    const modules = moduleIds
      .map(id => TRAINING_MODULES_BY_ID[id])
      .filter(Boolean)
      .filter(mod => !search || mod.title.toLowerCase().includes(search));

    if (!modules.length) {
      resultsEl.innerHTML =
        '<p class="text-muted">No trainings match this search for the selected role.</p>';
      return;
    }

    const itemsHtml = modules.map(mod => {
      const years = mod.years || 2;
      const yearsLabel = years === 1 ? 'Valid 1 year' : 'Valid ' + years + ' years';
      return (
        '<div class="training-row">' +
          '<div class="training-title">' + escapeHtml(mod.title) + '</div>' +
          '<div class="training-meta">' +
            '<span class="training-chip training-chip-required">Required</span>' +
            '<span class="training-chip training-chip-years">' + yearsLabel + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    resultsEl.innerHTML = itemsHtml;
  }

  roleSelect.addEventListener('change', render);
  if (searchInput) searchInput.addEventListener('input', render);

  // Initial state
  render();
}


function setupTools() {
    const riskBtn = document.querySelector('[data-tool="risk"]');
    const heatBtn = document.querySelector('[data-tool="heat"]'); // Calculators
    const trainingBtn = document.querySelector('[data-tool="training"]');

    const riskSection = $('#riskMatrixSection');
    const heatSection = $('#heatStressSection');
    const windSection = $('#windSpeedSection');
    const trainingSection = $('#trainingMatrixSection');

    function setActive(tool) {
      [riskBtn, heatBtn, trainingBtn].forEach(btn => btn && btn.classList.remove('active-tool'));

      if (tool === 'risk' && riskBtn) riskBtn.classList.add('active-tool');
      if (tool === 'heat' && heatBtn) heatBtn.classList.add('active-tool');
      if (tool === 'training' && trainingBtn) trainingBtn.classList.add('active-tool');

      const showRisk = tool === 'risk';
      const showCalculators = tool === 'heat';
      const showTraining = tool === 'training';

      if (riskSection) riskSection.style.display = showRisk ? 'block' : 'none';
      if (heatSection) heatSection.style.display = showCalculators ? 'block' : 'none';
      if (windSection) windSection.style.display = showCalculators ? 'block' : 'none';
      if (trainingSection) trainingSection.style.display = showTraining ? 'block' : 'none';
    }

    if (riskBtn) riskBtn.addEventListener('click', () => setActive('risk'));
    if (heatBtn) heatBtn.addEventListener('click', () => setActive('heat'));
    if (trainingBtn) trainingBtn.addEventListener('click', () => setActive('training'));

    // expose for any old inline onclick
    window.switchTool = setActive;

    // default view: Risk Matrix
    setActive('risk');
  }

// -------------------- Permits (CSV) --------------------

async function loadPermits() {
  const url = window.PERMITS_SHEET_CSV_URL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2D8IOXDcrOpuD1u4moykgT8tNxtsUGIcPjZkwN8gnuwgHCEz4eCh9_5n83vhYoraB4YSkm9YAda17/pub?output=csv';
  const list = $('#permitsList');
  const emptyState = $('#permitsEmptyState');
  const totalEl = $('#permitsCountTotal');
  const todayEl = $('#permitsCountToday');

  if (!list) return;

  if (emptyState) emptyState.style.display = 'none';
  list.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading permits...</div>';

  if (!url) {
    list.innerHTML = '<p class="text-muted">No permits sheet configured. Set PERMITS_SHEET_CSV_URL in js/data.js.</p>';
    if (emptyState) {
      emptyState.style.display = 'block';
      const p = emptyState.querySelector('p');
      if (p) p.textContent = 'No permits sheet configured. Set PERMITS_SHEET_CSV_URL in js/data.js.';
    }
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('Empty sheet');

    const headers = rows[0];
    const body = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

    const idxDate = findColumnIndex(headers, ['Date']);
    const idxArea = findColumnIndex(headers, ['Area / Location', 'Area', 'Location']);
    const idxReceiver = findColumnIndex(headers, ['Work Permit Receiver Name', 'Work Permit Receiver Name :', 'Receiver']);
    const idxProject = findColumnIndex(headers, ['Project']);
    const idxType = findColumnIndex(headers, ['Work Permit Type', 'Permit Type']);
    const idxNumber = findColumnIndex(headers, ['Work Permit Number', 'Work Permit Number :', 'Permit Number']);
    const idxDesc = findColumnIndex(headers, ['Work Description (summary)', 'Work Description', 'Description']);
    const idxCorrective = findColumnIndex(headers, ['Corrective actions taken (if any)', 'Corrective actions taken']);
    const idxIssues = findColumnIndex(headers, ['Any issues / unsafe acts / remarks?', 'Any issues / unsafe acts / remarks']);
    const idxPermitFile = findColumnIndex(headers, ['Upload today’s Work Permit (photo/PDF)', "Upload today's Work Permit (photo/PDF)"]);
    const idxConfirm = findColumnIndex(headers, ['Confirmation']);

    const evidenceIndices = [];
    if (headers && headers.length) {
      headers.forEach((h, i) => {
        const v = (h || '').toLowerCase();
        if (v.includes('upload work evidence')) {
          evidenceIndices.push(i);
        }
      });
    }

    const permits = body.map((row, index) => {
      const dateRaw = idxDate !== -1 ? (row[idxDate] || '') : '';
      const date = parseSheetDate(dateRaw);
      const area = idxArea !== -1 ? (row[idxArea] || '') : '';
      const receiver = idxReceiver !== -1 ? (row[idxReceiver] || '') : '';
      const project = idxProject !== -1 ? (row[idxProject] || '') : '';
      const type = idxType !== -1 ? (row[idxType] || '') : '';
      const permitNo = idxNumber !== -1 ? (row[idxNumber] || '') : '';
      const description = idxDesc !== -1 ? (row[idxDesc] || '') : '';
      const corrective = idxCorrective !== -1 ? (row[idxCorrective] || '') : '';
      const issues = idxIssues !== -1 ? (row[idxIssues] || '') : '';
      const permitFile = idxPermitFile !== -1 ? (row[idxPermitFile] || '') : '';
      const confirmation = idxConfirm !== -1 ? (row[idxConfirm] || '') : '';

      const evidence = evidenceIndices
        .map(i => row[i])
        .filter(Boolean)
        .map(v => (v || '').trim());

      return {
        _index: index,
        dateRaw,
        date,
        area,
        receiver,
        project,
        type,
        permitNo,
        description,
        corrective,
        issues,
        permitFile,
        evidence,
        confirmation
      };
    });

    state.permits = permits;
    state.permitsLoaded = true;

    // Refresh home KPIs now that permits are loaded
    if (typeof updateHomeFromObservations === 'function') {
      updateHomeFromObservations();
    }

    buildPermitsFilterOptions();
    renderPermitsList();
    updateToolsSnapshot();
  } catch (err) {
    console.error('Failed to load permits', err);
    if (list) {
      list.innerHTML =
        '<p class="text-muted">Could not load permits. Check the sheet link or network connection.</p>';
    }
    if (emptyState) emptyState.style.display = 'block';
  }
}

function buildPermitsFilterOptions() {
  const permits = state.permits || [];
  const areaSelect = $('#permitsAreaFilter');
  const typeSelect = $('#permitsTypeFilter');

  if (!areaSelect || !typeSelect) return;

  const areas = Array.from(
    new Set(permits.map(p => (p.area || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const types = Array.from(
    new Set(permits.map(p => (p.type || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  areaSelect.innerHTML = '<option value="">All Areas</option>' + areas
    .map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`)
    .join('');

  typeSelect.innerHTML = '<option value="">All Types</option>' + types
    .map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
    .join('');
}

function getPermitTypeClass(type) {
  if (!type) return '';
  const t = type.toLowerCase();

  if (t.includes('hot')) return 'permit-type-hot';
  if (t.includes('cold')) return 'permit-type-cold';
  if (t.includes('opening') || t.includes('line break') || t.includes('line-break')) return 'permit-type-opening';
  if (t.includes('confined')) return 'permit-type-confined';
  return '';
}

function getPermitTypeLabel(type) {
  if (!type) return '';
  const t = type.toLowerCase();

  if (t.includes('hot')) return 'Hot Work';
  if (t.includes('cold')) return 'Cold Work';
  if (t.includes('opening') || t.includes('line break') || t.includes('line-break')) {
    return 'Equipment Opening / Line Break';
  }
  if (t.includes('confined')) return 'Confined Space Entry';
  return type;
}


function updatePermitsSummary(baseList, rangeList) {
  const allPermits = state.permits || [];
  const base = Array.isArray(baseList) ? baseList : allPermits;
  const range = Array.isArray(rangeList) ? rangeList : base;

  const rangeKey = permitsFilterState.range || 'today';
  let labelText = 'All';
  if (rangeKey === 'today') labelText = 'Today';
  else if (rangeKey === 'week') labelText = 'This Week';
  else if (rangeKey === 'month') labelText = 'This Month';

  const totalPermits = base.length;
  const receivers = Array.from(new Set(
    base.map(p => (p.receiver || '').trim()).filter(Boolean)
  ));

  const totalEl = $('#permitsCountTotal');
  const receiversEl = $('#permitsCountReceivers');
  const rangeLabelEl = $('#permitsSummaryLabel');
  const rangeCountEl = $('#permitsCountToday');

  if (totalEl) totalEl.textContent = totalPermits ? String(totalPermits) : '0';
  if (receiversEl) receiversEl.textContent = receivers.length ? String(receivers.length) : '0';
  if (rangeLabelEl) rangeLabelEl.textContent = labelText;
  if (rangeCountEl) rangeCountEl.textContent = range.length ? String(range.length) : '0';
}


function renderPermitsList() {
  const list = $('#permitsList');
  const emptyState = $('#permitsEmptyState');

  if (!list) return;

  const permits = state.permits || [];

  if (!permits.length) {
    list.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    updatePermitsSummary([], []);
    return;
  }

  const { range, area, type, search } = permitsFilterState;
  const searchTerm = (search || '').toLowerCase();
  const today = startOfDay(new Date());

  // First apply non-date filters (area, type, search)
  let baseFiltered = permits.filter(p => {
    if (area && (!p.area || p.area !== area)) return false;
    if (type && (!p.type || p.type !== type)) return false;

    if (searchTerm) {
      const hay = [
        p.area,
        p.type,
        p.receiver,
        p.project,
        p.permitNo,
        p.description,
        p.issues
      ].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(searchTerm)) return false;
    }
    return true;
  });

  // Then apply the date-range filter for the list / range card
  let rangeFiltered = baseFiltered.filter(p => {
    if (!range || range === 'all') return true;
    if (!p.date) return false;
    if (range === 'today') return isSameDay(p.date, today);
    if (range === 'week') return Math.abs(daysBetween(p.date, today)) <= 7;
    if (range === 'month') return isSameMonth(p.date, today);
    return true;
  });

  if (!rangeFiltered.length) {
    list.innerHTML = '<p class="text-muted">No permits match the current filters.</p>';
    if (emptyState) emptyState.style.display = 'block';
    updatePermitsSummary(baseFiltered, []);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  list.innerHTML = rangeFiltered.map(p => {
    const dateText = p.date
      ? p.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : (p.dateRaw || '');

    const typeChipClass = getPermitTypeClass(p.type);
    const hasEvidence = Array.isArray(p.evidence) && p.evidence.length;

    const evidenceIcon = hasEvidence
      ? '<span class="obs-evidence-chip" title="Work evidence attached"><i class="fas fa-image"></i></span>'
      : '';

    return `
      <article class="obs-card permit-card" data-permit-index="${p._index}">
        <header class="obs-card-header">
          <div class="obs-card-date">${escapeHtml(dateText)}</div>
          <div class="obs-card-badges">
            ${evidenceIcon}
            ${p.area ? `<span class="obs-chip">${escapeHtml(p.area)}</span>` : ''}
            ${p.type ? `<span class="obs-chip permit-type-chip ${typeChipClass}">${escapeHtml(getPermitTypeLabel(p.type))}</span>` : ''}
          </div>
        </header>
        <div class="obs-card-body">
          <div class="obs-main-line">
            <span class="obs-type">${escapeHtml(p.project || 'Work Permit')}</span>
            <span class="obs-area">${escapeHtml(p.permitNo || '')}</span>
          </div>
          <p class="obs-description">${escapeHtml(p.description || '')}</p>
        </div>
        <footer class="obs-card-footer">
          <span class="obs-reporter">
            <i class="fas fa-user-shield"></i>
            ${escapeHtml(p.receiver || 'Unknown receiver')}
          </span>
        </footer>
      </article>
    `;
  }).join('');

  list.querySelectorAll('.permit-card').forEach(card => {
    card.addEventListener('click', () => {
      const idxStr = card.getAttribute('data-permit-index');
      const idx = parseInt(idxStr, 10);
      const permit = state.permits[idx];
      if (permit) showPermitDetail(permit);
    });
  });

  updatePermitsSummary(baseFiltered, rangeFiltered);
}

function setupPermitsFilters() {
  const rangeButtons = $all('#PermitsTab .permits-filter-chip');
  const areaSelect = $('#permitsAreaFilter');
  const typeSelect = $('#permitsTypeFilter');
  const searchInput = $('#permitsSearch');
  const openSheetBtn = $('#permitsOpenSheetButton');

  rangeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      rangeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      permitsFilterState.range = btn.dataset.range || 'today';
      renderPermitsList();
    });
  });

  if (areaSelect) {
    areaSelect.addEventListener('change', () => {
      permitsFilterState.area = areaSelect.value || '';
      renderPermitsList();
    });
  }

  if (typeSelect) {
    typeSelect.addEventListener('change', () => {
      permitsFilterState.type = typeSelect.value || '';
      renderPermitsList();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      permitsFilterState.search = searchInput.value || '';
      renderPermitsList();
    });
  }

  if (openSheetBtn) {
    openSheetBtn.addEventListener('click', () => {
      const url = window.PERMITS_FULL_SHEET_URL ||
        window.PERMITS_SHEET_CSV_URL ||
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vS2D8IOXDcrOpuD1u4moykgT8tNxtsUGIcPjZkwN8gnuwgHCEz4eCh9_5n83vhYoraB4YSkm9YAda17/pub?output=csv';
      window.open(url, '_blank');
    });
  }
}

function showPermitDetail(permit) {
  const modal = $('#permitDetailModal');
  const body = $('#permitDetailBody');
  if (!modal || !body) return;

  const dateText = permit.date
    ? permit.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : (permit.dateRaw || '');

  const row = (label, value) => {
    if (!value) return '';
    return `
      <div class="obs-detail-row">
        <div class="obs-detail-label">${label}</div>
        <div class="obs-detail-value">${value}</div>
      </div>
    `;
  };

  const evidenceLinks = Array.isArray(permit.evidence) ? permit.evidence : [];
  let evidenceSection = '';
  if (evidenceLinks.length || permit.permitFile) {
    const rawLinks = [permit.permitFile, ...evidenceLinks].map(v => (v || '').trim()).filter(Boolean);
    const validLinks = rawLinks.filter(url => /^https?:\/\//i.test(url));

    if (validLinks.length) {
      const linksInline = validLinks
        .map((url, i) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Evidence ${i + 1}</a>`)
        .join(' • ');

      evidenceSection = `
        <section class="obs-detail-section">
          <div class="obs-detail-section-title">Permits &amp; Evidence</div>
          <p class="obs-detail-description-box">
            ${linksInline}
          </p>
          <p class="obs-detail-hint">
            Evidence is stored in Google Drive. Open the links above to view today’s permit and site photos.
          </p>
        </section>
      `;
    }
  }

  body.innerHTML = `
    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Overview</div>
      <div class="obs-detail-grid">
        ${row('Date', escapeHtml(dateText))}
        ${row('Area / Location', escapeHtml(permit.area || ''))}
        ${row('Project', escapeHtml(permit.project || ''))}
        ${row('Work Permit Type', escapeHtml(permit.type || ''))}
        ${row('Work Permit Number', escapeHtml(permit.permitNo || ''))}
        ${row('Receiver Name', escapeHtml(permit.receiver || ''))}
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Work Description</div>
      <div class="obs-detail-description-box">
        ${escapeHtml(permit.description || 'No description provided.')}
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Corrective Actions</div>
      <div class="obs-detail-description-box">
        ${escapeHtml(permit.corrective || 'No corrective actions recorded.')}
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Issues / Unsafe Acts / Remarks</div>
      <div class="obs-detail-description-box">
        ${escapeHtml(permit.issues || 'No issues recorded.')}
      </div>
    </section>

    ${evidenceSection}

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Confirmation</div>
      <div class="obs-detail-description-box">
        ${escapeHtml(permit.confirmation || 'No confirmation recorded.')}
      </div>
    </section>
  `;


  const uploadSection = document.createElement('section');
  uploadSection.className = 'obs-detail-section';
  uploadSection.innerHTML = `
    <div class="obs-detail-section-title">Additional Evidence (App Upload)</div>
    <div class="evidence-upload-row">
      <input type="file" id="permitEvidenceFileInput" accept="image/*" />
      <button type="button" class="obs-open-sheet-btn" id="permitEvidenceUploadButton">
        <i class="fas fa-upload"></i>
        Upload photo
      </button>
    </div>
    <div class="evidence-list" id="permitEvidenceList"></div>
    <p class="obs-detail-hint">
      Use this area to upload extra permit photos directly to the app.
      Existing Google Drive links above remain available for historical evidence.
    </p>
  `;
  body.appendChild(uploadSection);

  setupPermitEvidenceUpload(permit);

  modal.classList.add('show');
}



function setupPermitEvidenceUpload(permit) {
  const refCode = permit.permitNo || permit.id || permit.dateRaw || '';
  if (!refCode) {
    return;
  }

  const fileInput = document.getElementById('permitEvidenceFileInput');
  const uploadBtn = document.getElementById('permitEvidenceUploadButton');
  const listEl = document.getElementById('permitEvidenceList');

  if (!fileInput || !uploadBtn || !listEl) return;

  const category = 'permit';

  const loadList = async () => {
    try {
      const files = await fetchEvidenceList(category, refCode);
      renderEvidenceList(listEl, files);
    } catch (err) {
      console.error('Failed to load permit evidence list:', err);
      listEl.innerHTML = '<p class="text-danger">Could not load uploaded evidence.</p>';
    }
  };

  uploadBtn.addEventListener('click', async () => {
    if (!fileInput.files || !fileInput.files.length) {
      alert('Please choose an image to upload.');
      return;
    }

    const file = fileInput.files[0];
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
      await uploadEvidenceFile(category, refCode, file);
      fileInput.value = '';
      await loadList();
    } catch (err) {
      console.error('Failed to upload permit evidence:', err);
      alert('Failed to upload evidence. Please try again.');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload photo';
    }
  });

  loadList();
}

function showToolboxDetail(talk) {
  const modal = $('#toolboxDetailModal');
  const body = $('#toolboxDetailBody');
  if (!modal || !body) return;

  const dateText = talk.date
    ? talk.date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : (talk.dateRaw || '');

  const row = (label, value) => {
    if (!value) return '';
    return `
      <div class="obs-detail-row">
        <div class="obs-detail-label">${label}</div>
        <div class="obs-detail-value">${value}</div>
      </div>
    `;
  };

  
  // Evidence: support multiple evidence links (Evidence 1, Evidence 2...) same as observations/permits
  const evidenceRaw = (talk.evidence || '').trim();
  let evidenceSection = '';
  if (evidenceRaw) {
    const parts = evidenceRaw
      .split(/[;,\n]+/)
      .map(v => (v || '').trim())
      .filter(Boolean);

    const links = parts.filter(v => /^https?:\/\//i.test(v));
    const inline = links
      .map((url, i) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Evidence ${i + 1}</a>`)
      .join(' • ');

    if (inline) {
      evidenceSection = `
      <section class="obs-detail-section">
        <div class="obs-detail-section-title">Toolbox Talk Evidence</div>
        <div class="obs-detail-description-box">
          ${inline}
        </div>
        <p class="obs-detail-hint">
          Evidence is stored in Google Drive. Open the links to view toolbox talk photos and attendance records.
        </p>
      </section>
    `;
    }
  }

body.innerHTML = `
    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Overview</div>
      <div class="obs-detail-grid">
        ${row('Date', escapeHtml(dateText))}
        ${row('Area / Location', escapeHtml(talk.area || ''))}
        ${row('Topic', escapeHtml(talk.topic || ''))}
        ${row('No. of Attendance', talk.attendance != null ? escapeHtml(String(talk.attendance)) : '')}
      </div>
    </section>

    ${evidenceSection}
  `;

  modal.classList.add('show');
}

function hideToolboxDetailModal() {
  const modal = $('#toolboxDetailModal');
  if (modal) modal.classList.remove('show');
}


function hidePermitDetailModal() {
  const modal = $('#permitDetailModal');
  if (modal) modal.classList.remove('show');
}

window.hideToolboxDetailModal = hideToolboxDetailModal;

window.hidePermitDetailModal = hidePermitDetailModal;


// -------------------- Observations (CSV) --------------------

async function loadObservations() {
  const url = window.OBSERVATIONS_SHEET_CSV_URL;
  const emptyState = $('#observationsEmptyState');
  if (!url) {
    if (emptyState) {
      emptyState.style.display = 'block';
      emptyState.querySelector('p').textContent =
        'No observations sheet configured. Set OBSERVATIONS_SHEET_CSV_URL in js/data.js.';
    }
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('Empty sheet');

    const headers = rows[0];
    const body = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

    const idxCode = findColumnIndex(headers, ['Code']);
    const idxDate = findColumnIndex(headers, ['Date']);
    const idxDay = findColumnIndex(headers, ['Day']);
    const idxGroup = findColumnIndex(headers, ['Group #', 'Group', 'Group No', 'Group Number']);

    const idxType = findColumnIndex(headers, ['Activity Type', 'Observation Types', 'Observation Type']);
    const idxClass = findColumnIndex(headers, ['Observation Class']);
    const idxObsTypes = findColumnIndex(headers, ['Observation Types']);

    const idxInjuryFlag = findColumnIndex(headers, ['Injury/No Injury', 'Injury / No Injury']);
    const idxInjuryType = findColumnIndex(headers, ['Type of Injury', 'Injury Type']);

    const idxDesc = findColumnIndex(headers, ['Description', 'Details']);
    const idxName = findColumnIndex(headers, ['Name', 'Observer', 'Reported By']);
    const idxId = findColumnIndex(headers, ['ID', 'Badge', 'Iqama']);
    const idxPosition = findColumnIndex(headers, ['Position', 'Job Title']);

    const idxDirect = findColumnIndex(headers, ['Direct Cause']);
    const idxRoot = findColumnIndex(headers, ['Root Cause']);
    const idxEquip = findColumnIndex(headers, ['Equipment / Tool', 'Equipment', 'Tool']);

    const idxArea = findColumnIndex(headers, ['Area', 'Location']);
    const idxLikelihood = findColumnIndex(headers, ['Likelihood']);
    const idxSeverity = findColumnIndex(headers, ['Severity']);
    const idxRaRate = findColumnIndex(headers, ['RA Rate', 'Risk Rate']);
    const idxRaLevel = findColumnIndex(headers, ['RA Level', 'Risk Level']);
    const idxStatus = findColumnIndex(headers, ['Report Status', 'Status']);
    const idxGi = findColumnIndex(headers, ['GI Number #', 'GI Number', 'GI #']);
    const idxComments = findColumnIndex(headers, ['Comments', 'Comment']);
    const idxEvidence = findColumnIndex(headers, [
      'Observations Evidents',
      'Observation Evidence',
      'Evidence',
      'Observation Evident',
      'Evidence Link'
    ]);

    const observations = body.map(row => {
      const dateRaw = idxDate !== -1 ? row[idxDate] : '';
      const date = parseSheetDate(dateRaw);
      const groupVal = idxGroup !== -1 ? (row[idxGroup] || '') : '';

      const evidenceRaw = idxEvidence !== -1 ? (row[idxEvidence] || '') : '';
      const evidenceLinks = parseEvidenceLinks(evidenceRaw);

      return {
        // Basic identifiers
        code: idxCode !== -1 ? (row[idxCode] || '') : '',
        date,
        dateRaw,
        day: idxDay !== -1 ? (row[idxDay] || '') : '',
        group: groupVal,

        // Type / classification
        type: idxType !== -1 ? (row[idxType] || '') : '',
        obsClass: idxClass !== -1 ? (row[idxClass] || '') : '',
        obsTypes: idxObsTypes !== -1 ? (row[idxObsTypes] || '') : '',

        // Injury info
        injuryFlag: idxInjuryFlag !== -1 ? (row[idxInjuryFlag] || '') : '',
        injuryType: idxInjuryType !== -1 ? (row[idxInjuryType] || '') : '',

        // Description & person
        description: idxDesc !== -1 ? (row[idxDesc] || '') : '',

        // 👇 Reporter is always the group name
        reporter: groupVal,
        id: idxId !== -1 ? (row[idxId] || '') : '',
        position: idxPosition !== -1 ? (row[idxPosition] || '') : '',

        // Causes
        directCause: idxDirect !== -1 ? (row[idxDirect] || '') : '',
        rootCause: idxRoot !== -1 ? (row[idxRoot] || '') : '',

        // Equipment / area
        equipment: idxEquip !== -1 ? (row[idxEquip] || '') : '',
        area: idxArea !== -1 ? (row[idxArea] || '') : '',

        // Risk assessment
        likelihood: idxLikelihood !== -1 ? (row[idxLikelihood] || '') : '',
        severity: idxSeverity !== -1 ? (row[idxSeverity] || '') : '',
        raRate: idxRaRate !== -1 ? (row[idxRaRate] || '') : '',
        raLevel: idxRaLevel !== -1 ? (row[idxRaLevel] || '') : '',
        status: idxStatus !== -1 ? (row[idxStatus] || '') : '',

        // GI / comments
        giNumber: idxGi !== -1 ? (row[idxGi] || '') : '',
        comments: idxComments !== -1 ? (row[idxComments] || '') : '',

        // Evidence
        evidenceLinks,
        evidenceUrl: evidenceLinks[0] || '',
        hasEvidence: evidenceLinks.length > 0
      };
    });

    state.observations = observations;
    state.observationsLoaded = true;

    populateObservationsAreaFilter(observations);

    updateHomeFromObservations();
    updateHomeObservationInsights();
    updateToolsSnapshot();
    setupObservationsFilters();
    renderObservationsList();
  } catch (err) {
    console.error('Observations load error:', err);
    const list = $('#observationsList');
    if (list) list.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
  }
}


function populateObservationsAreaFilter(list) {
  const select = $('#obsFilterArea');
  if (!select || !Array.isArray(list)) return;

  const current = select.value || '';
  const areas = Array.from(
    new Set(
      list
        .map(o => (o.area || '').trim())
        .filter(v => v && v.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));

  // Build options: All Areas + unique areas
  let optionsHtml = '<option value="">All Areas</option>';
  optionsHtml += areas
    .map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`)
    .join('');

  select.innerHTML = optionsHtml;

  // Try to preserve previous selection if still valid
  if (current && areas.includes(current)) {
    select.value = current;
  } else {
    select.value = '';
  }
}
function updateHomeFromObservations() {
  const obs = state.observations || [];
  const permits = state.permits || [];

  if (!obs.length && !permits.length) return;

  const today = startOfDay(new Date());

  const todayObs = obs.filter(o => o.date && isSameDay(o.date, today));
  const todayPermits = permits.filter(p => p.date && isSameDay(p.date, today));

  const obsTodayEl = $('#homeObservationsToday');
  const permitsTodayEl = $('#homePermitsToday');

  if (obsTodayEl) obsTodayEl.textContent = todayObs.length || '--';
  if (permitsTodayEl) permitsTodayEl.textContent = todayPermits.length || '--';
}




function handleHomeDonutClick(dimension, label) {
  if (!label) return;

  // Switch to Observations tab (this will also lazy-load observations on first open)
  const obsTabButton = document.querySelector('.nav-button[data-tab="ObservationsTab"]');
  if (obsTabButton) {
    obsTabButton.click();
  }

  // Force range to "this month" to match the Home insights logic
  if (typeof obsFilterState !== 'undefined') {
    obsFilterState.range = 'month';
  }
  const rangeButtons = document.querySelectorAll('#ObservationsTab .obs-filter-chip');
  rangeButtons.forEach(btn => {
    const isMonth = (btn.dataset.range || '') === 'month';
    btn.classList.toggle('active', isMonth);
  });

  // Update observation filter state based on dimension
  if (dimension === 'area') {
    if (typeof obsFilterState !== 'undefined') {
      obsFilterState.area = label;
      // Clear any previous free-text search so area filter is clean
      obsFilterState.search = '';
    }
    const areaSelect = document.getElementById('obsFilterArea');
    if (areaSelect) {
      areaSelect.value = label;
    }
    const searchInput = document.getElementById('obsSearch');
    if (searchInput) {
      searchInput.value = '';
    }
  } else if (dimension === 'directCause') {
    // If there is a dedicated direct cause filter, use it
    const dcSelect = document.getElementById('obsFilterDirectCause');
    if (dcSelect) {
      dcSelect.value = label;
    } else {
      // Fallback: use search filter
      if (typeof obsFilterState !== 'undefined') {
        obsFilterState.search = label.toLowerCase();
      }
      const searchInput = document.getElementById('obsSearch');
      if (searchInput) {
        searchInput.value = label;
      }
    }
  }

  // Re-render observations using the new filters
  if (typeof renderObservationsList === 'function') {
    renderObservationsList();
  }
}


function updateHomeTopAreasChart(topAreas) {
  const canvas = document.getElementById('homeTopAreasChart');
  if (!canvas || typeof Chart === 'undefined') return;

  // If no data, clear existing chart if present
  if (!topAreas || !topAreas.length) {
    if (homeTopAreasChart) {
      homeTopAreasChart.destroy();
      homeTopAreasChart = null;
    }
    return;
  }

  const labels = topAreas.map(item => item[0]);
  const data = topAreas.map(item => item[1]);

  // Recreate chart each update to keep it simple
  if (homeTopAreasChart) {
    homeTopAreasChart.destroy();
  }

  homeTopAreasChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: 'Observations',
        data,
        // Chart.js will auto-assign colors; we just set general styling
        borderWidth: 1,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed;
              const label = context.label || '';
              return `${label}: ${value} observations`;
            }
          }
        }
      },
      onClick(evt, elements) {
        if (!elements || !elements.length) return;
        const index = elements[0].index;
        const label = labels[index];
        handleHomeDonutClick('area', label);
      }
    }
  });
}


function updateHomeTopDirectCausesChart(topDirect) {
  const canvas = document.getElementById('homeTopDirectCausesChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (!topDirect || !topDirect.length) {
    if (homeTopDirectChart) {
      homeTopDirectChart.destroy();
      homeTopDirectChart = null;
    }
    return;
  }

  const labels = topDirect.map(item => item[0]);
  const data = topDirect.map(item => item[1]);

  if (homeTopDirectChart) {
    homeTopDirectChart.destroy();
  }

  homeTopDirectChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: 'Observations',
        data,
        borderWidth: 1,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '55%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            boxWidth: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label(context) {
              const value = context.parsed;
              const label = context.label || '';
              return `${label}: ${value} observations`;
            }
          }
        }
      },
      onClick(evt, elements) {
        if (!elements || !elements.length) return;
        const index = elements[0].index;
        const label = labels[index];
        handleHomeDonutClick('directCause', label);
      }
    }
  });
}

function updateHomeObservationInsights() {
  const listAreas = $('#homeTopAreasList');
  const listDirect = $('#homeTopDirectCausesList');

  if (!listAreas && !listDirect) return;

  const all = state.observations || [];
  if (!all.length) {
    const msg = '<li>No observations loaded yet.</li>';
    if (listAreas) listAreas.innerHTML = msg;
    if (listDirect) listDirect.innerHTML = msg;
    return;
  }

  const now = new Date();
  const thisMonth = all.filter(o => o.date && isSameMonth(o.date, now));
  const source = thisMonth.length ? thisMonth : all;

  function buildTopList(getKey) {
    const counts = new Map();
    for (const o of source) {
      const raw = (getKey(o) || '').trim();
      if (!raw) continue;
      const key = raw;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const arr = Array.from(counts.entries());
    arr.sort((a, b) => b[1] - a[1]);
    return arr.slice(0, 5);
  }

  const topAreas = buildTopList(o => o.area);
  const topDirect = buildTopList(o => o.directCause);

  if (listAreas) {
    if (!topAreas.length) {
      listAreas.innerHTML = '<li>No area data available for this month.</li>';
    } else {
      listAreas.innerHTML = topAreas
        .map(([name, count]) => `
          <li>
            <span class="home-insight-name">${escapeHtml(name)}</span>
            <span class="home-insight-count">${count}</span>
          </li>
        `)
        .join('');
    }
  }

  // Update Home tab donut charts
  try {
    updateHomeTopAreasChart(topAreas);
    updateHomeTopDirectCausesChart(topDirect);
  } catch (e) {
    console.error('Home chart error', e);
  }

  if (listDirect) {
    if (!topDirect.length) {
      listDirect.innerHTML = '<li>No direct cause data available for this month.</li>';
    } else {
      listDirect.innerHTML = topDirect
        .map(([name, count]) => `
          <li>
            <span class="home-insight-name">${escapeHtml(name)}</span>
            <span class="home-insight-count">${count}</span>
          </li>
        `)
        .join('');
    }
  }
}





function updateToolsSnapshot() {
  const obs = state.observations || [];
  const permits = state.permits || [];

  const toolsObsTodayEl = $('#toolsObservationsToday');
  const toolsPermitsTodayEl = $('#toolsPermitsToday');
  const toolsHighRiskEl = $('#toolsHighRiskOpen');

  if (!toolsObsTodayEl && !toolsPermitsTodayEl && !toolsHighRiskEl) return;

  const today = startOfDay(new Date());

  const todayObs = obs.filter(o => o.date && isSameDay(o.date, today));
  const highRiskOpen = obs.filter(o => {
    const level = (o.raLevel || '').toLowerCase();
    const status = (o.status || '').toLowerCase();
    return level.includes('high') && !status.includes('close');
  }).length;

  const todayPermits = permits.filter(p => p.date && isSameDay(p.date, today));

  if (toolsObsTodayEl) toolsObsTodayEl.textContent = todayObs.length || '--';
  if (toolsPermitsTodayEl) toolsPermitsTodayEl.textContent = todayPermits.length || '--';
  if (toolsHighRiskEl) toolsHighRiskEl.textContent = highRiskOpen || '0';
}

function filterObservationsForRange(list, range) {
  if (!range || range === 'all') return list.slice();
  const today = startOfDay(new Date());

  return list.filter(o => {
    if (!o.date) return false;
    if (range === 'today') return isSameDay(o.date, today);
    if (range === 'week') return Math.abs(daysBetween(o.date, today)) <= 7;
    if (range === 'month') return isSameMonth(o.date, today);
    return true;
  });
}

function updateObservationsSummary(filteredList) {
  // Use the currently rendered/filtered observations list when provided,
  // otherwise fall back to all observations.
  const allObs = state.observations || [];
  const obs = Array.isArray(filteredList) ? filteredList : allObs;

  const range = obsFilterState.range || 'today';
  let labelText = 'All';
  if (range === 'today') labelText = 'Today';
  else if (range === 'week') labelText = 'This Week';
  else if (range === 'month') labelText = 'This Month';

  const totalCount = obs.length;

  const openCount = obs.filter(o =>
    (o.status || '').toLowerCase().includes('open') ||
    (o.status || '').toLowerCase().includes('progress')
  ).length;

  const closedCount = obs.filter(o =>
    (o.status || '').toLowerCase().includes('close')
  ).length;

  const labelEl = $('#obsSummaryLabel');
  const totalEl = $('#obsCountMonth');
  const openEl = $('#obsCountOpen');
  const closedEl = $('#obsCountClosed');

  if (labelEl) labelEl.textContent = labelText;
  if (totalEl) totalEl.textContent = totalCount || '0';
  if (openEl) openEl.textContent = openCount || '0';
  if (closedEl) closedEl.textContent = closedCount || '0';
}


function setupObservationsFilters() {
  const rangeButtons = $all('#ObservationsTab .obs-filter-chip');
  const areaSelect = $('#obsFilterArea');
  const statusSelect = $('#obsFilterStatus');
  const searchInput = $('#obsSearch');

  rangeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      rangeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      obsFilterState.range = btn.dataset.range || 'today';
      renderObservationsList();
    });
  });

  if (areaSelect) {
    areaSelect.addEventListener('change', () => {
      obsFilterState.area = areaSelect.value || '';
      renderObservationsList();
    });
  }
  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      obsFilterState.status = statusSelect.value || '';
      renderObservationsList();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      obsFilterState.search = searchInput.value.toLowerCase();
      renderObservationsList();
    });
  }

  const openSheetBtn = $('#openSheetButton');
  if (openSheetBtn) {
    openSheetBtn.addEventListener('click', () => {
      const url = window.OBSERVATIONS_FULL_SHEET_URL || window.OBSERVATIONS_SHEET_CSV_URL;
      if (url) window.open(url, '_blank');
    });
  }
}


function renderObservationsList() {
  const listEl = $('#observationsList');
  const emptyState = $('#observationsEmptyState');
  if (!listEl) return;

  let obs = (state.observations || []).map((o, idx) => ({
    ...o,
    _index: idx
  }));

  if (!obs.length) {
    listEl.innerHTML = `
      <div class="obs-empty">
        <i class="fas fa-info-circle"></i>
        <p>No observations loaded yet.</p>
      </div>
    `;
    if (emptyState) emptyState.style.display = 'block';
    updateObservationsSummary([]);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  // Apply filters
  obs = filterObservationsForRange(obs, obsFilterState.range);

  if (obsFilterState.area) {
    const a = obsFilterState.area.toLowerCase();
    obs = obs.filter(o => (o.area || '').toLowerCase() === a);
  }
  if (obsFilterState.status) {
    const s = obsFilterState.status.toLowerCase();
    obs = obs.filter(o => (o.status || '').toLowerCase().includes(s));
  }
  if (obsFilterState.search) {
    const q = obsFilterState.search;
    obs = obs.filter(o => {
      return (
        (o.area || '').toLowerCase().includes(q) ||
        (o.type || '').toLowerCase().includes(q) ||
        (o.obsClass || '').toLowerCase().includes(q) ||
        (o.reporter || '').toLowerCase().includes(q) ||
        (o.description || '').toLowerCase().includes(q)
      );
    });
  }

  if (!obs.length) {
    listEl.innerHTML = `
      <div class="obs-empty">
        <i class="fas fa-info-circle"></i>
        <p>No observations match the selected filters.</p>
      </div>
    `;
    updateObservationsSummary([]);
    return;
  }

  const cardsHtml = obs.map(o => {
    const risk = (o.raLevel || '').toLowerCase();
    const status = (o.status || '').toLowerCase();

    // Stripe on left side of card (light theme colors set in CSS)
    let cardRiskClass = 'risk-neutral';
    if (risk.includes('high')) cardRiskClass = 'risk-high';
    else if (risk.includes('medium')) cardRiskClass = 'risk-medium';
    else if (risk.includes('low')) cardRiskClass = 'risk-low';

    // Small pill badge for RA level
    let badgeRiskClass = 'badge-neutral';
    if (risk.includes('high')) badgeRiskClass = 'badge-high';
    else if (risk.includes('medium')) badgeRiskClass = 'badge-medium';
    else if (risk.includes('low')) badgeRiskClass = 'badge-low';

    let statusClass = 'status-other';
    if (status.includes('open') || status.includes('progress')) statusClass = 'status-open';
    if (status.includes('close')) statusClass = 'status-closed';

    const dateText = o.date
      ? o.date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      : (o.dateRaw || '');

    return `
      <article class="obs-card ${cardRiskClass}" data-obs-index="${o._index}">
        <header class="obs-card-header">
          <div class="obs-card-date">${dateText}</div>
          <div class="obs-card-badges">
            ${o.hasEvidence ? `
              <span class="obs-evidence-chip" title="Evidence attached" aria-label="Evidence attached">
                <i class="fas fa-image"></i>
              </span>
            ` : ''}
            <span class="badge ${badgeRiskClass}">${o.raLevel || 'No RA'}</span>
            <span class="status-pill ${statusClass}">${o.status || 'No status'}</span>
          </div>
        </header>
        <div class="obs-card-body">
          <div class="obs-main-line">
            <span class="obs-type">${o.type || o.obsClass || 'Observation'}</span>
            <span class="obs-area">${o.area || ''}</span>
          </div>
          <p class="obs-description">${o.description || ''}</p>
        </div>
        <footer class="obs-card-footer">
          <span class="obs-reporter">
            <i class="fas fa-users"></i>
            ${o.group || o.reporter || 'Unknown group'}
          </span>
        </footer>
      </article>
    `;
  }).join('');

  listEl.innerHTML = cardsHtml;
  updateObservationsSummary(obs);

  // Click handler → open detail modal
  const cards = Array.from(listEl.querySelectorAll('.obs-card'));
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const idxStr = card.getAttribute('data-obs-index');
      if (!idxStr) return;
      const idx = parseInt(idxStr, 10);
      const obsItem = state.observations[idx];
      if (obsItem) {
        showObservationDetail(obsItem);
      }
    });
  });
}

function showObservationDetail(obs) {
  const modal = $('#observationDetailModal');
  const body = $('#observationDetailBody');
  if (!modal || !body) return;

  const dateText = obs.date
    ? obs.date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : (obs.dateRaw || '');

  // Helper for rows
  const row = (label, value) => {
    if (!value) return '';
    return `
      <div class="obs-detail-row">
        <div class="obs-detail-label">${label}</div>
        <div class="obs-detail-value">${value}</div>
      </div>
    `;
  };

  // ---------- header pills (Code / RA / Status) ----------

  // RA level class
  const raText = (obs.raLevel || '').toLowerCase();
  let raChipClass = 'obs-header-pill ra-neutral';
  if (raText.includes('high')) raChipClass = 'obs-header-pill ra-high';
  else if (raText.includes('medium')) raChipClass = 'obs-header-pill ra-medium';
  else if (raText.includes('low')) raChipClass = 'obs-header-pill ra-low';

  // Status class (Open = green, Closed = red)
  const statusText = (obs.status || '').toLowerCase();
  let statusChipClass = 'obs-header-pill status-other';
  if (statusText.includes('open') || statusText.includes('progress')) {
    statusChipClass = 'obs-header-pill status-open';
  } else if (statusText.includes('close')) {
    statusChipClass = 'obs-header-pill status-closed';
  }

  // Observation Class – mark Negative in red
  const obsClassValue = obs.obsClass || '';
  const obsClassHtml = obsClassValue
    ? `<span class="obs-class-value ${
        /negative/i.test(obsClassValue) ? 'negative' : ''
      }">${obsClassValue}</span>`
    : '';

  body.innerHTML = `
    <div class="obs-detail-header-line">
      <div class="obs-header-left">
        ${obs.code ? `<span class="obs-header-pill code">Code: ${obs.code}</span>` : ''}
      </div>
      <div class="obs-header-right">
        ${obs.raLevel ? `<span class="${raChipClass}">${obs.raLevel}</span>` : ''}
        ${obs.status ? `<span class="${statusChipClass}">${obs.status}</span>` : ''}
      </div>
    </div>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Overview</div>
      <div class="obs-detail-grid">
        ${row('Date', dateText)}
        ${row('Day', obs.day)}
        ${row('Area', obs.area)}
        ${row('Activity Type', obs.type)}
        ${row('Observation Class', obsClassHtml)}
        ${row('Observation Types', obs.obsTypes)}
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Description</div>
      <div class="obs-detail-description-box">
        ${obs.description || 'No description provided.'}
      </div>
    </section>

    ${(() => {
      const links = Array.isArray(obs.evidenceLinks) ? obs.evidenceLinks : (obs.evidenceUrl ? [obs.evidenceUrl] : []);
      const valid = links
        .map(v => (v || '').trim())
        .filter(v => v && /^https?:\/\//i.test(v));
      if (!valid.length) return '';
      const inline = valid
        .map((url, i) => `<a href="${url}" target="_blank" rel="noopener">Evidence ${i + 1}</a>`)
        .join(' • ');
      return `
        <section class="obs-detail-section">
          <div class="obs-detail-section-title">Observation Evidence</div>
          <p class="obs-detail-description-box">
            ${inline}
          </p>
          <p class="obs-detail-hint">
            Evidence is stored in Google Drive. Open the links to view observation photos and attachments.
          </p>
        </section>
      `;
    })()}

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Person / Group</div>
      <div class="obs-detail-grid">
        ${row('Group / Reporter', obs.group || obs.reporter)}
        ${row('Injury/No Injury', obs.injuryFlag)}
        ${row('Type of Injury', obs.injuryType)}
        ${row('ID', obs.id)}
        ${row('Position', obs.position)}
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Causes &amp; Risk</div>
      <div class="obs-detail-grid">
        ${row('Direct Cause', obs.directCause)}
        ${row('Root Cause', obs.rootCause)}
        ${row('Equipment / Tool', obs.equipment)}
        ${row('Likelihood', obs.likelihood)}
        ${row('Severity', obs.severity)}
        ${row('RA Rate', obs.raRate)}
        ${row('RA Level', obs.raLevel)}
        ${row('GI Number #', obs.giNumber)}
        ${row('Comments', obs.comments)}
      </div>
    </section>
  `;


  const uploadSection = document.createElement('section');
  uploadSection.className = 'obs-detail-section';
  uploadSection.innerHTML = `
    <div class="obs-detail-section-title">Additional Evidence (App Upload)</div>
    <div class="evidence-upload-row">
      <input type="file" id="obsEvidenceFileInput" accept="image/*" />
      <button type="button" class="obs-open-sheet-btn" id="obsEvidenceUploadButton">
        <i class="fas fa-upload"></i>
        Upload photo
      </button>
    </div>
    <div class="evidence-list" id="obsEvidenceList"></div>
    <p class="obs-detail-hint">
      Use this area to upload extra observation photos directly to the app.
      Existing Google Drive links above remain available for historical evidence.
    </p>
  `;
  body.appendChild(uploadSection);

  setupObservationEvidenceUpload(obs);

  modal.classList.add('show');
}



function setupObservationEvidenceUpload(obs) {
  const refCode = obs.code || obs.id || obs.dateRaw || '';
  if (!refCode) {
    return;
  }

  const fileInput = document.getElementById('obsEvidenceFileInput');
  const uploadBtn = document.getElementById('obsEvidenceUploadButton');
  const listEl = document.getElementById('obsEvidenceList');

  if (!fileInput || !uploadBtn || !listEl) return;

  const category = 'observation';

  const loadList = async () => {
    try {
      const files = await fetchEvidenceList(category, refCode);
      renderEvidenceList(listEl, files);
    } catch (err) {
      console.error('Failed to load observation evidence list:', err);
      listEl.innerHTML = '<p class="text-danger">Could not load uploaded evidence.</p>';
    }
  };

  uploadBtn.addEventListener('click', async () => {
    if (!fileInput.files || !fileInput.files.length) {
      alert('Please choose an image to upload.');
      return;
    }

    const file = fileInput.files[0];
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Uploading...';

    try {
      await uploadEvidenceFile(category, refCode, file);
      fileInput.value = '';
      await loadList();
    } catch (err) {
      console.error('Failed to upload observation evidence:', err);
      alert('Failed to upload evidence. Please try again.');
    } finally {
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Upload photo';
    }
  });

  loadList();
}

function showToolboxDetail(talk) {
  const modal = $('#toolboxDetailModal');
  const body = $('#toolboxDetailBody');
  if (!modal || !body) return;

  const dateText = talk.date
    ? talk.date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : (talk.dateRaw || '');

  const row = (label, value) => {
    if (!value) return '';
    return `
      <div class="obs-detail-row">
        <div class="obs-detail-label">${label}</div>
        <div class="obs-detail-value">${value}</div>
      </div>
    `;
  };

  
  // Evidence: support multiple evidence links (Evidence 1, Evidence 2...) same as observations/permits
  const evidenceRaw = (talk.evidence || '').trim();
  let evidenceSection = '';
  if (evidenceRaw) {
    const parts = evidenceRaw
      .split(/[;,\n]+/)
      .map(v => (v || '').trim())
      .filter(Boolean);

    const links = parts.filter(v => /^https?:\/\//i.test(v));
    const inline = links
      .map((url, i) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">Evidence ${i + 1}</a>`)
      .join(' • ');

    if (inline) {
      evidenceSection = `
      <section class="obs-detail-section">
        <div class="obs-detail-section-title">Toolbox Talk Evidence</div>
        <div class="obs-detail-description-box">
          ${inline}
        </div>
        <p class="obs-detail-hint">
          Evidence is stored in Google Drive. Open the links to view toolbox talk photos and attendance records.
        </p>
      </section>
    `;
    }
  }

body.innerHTML = `
    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Overview</div>
      <div class="obs-detail-grid">
        ${row('Date', escapeHtml(dateText))}
        ${row('Area / Location', escapeHtml(talk.area || ''))}
        ${row('Topic', escapeHtml(talk.topic || ''))}
        ${row('No. of Attendance', talk.attendance != null ? escapeHtml(String(talk.attendance)) : '')}
      </div>
    </section>

    ${evidenceSection}
  `;

  modal.classList.add('show');
}

function hideToolboxDetailModal() {
  const modal = $('#toolboxDetailModal');
  if (modal) modal.classList.remove('show');
}


function hideObservationDetailModal() {
  const modal = $('#observationDetailModal');
  if (modal) modal.classList.remove('show');
}

window.showObservationDetail = showObservationDetail;
window.hideObservationDetailModal = hideObservationDetailModal;


  // -------------------- News --------------------

// -------------------- News --------------------

  // -------------------- News --------------------

// -------------------- News --------------------

  async function loadNews() {
    const url = window.NEWS_SHEET_CSV_URL;
    const container = $('#AnnouncementsContainer');
    const loading = $('#newsLoading');

    if (!container) return;

    if (!url) {
      container.innerHTML =
        '<p class="text-muted">Configure NEWS_SHEET_CSV_URL in js/data.js to load news.</p>';
      return;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const rows = parseCSV(text);
      if (!rows.length) throw new Error('Empty sheet');

      const headers = rows[0];
      let body = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

      // Keep only the latest 6 news items (assuming sheet is already sorted by date, latest first)
      if (body.length > 6) {
        body = body.slice(0, 6);
      }

      const idxDate = findColumnIndex(headers, ['Date']);
      const idxTitle = findColumnIndex(headers, ['Title', 'Subject']);
      const idxContent = findColumnIndex(headers, ['Description', 'Content', 'Details', 'Body']);

      if (loading) loading.style.display = 'none';

      if (!body.length) {
        container.innerHTML = '<p class="text-muted">No news found.</p>';
        return;
      }

      // Build cards
      container.innerHTML = body.map(row => {
        const d = idxDate !== -1 ? (row[idxDate] || '') : '';
        const t = idxTitle !== -1 ? (row[idxTitle] || '') : 'No Title';
        let c = idxContent !== -1 ? (row[idxContent] || '') : '';

        // Normalise "empty" content
        const raw = (c || '').trim();
        const hasRealDetails = raw && raw.toLowerCase() !== 'no details';

        if (!hasRealDetails) {
          c = 'No details.'; // what you saw before
        }

        const cardClasses = ['announcement-card'];
        if (!hasRealDetails) cardClasses.push('no-details');

        return `
          <div class="${cardClasses.join(' ')}">
            <div class="card-date">${d}</div>
            <div class="card-title${hasRealDetails ? ' clickable' : ''}">
              ${t}
              ${hasRealDetails ? '<i class="fas fa-chevron-down toggle-icon"></i>' : ''}
            </div>
            <div class="card-content">${c}</div>
          </div>
        `;
      }).join('');

      // Attach click handlers (only when there are real details)
      $all('.announcement-card').forEach(card => {
        const contentEl = card.querySelector('.card-content');
        const icon = card.querySelector('.toggle-icon');

        if (!contentEl) {
          return;
        }

        // Cards that truly have no extra details stay open/static
        if (card.classList.contains('no-details')) {
          card.classList.add('open');
          return;
        }

        // Start collapsed; visual expand/collapse is handled by CSS via the .open class
        card.classList.remove('open');

        // Make the whole card clickable to expand/collapse; close others when one opens
        card.addEventListener('click', () => {
          const alreadyOpen = card.classList.contains('open');

          // Close all other cards
          $all('.announcement-card.open').forEach(other => {
            if (other === card) return;
            other.classList.remove('open');
            const otherIcon = other.querySelector('.toggle-icon');
            if (otherIcon) otherIcon.classList.remove('rotated');
          });

          // Toggle current card
          const isOpen = !alreadyOpen;
          card.classList.toggle('open', isOpen);
          if (icon) icon.classList.toggle('rotated', isOpen);
        });
      });
    } catch (err) {
      console.error('News load error:', err);
      if (loading) loading.style.display = 'none';
      container.innerHTML = `
        <div class="announcement-card no-details">
          <div class="card-date">Error</div>
          <div class="card-title">Failed to fetch news</div>
          <div class="card-content">
            Check the <strong>NEWS_SHEET_CSV_URL</strong> in js/data.js or your network connection.
          </div>
        </div>
      `;
    }
  }

function setupNewsPanel() {
  const toggleBtn = document.getElementById('newsToggleButton');
  const panel = document.getElementById('NewsPanel');
  const backBtn = document.getElementById('newsBackButton');

  if (!toggleBtn || !panel) return;

  const openPanel = () => {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
  };

  const closePanel = () => {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
  };

  toggleBtn.addEventListener('click', openPanel);
  if (backBtn) {
    backBtn.addEventListener('click', closePanel);
  }
}



  

// -------------------- Heavy Equipment Register --------------------

async function loadHeavyEquipment() {
  const url = window.HEAVY_EQUIPMENT_SHEET_CSV_URL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_OgUxJ8EheAsb_TxMcacQZf8DeUjKI_caEXZrWScZhOBzqRqjcUi8Tf5qduX4OEXXaVxbTOLRGIXF/pub?output=csv';

  const list = $('#heavyEquipmentList');
  const emptyState = $('#heavyEquipmentEmptyState');

  if (!list) return;

  if (emptyState) emptyState.style.display = 'none';
  list.innerHTML =
    '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading heavy equipment register...</div>';

  if (!url) {
    list.innerHTML =
      '<p class="text-muted">No heavy equipment sheet configured. Set HEAVY_EQUIPMENT_SHEET_CSV_URL in js/data.js.</p>';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('Empty sheet');

    const headers = rows[0];
    const body = rows
      .slice(1)
      .filter(r => r.some(c => c && c.trim() !== ''));

    const idxAsset = findColumnIndex(headers, [
      'Module / Asset No.',
      'Module / Asset No',
      'Asset No',
      'Asset #'
    ]);
    const idxType = findColumnIndex(headers, ['Equipment Type', 'Type']);
    const idxOwner = findColumnIndex(headers, [
      'Owner / Company',
      'Owner',
      'Company'
    ]);
    const idxArea = findColumnIndex(headers, [
      'Area / Yard / Location',
      'Area / Yard',
      'Area / Location',
      'Area',
      'Location'
    ]);
    const idxInternal = findColumnIndex(headers, [
      'Internal Inspection Expiry',
      'Internal Expiry',
      'Internal Inspection'
    ]);
    const idxThirdParty = findColumnIndex(headers, [
      'Third Party Inspection Expiry',
      'Third Party Expiry',
      '3rd Party Inspection Expiry'
    ]);
    const idxStatus = findColumnIndex(headers, ['Status']);
    const idxLastMaint = findColumnIndex(headers, [
      'Last Maintenance Date',
      'Last Maintenance'
    ]);
    const idxCertLink = findColumnIndex(headers, [
      'Certificate Link',
      'Certificate',
      'Certificate URL'
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = body.map((row, index) => {
      const assetNo = idxAsset !== -1 ? (row[idxAsset] || '') : '';
      const type = idxType !== -1 ? (row[idxType] || '') : '';
      const owner = idxOwner !== -1 ? (row[idxOwner] || '') : '';
      const area = idxArea !== -1 ? (row[idxArea] || '') : '';

      const internalRaw = idxInternal !== -1 ? (row[idxInternal] || '') : '';
      const internalDate = parseSheetDate(internalRaw);

      const thirdPartyRaw =
        idxThirdParty !== -1 ? (row[idxThirdParty] || '') : '';
      const thirdPartyDate = parseSheetDate(thirdPartyRaw);

      const status = idxStatus !== -1 ? (row[idxStatus] || '') : '';
      const lastMaintRaw =
        idxLastMaint !== -1 ? (row[idxLastMaint] || '') : '';
      const lastMaintDate = parseSheetDate(lastMaintRaw);

      const rawCert = idxCertLink !== -1 ? (row[idxCertLink] || '') : '';
      const certLink =
        rawCert && /^https?:\/\//i.test(rawCert) ? rawCert : '';

      // Third party inspection status (TPI)
      let tpiStatus = 'missing';
      if (thirdPartyDate) {
        if (thirdPartyDate < today) {
          tpiStatus = 'expired';
        } else {
          const diffDays =
            (thirdPartyDate - today) / (1000 * 60 * 60 * 24);
          tpiStatus = diffDays <= 30 ? 'dueSoon' : 'valid';
        }
      }

      // Internal inspection status (INI)
      let iniStatus = 'missing';
      if (internalDate) {
        if (internalDate < today) {
          iniStatus = 'expired';
        } else {
          const diffDaysIni =
            (internalDate - today) / (1000 * 60 * 60 * 24);
          iniStatus = diffDaysIni <= 30 ? 'dueSoon' : 'valid';
        }
      }

      // Overall certificate status (used for summaries)
      let certificateStatus = 'unknown';
      if (thirdPartyDate) {
        if (thirdPartyDate < today) {
          certificateStatus = 'overdue';
        } else {
          const diffDays =
            (thirdPartyDate - today) / (1000 * 60 * 60 * 24);
          certificateStatus = diffDays <= 30 ? 'dueSoon' : 'valid';
        }
      } else {
        certificateStatus = 'missing';
      }

      return {
        _index: index,
        assetNo,
        type,
        owner,
        area,
        internalRaw,
        internalDate,
        thirdPartyRaw,
        thirdPartyDate,
        status,
        lastMaintRaw,
        lastMaintDate,
        certLink,
        certificateStatus,
        tpiStatus,
        iniStatus
      };
    });

    state.heavyEquipment = items;
    state.heavyEquipmentLoaded = true;

    updateHeavyEquipmentSummary(items);
    populateHeavyEquipmentAreaFilter(items);
    renderHeavyEquipmentList();
  } catch (err) {
    console.error('Error loading heavy equipment sheet:', err);
    if (list) {
      list.innerHTML =
        '<p class="text-muted">Could not load heavy equipment register. Check the sheet link and try again.</p>';
    }
    if (emptyState) emptyState.style.display = 'block';
  }
}

function updateHeavyEquipmentSummary(list) {
  const items = Array.isArray(list) ? list : (state.heavyEquipment || []);
  const total = items.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const valid = items.filter(
    i => i.thirdPartyDate && i.thirdPartyDate >= today
  ).length;

  const overdueOrMissing = items.filter(
    i => !i.thirdPartyDate || i.thirdPartyDate < today
  ).length;

  const totalEl = $('#heqCountTotal');
  const validEl = $('#heqCountValid');
  const overdueEl = $('#heqCountOverdue');

  if (totalEl) totalEl.textContent = String(total || 0);
  if (validEl) validEl.textContent = String(valid || 0);
  if (overdueEl) overdueEl.textContent = String(overdueOrMissing || 0);
}

function populateHeavyEquipmentAreaFilter(list) {
  const select = $('#heqAreaFilter');
  if (!select || !Array.isArray(list)) return;

  const current = select.value || '';

  const areas = Array.from(
    new Set(
      list
        .map(e => (e.area || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  let optionsHtml = '<option value="">All Yards / Areas</option>';
  optionsHtml += areas
    .map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`)
    .join('');

  select.innerHTML = optionsHtml;

  if (current && areas.includes(current)) {
    select.value = current;
  }
}

function renderHeavyEquipmentList() {
  const list = $('#heavyEquipmentList');
  const emptyState = $('#heavyEquipmentEmptyState');

  if (!list) return;

  const items = state.heavyEquipment || [];

  if (!items.length) {
    list.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    updateHeavyEquipmentSummary([]);
    return;
  }

  let filtered = items.slice();

  if (heavyEquipmentFilterState.area) {
    const a = heavyEquipmentFilterState.area.toLowerCase();
    filtered = filtered.filter(
      e => (e.area || '').toLowerCase() === a
    );
  }

  if (heavyEquipmentFilterState.status) {
    const s = heavyEquipmentFilterState.status.toLowerCase();
    filtered = filtered.filter(
      e => (e.status || '').toLowerCase().includes(s)
    );
  }

  if (heavyEquipmentFilterState.search) {
    const q = heavyEquipmentFilterState.search.toLowerCase();
    filtered = filtered.filter(e => {
      const hay = [
        e.assetNo,
        e.type,
        e.owner,
        e.area
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  if (!filtered.length) {
    list.innerHTML =
      '<p class="text-muted">No equipment matches the current filters.</p>';
    if (emptyState) emptyState.style.display = 'block';
    updateHeavyEquipmentSummary([]);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  filtered.sort((a, b) => {
    const areaA = (a.area || '').toLowerCase();
    const areaB = (b.area || '').toLowerCase();
    if (areaA < areaB) return -1;
    if (areaA > areaB) return 1;
    const assetA = (a.assetNo || '').toLowerCase();
    const assetB = (b.assetNo || '').toLowerCase();
    if (assetA < assetB) return -1;
    if (assetA > assetB) return 1;
    return 0;
  });

  list.innerHTML = filtered
    .map(item => {
      const internal = item.internalRaw || '—';
      const thirdParty = item.thirdPartyRaw || '—';
      const lastMaint = item.lastMaintRaw || '—';

      const imgSrc = getEquipmentImage(item.type);
      const imgHtml = imgSrc
        ? `<img src="${imgSrc}" alt="${escapeHtml(item.type || 'Equipment')}"
               class="heavy-equipment-thumb" loading="lazy">`
        : '';

      // Badge labels and classes for TPI
      let tpiLabel = 'TPI – No record';
      let tpiClass = 'heq-badge heq-badge-missing';
      if (item.tpiStatus === 'valid') {
        tpiLabel = 'Valid TPI';
        tpiClass = 'heq-badge heq-badge-valid';
      } else if (item.tpiStatus === 'dueSoon') {
        tpiLabel = 'TPI – Due soon';
        tpiClass = 'heq-badge heq-badge-due';
      } else if (item.tpiStatus === 'expired') {
        tpiLabel = 'TPI – Expired';
        tpiClass = 'heq-badge heq-badge-expired';
      }

      // Badge labels and classes for INI
      let iniLabel = 'INI – No record';
      let iniClass = 'heq-badge heq-badge-missing';
      if (item.iniStatus === 'valid') {
        iniLabel = 'Valid INI';
        iniClass = 'heq-badge heq-badge-valid';
      } else if (item.iniStatus === 'dueSoon') {
        iniLabel = 'INI – Due soon';
        iniClass = 'heq-badge heq-badge-due';
      } else if (item.iniStatus === 'expired') {
        iniLabel = 'INI – Expired';
        iniClass = 'heq-badge heq-badge-expired';
      }

      return `
        <article class="obs-card heavy-equipment-card" data-heavy-index="${item._index}">
          <header class="obs-card-header">
            <div class="obs-card-title-row">
              ${imgHtml}
              <h3 class="obs-type">${escapeHtml(item.assetNo || 'Unknown asset')}</h3>
            </div>
            <div class="obs-chip-row">
              <span class="${tpiClass}">${escapeHtml(tpiLabel)}</span>
              <span class="${iniClass}">${escapeHtml(iniLabel)}</span>
              ${item.area ? `<span class="obs-chip">${escapeHtml(item.area)}</span>` : ''}
            </div>
          </header>
          <div class="obs-card-body">
            <p class="obs-description">
              ${item.type ? `Type: ${escapeHtml(item.type)}<br>` : ''}
              ${item.owner ? `Owner: ${escapeHtml(item.owner)}<br>` : ''}
              Last maintenance: ${escapeHtml(lastMaint)}
            </p>
          </div>
          <footer class="obs-card-footer">
            ${
              item.certLink
                ? `<a href="${escapeHtml(item.certLink)}" target="_blank" rel="noopener">Open certificate</a>`
                : '<span class="text-muted">No certificate link</span>'
            }
          </footer>
        </article>
      `;
    })
    .join('');

  list.querySelectorAll('.heavy-equipment-card').forEach(card => {
    card.addEventListener('click', () => {
      const idxStr = card.getAttribute('data-heavy-index');
      const idx = parseInt(idxStr, 10);
      const item = state.heavyEquipment[idx];
      if (item) showHeavyEquipmentDetail(item);
    });
  });

  updateHeavyEquipmentSummary(filtered);
}

function setupHeavyEquipmentFilters() {
  const areaSelect = $('#heqAreaFilter');
  const statusSelect = $('#heqStatusFilter');
  const searchInput = $('#heqSearch');
  const openSheetBtn = $('#heavyOpenSheetButton');

  if (areaSelect) {
    areaSelect.addEventListener('change', () => {
      heavyEquipmentFilterState.area = areaSelect.value || '';
      renderHeavyEquipmentList();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', () => {
      heavyEquipmentFilterState.status = statusSelect.value || '';
      renderHeavyEquipmentList();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      heavyEquipmentFilterState.search = searchInput.value || '';
      renderHeavyEquipmentList();
    });
  }

  if (openSheetBtn) {
    openSheetBtn.addEventListener('click', () => {
      const url =
        window.HEAVY_EQUIPMENT_FULL_SHEET_URL ||
        window.HEAVY_EQUIPMENT_SHEET_CSV_URL ||
        'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_OgUxJ8EheAsb_TxMcacQZf8DeUjKI_caEXZrWScZhOBzqRqjcUi8Tf5qduX4OEXXaVxbTOLRGIXF/pub?output=csv';
      if (url) window.open(url, '_blank');
    });
  }
}

function showHeavyEquipmentDetail(item) {
  const modal = $('#heavyEquipmentDetailModal');
  const body = $('#heavyEquipmentDetailBody');
  if (!modal || !body) return;

  const internal = item.internalRaw || '—';
  const thirdParty = item.thirdPartyRaw || '—';
  const lastMaint = item.lastMaintRaw || '—';

  const certStatusLabel =
    item.certificateStatus === 'valid'
      ? 'Valid certificate'
      : item.certificateStatus === 'dueSoon'
      ? 'Expiring soon'
      : item.certificateStatus === 'overdue'
      ? 'Overdue / expired'
      : item.certificateStatus === 'missing'
      ? 'No certificate'
      : 'Certificate status';

  const certLinkHtml = item.certLink
    ? `<a href="${escapeHtml(item.certLink)}" target="_blank" rel="noopener">Open certificate</a>`
    : '<span class="text-muted">No certificate link</span>';

  const imgSrc = getEquipmentImage(item.type);
  const imageBlock = imgSrc
    ? `
      <div class="heavy-equipment-detail-image">
        <img src="${imgSrc}" alt="${escapeHtml(item.type || 'Equipment')}" loading="lazy">
      </div>
    `
    : '';

  body.innerHTML = `
    <section class="obs-detail-section">
      ${imageBlock}
      <div class="obs-detail-section-title">Equipment</div>
      <div class="obs-detail-grid">
        <div><strong>Module / Asset No.</strong><br>${escapeHtml(item.assetNo || 'Unknown asset')}</div>
        <div><strong>Equipment Type</strong><br>${escapeHtml(item.type || '')}</div>
        <div><strong>Owner / Company</strong><br>${escapeHtml(item.owner || '')}</div>
        <div><strong>Area / Yard / Location</strong><br>${escapeHtml(item.area || '')}</div>
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Inspections &amp; Maintenance</div>
      <div class="obs-detail-grid">
        <div><strong>Internal inspection expiry</strong><br>${escapeHtml(internal)}</div>
        <div><strong>Third party inspection expiry</strong><br>${escapeHtml(thirdParty)}</div>
        <div><strong>Last maintenance date</strong><br>${escapeHtml(lastMaint)}</div>
        <div><strong>Status</strong><br>${escapeHtml(item.status || '')}</div>
      </div>
    </section>

    <section class="obs-detail-section">
      <div class="obs-detail-section-title">Certificates</div>
      <p class="obs-detail-description-box">
        ${certStatusLabel}<br>
        ${certLinkHtml}
      </p>
    </section>
  `;

  modal.classList.add('show');
}

function hideHeavyEquipmentDetailModal() {
  const modal = $('#heavyEquipmentDetailModal');
  if (modal) modal.classList.remove('show');
}

window.hideHeavyEquipmentDetailModal = hideHeavyEquipmentDetailModal;


// -------------------- Toolbox Talks --------------------

const toolboxFilterState = {
  range: 'today',
  area: '',
  search: ''
};


function updateToolboxSummary(filteredList) {
  const talks = Array.isArray(filteredList) ? filteredList : (state.toolboxTalks || []);

  const totalTalks = talks.length;
  const areas = Array.from(new Set(
    talks.map(t => (t.area || '').trim()).filter(Boolean)
  ));
  const totalAttendance = talks.reduce((sum, t) => sum + (t.attendance || 0), 0);

  const totalEl = $('#tbtCountTotal');
  const areasEl = $('#tbtCountAreas');
  const attendanceEl = $('#tbtCountAttendance');

  if (totalEl) totalEl.textContent = String(totalTalks || 0);
  if (areasEl) areasEl.textContent = String(areas.length || 0);
  if (attendanceEl) attendanceEl.textContent = String(totalAttendance || 0);
}

async function loadToolboxTalks() {
  const url = window.TBT_SHEET_CSV_URL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5EYzYhv5Br98EGb_rMGGOKvtb3lRX-5R0s-DBcTdwFgEPtWwV2YTBKxpuZl0yqvf2vnyQilL5SvuL/pub?output=csv';

  const list = $('#tbtList');
  const emptyState = $('#tbtEmptyState');
  const totalEl = $('#tbtCountTotal');
  const areasEl = $('#tbtCountAreas');
  const attendanceEl = $('#tbtCountAttendance');

  if (!list) return;

  if (emptyState) emptyState.style.display = 'none';
  list.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading toolbox talks...</div>';

  if (!url) {
    list.innerHTML = '<p class="text-muted">No toolbox talk sheet configured. Set TBT_SHEET_CSV_URL in js/data.js.</p>';
    if (emptyState) {
      emptyState.style.display = 'block';
      const p = emptyState.querySelector('p');
      if (p) p.textContent = 'No toolbox talk sheet configured. Set TBT_SHEET_CSV_URL in js/data.js.';
    }
    return;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    if (!rows.length) throw new Error('Empty sheet');

    const headers = rows[0];
    const body = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ''));

    const idxDate = findColumnIndex(headers, ['Date']);
    const idxArea = findColumnIndex(headers, ['Area / Location', 'Area', 'Location']);
    const idxTopic = findColumnIndex(headers, ['Topic', 'Subject']);
    const idxAttendance = findColumnIndex(headers, ['No. of Attendance', 'Attendance', 'No. Attendance']);
    const idxEvidence = findColumnIndex(headers, ['Evidence photo', 'Evidence', 'Photo']);

    const talks = body.map((row, index) => {
      const dateRaw = idxDate !== -1 ? (row[idxDate] || '') : '';
      const date = parseSheetDate(dateRaw);
      const area = idxArea !== -1 ? (row[idxArea] || '') : '';
      const topic = idxTopic !== -1 ? (row[idxTopic] || '') : '';
      const attendanceRaw = idxAttendance !== -1 ? (row[idxAttendance] || '') : '';
      const attendance = attendanceRaw ? Number(attendanceRaw) || 0 : 0;
      const evidence = idxEvidence !== -1 ? (row[idxEvidence] || '') : '';

      return {
        _index: index,
        dateRaw,
        date,
        area,
        topic,
        attendance,
        evidence
      };
    });

    state.toolboxTalks = talks;

    buildToolboxFilterOptions();
    renderToolboxList();
    updateToolboxSummary(state.toolboxTalks);
  } catch (err) {
    console.error('Toolbox load error:', err);
    list.innerHTML = '<p class="text-muted">Failed to load toolbox talks.</p>';
    if (emptyState) emptyState.style.display = 'block';
  }
}

function buildToolboxFilterOptions() {
  const talks = state.toolboxTalks || [];
  const areaSelect = $('#tbtAreaFilter');

  if (!areaSelect) return;

  const areas = Array.from(
    new Set(talks.map(t => (t.area || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  areaSelect.innerHTML = '<option value="">All Areas</option>' + areas
    .map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`)
    .join('');
}

function renderToolboxList() {
  const list = $('#tbtList');
  const emptyState = $('#tbtEmptyState');
  const filterChips = $all('.tbt-filter-chip');
  const areaSelect = $('#tbtAreaFilter');
  const searchInput = $('#tbtSearch');

  if (!list) return;

  const talks = state.toolboxTalks || [];
  if (!talks.length) {
    list.innerHTML = '<p class="text-muted">No toolbox talks loaded yet.</p>';
    if (emptyState) emptyState.style.display = 'block';
    updateToolboxSummary([]);
    return;
  }

  let filtered = talks.slice();

  const now = new Date();
  const range = toolboxFilterState.range || 'today';

  filtered = filtered.filter(t => {
    if (!t.date) return false;

    const sameDay = t.date.getFullYear() === now.getFullYear() &&
      t.date.getMonth() === now.getMonth() &&
      t.date.getDate() === now.getDate();

    const diffDays = (now - t.date) / (1000 * 60 * 60 * 24);

    if (range === 'today') return sameDay;
    if (range === 'week') return diffDays <= 7;
    if (range === 'month') return diffDays <= 31;
    return true; // all
  });

  if (toolboxFilterState.area) {
    const needle = toolboxFilterState.area.toLowerCase();
    filtered = filtered.filter(t => (t.area || '').toLowerCase() === needle);
  }

  if (toolboxFilterState.search) {
    const s = toolboxFilterState.search.toLowerCase();
    filtered = filtered.filter(t => {
      return (t.area || '').toLowerCase().includes(s) ||
             (t.topic || '').toLowerCase().includes(s);
    });
  }

  if (!filtered.length) {
    list.innerHTML = '<p class="text-muted">No toolbox talks match the current filters.</p>';
    if (emptyState) emptyState.style.display = 'block';
    updateToolboxSummary([]);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  updateToolboxSummary(filtered);

  list.innerHTML = filtered.map(t => {
    const dateText = t.date
      ? t.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : (t.dateRaw || '');

    const attendanceText = t.attendance ? `Attendance: ${t.attendance}` : '';
    const evidenceIcon = t.evidence
      ? '<span class="obs-evidence-chip" title="Evidence attached"><i class="fas fa-image"></i></span>'
      : '';

    return `
      <article class="obs-card tbt-card" data-tbt-index="${t._index}">
        <header class="obs-card-header">
          <div class="obs-card-date">${escapeHtml(dateText)}</div>
          <div class="obs-card-badges">
            ${evidenceIcon}
            ${t.area ? `<span class="obs-chip">${escapeHtml(t.area)}</span>` : ''}
          </div>
        </header>
        <div class="obs-card-body">
          <h3 class="obs-card-title">${escapeHtml(t.topic || 'No topic')}</h3>
          ${attendanceText ? `<p class="obs-description">${escapeHtml(attendanceText)}</p>` : ''}
        </div>
      </article>
    `;
  }).join('');

  // Wire click to open toolbox talk detail
  list.querySelectorAll('.tbt-card').forEach(card => {
    card.addEventListener('click', () => {
      const idxStr = card.getAttribute('data-tbt-index');
      const idx = parseInt(idxStr, 10);
      if (Number.isNaN(idx)) return;
      const talksArr = state.toolboxTalks || [];
      const talk = talksArr[idx];
      if (talk) {
        showToolboxDetail(talk);
      }
    });
  });

  // Keep UI state in sync
  if (filterChips && filterChips.length) {
    filterChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.range === toolboxFilterState.range);
    });
  }

  if (areaSelect && areaSelect.value !== toolboxFilterState.area) {
    areaSelect.value = toolboxFilterState.area;
  }

  if (searchInput && searchInput.value !== toolboxFilterState.search) {
    searchInput.value = toolboxFilterState.search;
  }

  // Wire events once
  if (!renderToolboxList._wired) {
    if (filterChips && filterChips.length) {
      filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
          toolboxFilterState.range = chip.dataset.range || 'today';
          renderToolboxList();
        });
      });
    }

    if (areaSelect) {
      areaSelect.addEventListener('change', () => {
        toolboxFilterState.area = areaSelect.value || '';
        renderToolboxList();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        toolboxFilterState.search = searchInput.value || '';
        renderToolboxList();
      });
    }

    const openSheetBtn = $('#tbtOpenSheetButton');
    if (openSheetBtn) {
      openSheetBtn.addEventListener('click', () => {
        const url = window.TBT_FULL_SHEET_URL ||
          window.TBT_SHEET_CSV_URL ||
          'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ5EYzYhv5Br98EGb_rMGGOKvtb3lRX-5R0s-DBcTdwFgEPtWwV2YTBKxpuZl0yqvf2vnyQilL5SvuL/pub?output=csv';
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    }

    renderToolboxList._wired = true;
  }
}
// -------------------- Tasks iframe (lazy load) --------------------

 let tasksIframeInitialized = false;

function initTasksIframe() {
  if (tasksIframeInitialized) return;
  const iframe = $('#tasksIframe');
  if (!iframe) return;

  // First choice: use the configured Google Form URL
  if (window.TASKS_FORM_EMBED_URL) {
    iframe.src = window.TASKS_FORM_EMBED_URL;
  }
  // Fallback: if you ever set data-src in HTML
  else if (iframe.dataset && iframe.dataset.src) {
    iframe.src = iframe.dataset.src;
  }

  tasksIframeInitialized = true;
}

  // -------------------- Floating Add Observation button --------------------

  function setupAddObservationButton() {
    const btn = $('#addObservationButton');
    if (!btn) return;
    // URL comes from js/data.js (ADD_OBSERVATION_FORM_URL), but we also
    // left a fallback href in HTML. Here we just ensure it matches.
    if (window.ADD_OBSERVATION_FORM_URL) {
      btn.href = window.ADD_OBSERVATION_FORM_URL;
    }
  }


  function setupDailyTasksButton() {
    const btn = $('#dailyTasksButton');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const iframe = document.getElementById('tasksIframe');
      const directUrl =
        (window.TASKS_FORM_URL && String(window.TASKS_FORM_URL).trim()) ||
        (window.TASKS_FORM_EMBED_URL && String(window.TASKS_FORM_EMBED_URL).trim()) ||
        (iframe && iframe.dataset && iframe.dataset.src ? iframe.dataset.src : '');

      if (directUrl) {
        // Open the daily tasks form in a new tab, same behavior as Add New Observation
        window.open(directUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Fallback: open the Tasks tab inside the app
        openTab(null, 'TasksTab');
      }
    });
  }

  // -------------------- Init app --------------------

  
  function setupRiskMatrix() {
    const likeSel = $('#riskLikelihood');
    const sevSel = $('#riskSeverity');
    const scoreEl = $('#riskScoreValue');
    const levelEl = $('#riskLevelLabel');
    const codeEl = $('#riskCodeValue');
    const guidanceEl = $('#riskGuidanceText');

    if (!likeSel || !sevSel) return;

    const recompute = () => {
      const likeVal = likeSel.value || '';
      const sevVal = sevSel.value || '';
      const result = computeRiskMatrix(likeVal, sevVal);

      if (scoreEl) {
        scoreEl.textContent = result.score != null ? String(result.score) : '--';
      }

      if (levelEl) {
        const levelText = result.level || '--';
        levelEl.textContent = levelText;

        // reset level classes
        levelEl.classList.remove('risk-level-low', 'risk-level-medium', 'risk-level-high', 'risk-level-critical');

        const normalized = (levelText || '').toLowerCase();
        if (normalized === 'low') levelEl.classList.add('risk-level-low');
        if (normalized === 'medium') levelEl.classList.add('risk-level-medium');
        if (normalized === 'high') levelEl.classList.add('risk-level-high');
        if (normalized === 'critical') levelEl.classList.add('risk-level-critical');
      }

      if (codeEl) {
        codeEl.textContent = result.code || '--';
      }

      if (guidanceEl) {
        guidanceEl.textContent = result.guidance || 'Select likelihood and severity to see guidance.';
      }
    };

    likeSel.addEventListener('change', recompute);
    sevSel.addEventListener('change', recompute);
  }




  // -------------------- PDF Export (Observations & Permits) --------------------

  async function exportObservationsToPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF export library not loaded.');
      return;
    }

    const observations = state.observations || [];
    if (!state.observationsLoaded || !observations.length) {
      alert('No observations data loaded yet. Open the Observations tab first.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let logoImg = null;
    try {
      logoImg = await loadImageAsBase64('img/CAT.jpeg');
    } catch (e) {
      console.warn('Could not load logo image for PDF.', e);
    }

    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 20, 20);
    }

    doc.setFontSize(18);
    doc.setTextColor(0, 131, 143);
    doc.text('Safety Observations Report', logoImg ? 40 : 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text('Generated: ' + new Date().toLocaleString(), logoImg ? 40 : 14, 28);

    const tableData = observations.slice(0, 200).map(obs => [
      obs.code || '-',
      obs.date ? new Date(obs.date).toLocaleDateString() : (obs.dateRaw || '-'),
      obs.area || '-',
      (obs.description || '').length > 80
        ? (obs.description || '').substring(0, 77) + '...'
        : (obs.description || '') || '-',
      obs.raLevel || obs.raRate || '-',
      obs.status || '-'
    ]);

    if (!tableData.length) {
      alert('No observations rows available to export.');
      return;
    }

    doc.autoTable({
      startY: 40,
      head: [['Code', 'Date', 'Area', 'Description', 'Risk', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 131, 143] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 28 },
        3: { cellWidth: 70 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('Page ' + i + ' of ' + pageCount, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    const fileName = 'observations-' + new Date().toISOString().split('T')[0] + '.pdf';
    doc.save(fileName);
  }

  async function exportPermitsToPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF export library not loaded.');
      return;
    }

    const permits = state.permits || [];
    if (!state.permitsLoaded || !permits.length) {
      alert('No permits data loaded yet. Open the Permits tab first.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let logoImg = null;
    try {
      logoImg = await loadImageAsBase64('img/CAT.jpeg');
    } catch (e) {
      console.warn('Could not load logo image for PDF.', e);
    }

    if (logoImg) {
      doc.addImage(logoImg, 'JPEG', 14, 10, 20, 20);
    }

    doc.setFontSize(18);
    doc.setTextColor(0, 131, 143);
    doc.text('Work Permits Report', logoImg ? 40 : 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text('Generated: ' + new Date().toLocaleString(), logoImg ? 40 : 14, 28);

    const tableData = permits.slice(0, 200).map(p => [
      p.permitNo || '-',
      p.date ? new Date(p.date).toLocaleDateString() : (p.dateRaw || '-'),
      p.area || '-',
      p.type || '-',
      p.receiver || '-',
      p.project || '-',
      (p.description || '').length > 60
        ? (p.description || '').substring(0, 57) + '...'
        : (p.description || '') || '-'
    ]);

    if (!tableData.length) {
      alert('No permits rows available to export.');
      return;
    }

    doc.autoTable({
      startY: 40,
      head: [['Permit #', 'Date', 'Area', 'Type', 'Receiver', 'Project', 'Description']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [0, 131, 143] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 },
        6: { cellWidth: 50 }
      }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text('Page ' + i + ' of ' + pageCount, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    const fileName = 'work-permits-' + new Date().toISOString().split('T')[0] + '.pdf';
    doc.save(fileName);
  }

  function setupPdfExportButtons() {
    const obsBtn = document.getElementById('obsExportPdfButton');
    if (obsBtn) {
      obsBtn.addEventListener('click', function () {
        exportObservationsToPDF().catch(err => {
          console.error('Error exporting observations PDF:', err);
          alert('Failed to export observations PDF.');
        });
      });
    }

    const permitsBtn = document.getElementById('permitsExportPdfButton');
    if (permitsBtn) {
      permitsBtn.addEventListener('click', function () {
        exportPermitsToPDF().catch(err => {
          console.error('Error exporting permits PDF:', err);
          alert('Failed to export permits PDF.');
        });
      });
    }
  }


function initApp() {
  setupDarkMode();
  setupNav();
  setupAccordions();
  setupModals();
  setupAddObservationButton();
  setupDailyTasksButton();
  setupPdfExportButtons();
  setupTbtOfDay();
  setupTbtLibrary();
  setupJsaLibrary();
  setupCsmLibrary();
  setupWalkthroughLibrary();
  setupLibrarySwitcher();
  setupTools();
  setupTrainingMatrixTool();
  setupRiskMatrix();
  setupNewsPanel();
  loadEomAndLeaderboard();
  loadObservations();
  loadPermits();
  loadToolboxTalks();
  loadNews();

  // If we already have summaries from tools, reflect in Home
  const homeHeat = $('#homeHeatSummary');
  const homeWind = $('#homeWindSummary');
  if (homeHeat && state.lastHeatSummary) homeHeat.textContent = state.lastHeatSummary;
  if (homeWind && state.lastWindSummary) homeWind.textContent = state.lastWindSummary;
}


  document.addEventListener('DOMContentLoaded', initApp);
})();
// =========================================
// Central configuration & data for the safety app
// All URLs & safety libraries live here so app.js
// can focus on logic + UI.
// =========================================

// ========== GOOGLE FORMS (EMBEDS & LINKS) ==========

// Daily tasks / checklist form (embedded in Tasks tab)
window.TASKS_FORM_EMBED_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSezm0wWTdEsvkIdnzhfpRf0G37tZzqbY-AF-BHfbXXiLr2rKA/viewform?embedded=true';

// Add new observation form (used by floating green button)
window.ADD_OBSERVATION_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfYED_4UfHcmWn0fQOjtR5s8A0-Bhr4dwpe-80GjKkLeTR_Lw/viewform?usp=header';

// ========== GOOGLE SHEETS (CSV & VIEW LINKS) ==========

// Employee of the Month + Leaderboard sheet (CSV)
window.EOM_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ0Km9p6XYDDxyGYSFfUjDjhdKMtr_hFvCiJ-U5_24_-QKrGsexZ4v3dxzKp0K1XZenNsiV7CiNmQEt/pub?output=csv';

// Observations main data sheet (CSV)
window.OBSERVATIONS_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXlN-sE-IkQJLMaVOvRGSBYNLsDvwZTD15w7rarTIXBGoacF0C5_eiI7OmFs__zA8jtlwhy0ULLZ8N/pub?output=csv';

// Heavy Equipment register sheet (CSV)
window.HEAVY_EQUIPMENT_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vT_OgUxJ8EheAsb_TxMcacQZf8DeUjKI_caEXZrWScZhOBzqRqjcUi8Tf5qduX4OEXXaVxbTOLRGIXF/pub?output=csv';

// Optional full Heavy Equipment sheet URL (uses CSV link by default if not overridden)
window.HEAVY_EQUIPMENT_FULL_SHEET_URL =
  window.HEAVY_EQUIPMENT_FULL_SHEET_URL || window.HEAVY_EQUIPMENT_SHEET_CSV_URL;

// News / Announcements sheet (CSV)
window.NEWS_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1_SwxL5f4mWF5kd2yofCMCEE_WQp_2eroHDhXXPXtw1U/export?format=csv&gid=0';

// Full observations HTML sheet (opened when user taps
// "Open full data sheet" button in Observations tab)
window.OBSERVATIONS_FULL_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vTXlN-sE-IkQJLMaVOvRGSBYNLsDvwZTD15w7rarTIXBGoacF0C5_eiI7OmFs__zA8jtlwhy0ULLZ8N/pubhtml';

// Optional default color code of the month (used as
// fallback if EOM sheet has no value for this month)
window.DEFAULT_MONTH_COLOR_NAME = 'White';

// =========================================
// TBT LIBRARY
// =========================================
//
// Each item: { title: "TBT Title", link: "Google Drive link" }

window.tbtData = [
  { title: "Alcohol and Drugs", link: "https://drive.google.com/file/d/1uIGAjyY2UuxdkWToEGqMoF-L1Q9cIn5c/view?usp=drivesdk" },
  { title: "Biohazard infection materials", link: "https://drive.google.com/file/d/1wUY8mlaEXOroUK5IoPPbBpym97Jdjfm4/view?usp=drivesdk" },
  { title: "Cold Weather", link: "https://drive.google.com/file/d/1QOp3TVAb-si19p-taHpPjSwEfXs1O5us/view?usp=drivesdk" },
  { title: "Compressed Gas", link: "https://drive.google.com/file/d/1a7tLsOI7Re7QAWDivisUFdakbvpSEYOt/view?usp=drivesdk" },
  { title: "Confined Space", link: "https://drive.google.com/file/d/1HXssVREKX0mq0Orn-gU3oqaLfDgEY2j1/view?usp=drivesdk" },
  { title: "Construction Fires", link: "https://drive.google.com/file/d/1nXBiIuAEjs4om2NwASqfyhtT-8IUBpGt/view?usp=drivesdk" },
  { title: "Corrosive Materials", link: "https://drive.google.com/file/d/1VaFxPYhYt0Ho8blbkGQi2S4ubsT882ge/view?usp=drivesdk" },
  { title: "Dangerously reactive material", link: "https://drive.google.com/file/d/16CNFN5iuf3YFyVW-tYNVQgHkRu8z8deg/view?usp=drivesdk" },
  { title: "Dial before you Dig", link: "https://drive.google.com/file/d/1YlWyaHh2lPoum-OYYoJ2qP8t948qwZLI/view?usp=drivesdk" },
  { title: "Driving in Reverse", link: "https://drive.google.com/file/d/1QzLSWz3CFfjGdmj62OsFdvT5IcV_lrqJ/view?usp=drivesdk" },
  { title: " Emergency Response", link: "https://drive.google.com/file/d/1bWiXimPy6SmqbtEs5LxJE9zvS765GSzN/view?usp=drivesdk" },
  { title: " Equipment Guards", link: "https://drive.google.com/file/d/1i4o3HHM6O2EPJ1hf-2IQ97_AREDCMIDr/view?usp=drivesdk" },
  { title: " Exercise and Health", link: "https://drive.google.com/file/d/13pnUXqSmGNuXHAGKG7TyKhwryEWbtAaO/view?usp=drivesdk" },
  { title: " Eye Protection", link: "https://drive.google.com/file/d/13HufH-DcwH-P-pEZZKTUNzHSo2lzyzLa/view?usp=drivesdk" },
  { title: " Fall Protection", link: "https://drive.google.com/file/d/1I_MQHppz0KnwIgiTiLwpLUPyd0N-z1c_/view?usp=drivesdk" },
  { title: " Fatigue", link: "https://drive.google.com/file/d/1jidO7NprdqLowWkXEXKtWBPBq5iwI9yA/view?usp=drivesdk" },
  { title: " Flammable and Combustible Materials", link: "https://drive.google.com/file/d/1Gcbe3miY43cJYkW6a7sTO7mbC8m31ICL/view?usp=drivesdk" },
  { title: " Foot Protection", link: "https://drive.google.com/file/d/1aQJxutEcqL2H_mcnSBK9uuj2silzAyRl/view?usp=drivesdk" },
  { title: " Grinders Naloxia", link: "https://drive.google.com/file/d/1jJqncsuUSmrF2dPlqlLz28jRN73H-RBe/view?usp=drivesdk" },
  { title: " Hand Protection", link: "https://drive.google.com/file/d/1LOiKyFoMb3dsR_pYyJECJLxCMFpEhpFT/view?usp=drivesdk" },
  { title: " Hazardouse Waste", link: "https://drive.google.com/file/d/1pLR9ewUgc0Memjx3BLiOnSW-4MWf7IKe/view?usp=drivesdk" },
  { title: " Head Protection", link: "https://drive.google.com/file/d/1BlmB3NNKNldC0xMH-c_j-KqlmDva_loF/view?usp=drivesdk" },
  { title: " Hearing", link: "https://drive.google.com/file/d/191qRYe-ZVNfcSGHBtm6TLK4rVAOFtKTh/view?usp=drivesdk" },
  { title: " Hot Weather", link: "https://drive.google.com/file/d/1to9Fzdpv5bu3GQm98prLzFSjpuHAmuUh/view?usp=drivesdk" },
  { title: " Housekeeping", link: "https://drive.google.com/file/d/1iTMdIu08H0H-0S03mxMrlawHSWhjEf-c/view?usp=drivesdk" },
  { title: " Inspection of tools", link: "https://drive.google.com/file/d/1kNXJxumw42uQe1eGdBLZ-KlKEoI_ctF6/view?usp=drivesdk" },
  { title: "Ladder Safety", link: "https://drive.google.com/file/d/1KO_-SERnB-IE68KL-cmxxG6dVkFVERUq/view?usp=drivesdk" },
  { title: " Lock out", link: "https://drive.google.com/file/d/1AhXs6ej3cDXk5gAIQAt09ySwAtZV7dn8/view?usp=drivesdk" },
  { title: " Material Safety Data Sheet", link: "https://drive.google.com/file/d/1hpf53QlwxLDp0VZC6F5TBZ1NTZuId6Gp/view?usp=drivesdk" },
  { title: " Oxidizing Materials", link: "https://drive.google.com/file/d/10dBlB83VwTiGtbN5RteXckS7rbmUaekS/view?usp=drivesdk" },
  { title: " Personal Protectuve Equipment", link: "https://drive.google.com/file/d/1IfAiA0mVIrLEGIxip-YhrhFyLhGCC0Yk/view?usp=drivesdk" },
  { title: " Pinch Points and Blinds", link: "https://drive.google.com/file/d/1fFNrba9aIgQxXcbiaLnjb5FqHsKTGjPG/view?usp=drivesdk" },
  { title: " Poisonous and Infectious Materials", link: "https://drive.google.com/file/d/1g1hsd8OIgPt6njOeSNozajuAiVJNKMlX/view?usp=drivesdk" },
  { title: " Power Lines", link: "https://drive.google.com/file/d/1Sqlm3-z9cZ6RaOFqVPL-A4sZ1pnxDxLD/view?usp=drivesdk" },
  { title: " Power Saws", link: "https://drive.google.com/file/d/1WiTJbh7uaGCTwzUHo5EUMa6vYl-hzMBj/view?usp=drivesdk" },
  { title: " Proper Lifting and Back Care", link: "https://drive.google.com/file/d/10EutgMs_0XH_VJvF2_vIYcQRIlPQtN_4/view?usp=drivesdk" },
  { title: " Reporting Accedints", link: "https://drive.google.com/file/d/1AoADCkqOQxoWMIkQkNa2S71FzZzra4s6/view?usp=drivesdk" },
  { title: " Reporting Near Miss and incident ", link: "https://drive.google.com/file/d/1W5yhuJrbdaO27S2B-TnPbTVVKkCSnIFG/view?usp=drivesdk" },
  { title: " Respiratory Protective", link: "https://drive.google.com/file/d/1QX86Iu4RJj5bvdzWdJgtKAy8-LIRR8x7/view?usp=drivesdk" },
  { title: " Roofing", link: "https://drive.google.com/file/d/17INX1mFhwxHsxyM8A6Vbd98jywHDFN08/view?usp=drivesdk" },
  { title: " Scaffold Safety", link: "https://drive.google.com/file/d/1BPzGrFJMuA9eDl46zhh7iQqMYqqnMwLS/view?usp=drivesdk" },
  { title: " Signs", link: "https://drive.google.com/file/d/1RfT2WDhQnOW_8FTv2t80UfhXO14uEmxJ/view?usp=drivesdk" },
  { title: " Slips and Trips", link: "https://drive.google.com/file/d/11QSqSs0SWcXHjzNQMrjDtumrKtM5Wp0u/view?usp=drivesdk" },
  { title: " Stretching", link: "https://drive.google.com/file/d/1dD54piQQtbjhhw3u_4bCLSfjp9cd5Jtr/view?usp=drivesdk" },
  { title: " Traffic Control People", link: "https://drive.google.com/file/d/1aLbvfU2E4OpsYv4UkjTa4Y6QEupxDwPI/view?usp=drivesdk" },
  { title: " Transportion of Goods", link: "https://drive.google.com/file/d/1rbuTSg_MTsr_gwxGNWAyyPeBvZpNOGHL/view?usp=drivesdk" },
  { title: " Safe Trenching and Excavating", link: "https://drive.google.com/file/d/1CKOVtAR5iGz0PVQz51adhC6ZXjtEJgV_/view?usp=drivesdk" },
  { title: " Working Around Mobile Equipment", link: "https://drive.google.com/file/d/14SncgzRAVHd8-kJNGmZVroYuS42TshEr/view?usp=drivesdk" },
  { title: " Working With Hazardous Materials ", link: "https://drive.google.com/file/d/1gYF6cUISYjUZF_pLEKadmPbe49YM2_ph/view?usp=drivesdk" },
];

// =========================================
// JSA LIBRARY
// =========================================
//
// Each item: { title: "JSA Title", link: "Google Drive link" }

window.jsaData = [
  { title: "Abrasive Blasting And Coating", link: "https://drive.google.com/file/d/1tZBj37GGJ7h9uRYDI5TIL04OkNrEMoLu/view?usp=drivesdk" },
  { title: "Backfilling Levelling And Compaction", link: "https://drive.google.com/file/d/1I32miHCfXBzETNx5UePxwHY4f9Fi-Fd1/view?usp=drivesdk" },
  { title: "Backfilling Levelling And Compaction Around Concrete Guards", link: "https://drive.google.com/file/d/1Fiei1faeqkuNCxR_-FMOlBF66w1ELC-0/view?usp=drivesdk" },
  { title: "Bolt Tightening And Torquing Activity", link: "https://drive.google.com/file/d/1iEyD5UObnaZ0TppEgmsAI-I0ELKYzdik/view?usp=drivesdk" },
  { title: "Cable Laying in Electrical Manhole", link: "https://drive.google.com/file/d/1Wp8i107zfvQfBgmo3w87FicqkbJ-YlzX/view?usp=drivesdk" },
  { title: "Checking Lifting Cables", link: "https://drive.google.com/file/d/1HTuLhegqg63HDC0g4LYLHRZvvsvKlgMj/view?usp=drivesdk" },
  { title: "Civil Work for HDD Road Crossing and Survey Works", link: "https://drive.google.com/file/d/1ZCt-ymqSm538XKifw7IGveIgSBklV-FM/view?usp=drivesdk" },
  { title: "Coating and Painting", link: "https://drive.google.com/file/d/11Hvb1voK2OvES76nYruhbkI00OZIa2bO/view?usp=drivesdk" },
  { title: "Cold Cutting Activity", link: "https://drive.google.com/file/d/1w8dkyJ4_KdrXhMvBKffpSmWLvGYRD_PS/view?usp=drivesdk" },
  { title: "Conductor and MLDT Installation", link: "https://drive.google.com/file/d/1DrsTymUDKM_g_vQ3Cp80mW9iyM6G4Wmx/view?usp=drivesdk" },
  { title: "Concrete Cutting and Demolition", link: "https://drive.google.com/file/d/13rKL8nwFYmPC-gMMHhpgmW-Ht-gTgbFa/view?usp=drivesdk" },
  { title: "Concrete Pouring Work", link: "https://drive.google.com/file/d/1jBzQEzvUibCXixT_OBMKHXwS35KKYdlC/view?usp=drivesdk" },
  { title: "Conduit And Drain Pipe Installation", link: "https://drive.google.com/file/d/1DkYftrZ9soByBRmZtmkA6iFm8wvTu3CT/view?usp=drivesdk" },
  { title: "Culvert Installation Activities", link: "https://drive.google.com/file/d/1H1_apctHNyH1f_k18oaXZXVj78W0bdZs/view?usp=drivesdk" },
  { title: "Cutting and Bevelling Work", link: "https://drive.google.com/file/d/1SGg1kNsHSxEH0LJcitBFDDCRglfGbNnI/view?usp=drivesdk" },
  { title: "Driving Off Road", link: "https://drive.google.com/file/d/1F0_hFnmHPdAmEzAgCbgUTpzxSWjAtRoI/view?usp=drivesdk" },
  { title: "Duct Bank and Marker Installation", link: "https://drive.google.com/file/d/1n819UkZXVgKGB_-8xSz0T8tSCxd2G9pg/view?usp=drivesdk" },
  { title: "E & I Calibrations and Instrument Testing", link: "https://drive.google.com/file/d/1tZvf-B8gJbQUoKdsjkCYmZPJq8LXS_Oq/view?usp=drivesdk" },
  { title: "E & I Cable Laying and Termination Activities", link: "https://drive.google.com/file/d/1Q06KpF1_psWnnAQ_52MJjnrFQoxRn2Eq/view?usp=drivesdk" },
  { title: "E & I Installation Activities", link: "https://drive.google.com/file/d/1N7uxi_5adFadC0uYfC92k7m9lLkQRsI9/view?usp=drivesdk" },
  { title: "E & I Installation Inside Substation", link: "https://drive.google.com/file/d/1FObIYqXr49dSXvK7mUbR_HdrqKvBruGw/view?usp=drivesdk" },
  { title: "Electro Mechanical QA QC Activities", link: "https://drive.google.com/file/d/1hIJPnTAQ5FU6ku6iZ2er3SvB3IU-7qxB/view?usp=drivesdk" },
  { title: "Equipment Pre commissioning", link: "https://drive.google.com/file/d/1cX3uHpn4RUZHicjnabgxgcV5bgHqUqf0/view?usp=drivesdk" },
  { title: "Excavation And Trenching Activities", link: "https://drive.google.com/file/d/1G3ewcaKqsKsK7kIpRi7ErZ5UuFmSQQo2/view?usp=drivesdk" },
  { title: "Fabrication and Erection of Steel Structure", link: "https://drive.google.com/file/d/1euR77zoBmj1yfJXt2qgLUa4uIvmM75TU/view?usp=drivesdk" },
  { title: "Field Joint Coating Activities", link: "https://drive.google.com/file/d/1y31FL8RQehGLE977fqIrGIqJKdP5_MzA/view?usp=drivesdk" },
  { title: "Flare KO Drum Installation Activities", link: "https://drive.google.com/file/d/16d3e27BHovQUgatctfDpCjuTCmLxivlO/view?usp=drivesdk" },
  { title: "Hand Excavation", link: "https://drive.google.com/file/d/1x0Lao8Pgyz-nuBwajEhM--XKN-wAzVKZ/view?usp=drivesdk" },
  { title: "Hand Excavation and Excavation Around Existing Facilities", link: "https://drive.google.com/file/d/1w1YUqFPVW2n0kfrxGb9QrEXvB6dA2uoY/view?usp=drivesdk" },
  { title: "Handling and Loading of Heavy Equipment Onto Low Bed Trailer", link: "https://drive.google.com/file/d/1tHMeXuDF_arQ5mdUsCYFJ56tTn9fKe8N/view?usp=drivesdk" },
  { title: "Heavy Equipment Movement", link: "https://drive.google.com/file/d/1-yoZFdAYQ2MZ4caqon3qSr7nqi3HbdAj/view?usp=drivesdk" },
  { title: "Heavy Equipment Operation", link: "https://drive.google.com/file/d/1FgI8uQUibNo1sWZTuyLD-xAxulS7VXaM/view?usp=drivesdk" },
  { title: "Heavy Equipment Operation and Manoeuvring in Work Site", link: "https://drive.google.com/file/d/1NDCoBZy-ayELHILwPgGD_sSz69Wo_AUS/view?usp=drivesdk" },
  { title: "Heavy Equipment Pre Moblisation", link: "https://drive.google.com/file/d/1sHt503_Kd3iBdkO0YB-BVGK2Ks0WJ4mT/view?usp=drivesdk" },
  { title: "Heavy Equipment Pre Mobilisation", link: "https://drive.google.com/file/d/1pB-AyExXgstZKyz8_wkowB_kWAUfBDbi/view?usp=drivesdk" },
  { title: "Heavy Vehicle Driving", link: "https://drive.google.com/file/d/151Q44VXIvTXh1xyYIm94sHN6IIessdle/view?usp=drivesdk" },
  { title: "Heavy Vehicle Movement inside Refinery", link: "https://drive.google.com/file/d/1hzCw1qzOr23pOEfRPhyiRUzs1Jhl5pHV/view?usp=drivesdk" },
  { title: "Heavy Vehicle Operation", link: "https://drive.google.com/file/d/18ocXGqE6DeXfne-4wtZne56-gI4z2s8U/view?usp=drivesdk" },
  { title: "Holiday and Defect Repair Activities", link: "https://drive.google.com/file/d/1o-Q_n8EI7dWIPzQ0QD8LfSyVDamZSrwH/view?usp=drivesdk" },
  { title: "Hot Tapping Activities", link: "https://drive.google.com/file/d/1fw5O9cFYtJ39uyX-ggTNHYODHHeCsZ0z/view?usp=drivesdk" },
  { title: "Hot Work Inside Refinery", link: "https://drive.google.com/file/d/1WRi44gyMgYrPplrW7xKmtSd2mm5sr8S7/view?usp=drivesdk" },
  { title: "Hot Work with Cold Cutting Activities", link: "https://drive.google.com/file/d/1l3GUHqLDi3H_gwLyputynWJwMQ37g6qx/view?usp=drivesdk" },
  { title: "Housekeeping Activities", link: "https://drive.google.com/file/d/1C8YqNAkt6xGh7lqG51WivOGsyR3OullG/view?usp=drivesdk" },
  { title: "Hydrotesting of Pipe Line", link: "https://drive.google.com/file/d/1_aQ8-UiNhlv6rcMFf98KcEEGs5ARH2vV/view?usp=drivesdk" },
  { title: "Installation of Cable Tray and Ladder", link: "https://drive.google.com/file/d/1uKNobEawMyCUN-DuhktF7TqN7bW5nKbu/view?usp=drivesdk" },
  { title: "Installation of Control Valve,  PSV, MOV, Blind Blind Flange and Vent Valve", link: "https://drive.google.com/file/d/1hc_32uUlTOZYw93kB7GvTaylor/view?usp=drivesdk" },
  { title: "Installation of Electrical Panel and Switchgear", link: "https://drive.google.com/file/d/1qvrydnktRL-HpmJ8Gn0czpWMEitnRrH_/view?usp=drivesdk" },
  { title: "Installation of Fence and Gates", link: "https://drive.google.com/file/d/1aSUh2xIfxV29R0hIJrKbqG4U6ZlQKp0I/view?usp=drivesdk" },
  { title: "Installation of Fire Water Facility", link: "https://drive.google.com/file/d/1uKG2pcIP-BPcXc-EDjvFb5afpRLEaQgs/view?usp=drivesdk" },
  { title: "Installation of Flare Stack Foundation", link: "https://drive.google.com/file/d/1TXa6CQf5AFE_YrRFpv_b2G7nlILCYay4/view?usp=drivesdk" },
  { title: "Installation of Pipe Rack and Piping", link: "https://drive.google.com/file/d/1_rjTyict8TdTQMS0sRs5sH3CHfDIlbbA/view?usp=drivesdk" },
  { title: "Installation of Piping on Sleepers", link: "https://drive.google.com/file/d/1cJb0pd7FBeZm9uhRkfgKWcFa1QgGnPIW/view?usp=drivesdk" },
  { title: "Installation of Pneumatic and Hydraulic Tubing", link: "https://drive.google.com/file/d/1MPiCD2x8c2mNw-fWHM4AtbKJK-YuPQiz/view?usp=drivesdk" },
  { title: "Installation of Process Vessel and Drum", link: "https://drive.google.com/file/d/1d0C5PdgVld6V9UhxqNz70dKkTWNyNjc5/view?usp=drivesdk" },
  { title: "Installation of Pumps", link: "https://drive.google.com/file/d/1XrXF9QQWSWku0Srl2L_PVQINGNPL9Ldr/view?usp=drivesdk" },
  { title: "Installation of Rigid and Flexible Pavement", link: "https://drive.google.com/file/d/1OGKyNVgw0_DTFUWxyV7oQXtTaCNJ3d18/view?usp=drivesdk" },
  { title: "Installation of Steel Structure", link: "https://drive.google.com/file/d/13G0U5DsfgvCaVxPCDb6VK3jGKJzq2k3l/view?usp=drivesdk" },
  { title: "Installation of Structural Foundations", link: "https://drive.google.com/file/d/1tbN7i0_8SJ1gsCwO6v5LyOzJVXFZNR5a/view?usp=drivesdk" },
  { title: "Installation of Valve and Spectacle Blind", link: "https://drive.google.com/file/d/1pvcFZz3uL8RqIOvk4u7QYlX0dbcdRFSw/view?usp=drivesdk" },
  { title: "Loading and Unloading of Material", link: "https://drive.google.com/file/d/1X1y8uFvhlZz-oN3rZ4HeaZ3b5XHMiDC7/view?usp=drivesdk" },
  { title: "Manual Handling Activities", link: "https://drive.google.com/file/d/1YG5MBO06LH9xvKfGda6uH_jJkmB8J5tZ/view?usp=drivesdk" },
  { title: "Operation of Crane", link: "https://drive.google.com/file/d/1uRgWkF0IDSChVffa8593v5-hMxhCRplQ/view?usp=drivesdk" },
  { title: "Operation of MEWP", link: "https://drive.google.com/file/d/1G3wKCUw0bL4PWi7GC1C3_OYJ3KpJTLID/view?usp=drivesdk" },
  { title: "Operation of Side Boom", link: "https://drive.google.com/file/d/1k9XShTrx72jVh41RvB6O2EGHGCskkZt7/view?usp=drivesdk" },
  { title: "Pneumatic Hydrotesting of Pipe", link: "https://drive.google.com/file/d/1pzKiw_gXf7pBDMkpfJFhWIPs0TM2VYv7/view?usp=drivesdk" },
  { title: "Pre Commissioning Activities", link: "https://drive.google.com/file/d/1p43MDV3Udpz4kpThFue3rKOqLQ7cOv1u/view?usp=drivesdk" },
  { title: "Radiography Testing Activities", link: "https://drive.google.com/file/d/1dPUuxlB-UWw6bK5QN3DoZRi9Ku_3qgXK/view?usp=drivesdk" },
  { title: "Reinstatement and Backfilling Activities", link: "https://drive.google.com/file/d/1rVid9aLGgbSj_sOcnpOMhUtLHD0AxwCj/view?usp=drivesdk" },
  { title: "Road Crossing and Culvert Construction", link: "https://drive.google.com/file/d/1INH-uif3SCd3QylY2bp7sTl2HqE9Z_t1/view?usp=drivesdk" },
  { title: "Scaffolding Erection and Dismantling", link: "https://drive.google.com/file/d/1JYXU3ENYWZ9BF9HfCaTUTVuForzYiUXt/view?usp=drivesdk" },
  { title: "Structural Steel Erection", link: "https://drive.google.com/file/d/1Q0otf_fesdi-6rGpBlO3oOPD5mmt8xxx/view?usp=drivesdk" },
  { title: "Substation Civil Works", link: "https://drive.google.com/file/d/17zpuDsadYp6zW6J0KDkDU7LHGTkBm5A4/view?usp=drivesdk" },
  { title: "Tie-in and Hot Tap Activities", link: "https://drive.google.com/file/d/1__MYES5_npv2x6pv3ROJcymdZgkLquLm/view?usp=drivesdk" },
  { title: "Traffic Management and Flagman Duties", link: "https://drive.google.com/file/d/1bIPfM02kJri4zZlC2VUnMbYdfRrF_WA3/view?usp=drivesdk" },
  { title: "Vehicle Movement inside Plant", link: "https://drive.google.com/file/d/1Swpghi0IHWvvwkuqdowJmA1nta8l9p42/view?usp=drivesdk" },
  { title: "Welding and Fabrication Activities", link: "https://drive.google.com/file/d/1C6LFChQtQm2f4Sgkk4_fwluIF-oyr5u5/view?usp=drivesdk" }
];

document.addEventListener('click', (e) => {
  const t = e.target;
  if (!t || !t.closest) return;

  // Environment Status "Use my location" button
  const envBtn = t.closest('#envEnableGeo');
  if (envBtn) {
    e.preventDefault();
    askGeoAndLoadWeather();
    return;
  }
});
