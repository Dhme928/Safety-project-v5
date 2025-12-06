(function() {
  const API = '/api';
  let currentUser = null;
  let authToken = localStorage.getItem('authToken');
  let currentLang = localStorage.getItem('lang') || 'en';
  let T = {};

  const state = {
    obsRange: 'month',
    obsArea: '',
    obsStatus: '',
    obsSearch: '',
    permitsRange: 'today',
    permitsArea: '',
    permitsType: '',
    permitsSearch: '',
    eqArea: '',
    eqStatus: '',
    eqSearch: '',
    tbtRange: 'today',
    tbtSearch: ''
  };

  const $ = s => document.querySelector(s);
  const $all = s => Array.from(document.querySelectorAll(s));

  const MONTH_COLORS = {0:'Green',1:'Red',2:'Blue',3:'Yellow',4:'Green',5:'Red',6:'Blue',7:'Yellow',8:'Green',9:'Red',10:'Blue',11:'Yellow'};
  
  const TBT_DATA = [
    {title:"PPE - Personal Protective Equipment",link:"https://drive.google.com/file/d/1example"},
    {title:"Working at Height Safety",link:"https://drive.google.com/file/d/2example"},
    {title:"Confined Space Entry",link:"https://drive.google.com/file/d/3example"},
    {title:"Hot Work Safety",link:"https://drive.google.com/file/d/4example"},
    {title:"Lifting Operations",link:"https://drive.google.com/file/d/5example"}
  ];
  const JSA_DATA = [
    {title:"JSA - Welding Operations",link:"https://drive.google.com/file/d/jsa1"},
    {title:"JSA - Scaffolding Erection",link:"https://drive.google.com/file/d/jsa2"},
    {title:"JSA - Excavation Work",link:"https://drive.google.com/file/d/jsa3"}
  ];
  const CSM_DATA = [
    {title:"CSM - Contractor Safety Requirements",link:"https://drive.google.com/file/d/csm1"},
    {title:"CSM I-1 Emergency Reporting",link:"https://drive.google.com/file/d/csm2"},
    {title:"CSM I-3 Personal Protective Equipment",link:"https://drive.google.com/file/d/csm3"},
    {title:"CSM I-4 Work Permit System",link:"https://drive.google.com/file/d/csm4"},
    {title:"CSM I-8 Traffic and Vehicle Safety",link:"https://drive.google.com/file/d/csm5"},
    {title:"CSM I-13 Heat Stress",link:"https://drive.google.com/file/d/csm6"}
  ];

  function t(key) {
    return T[key] || TRANSLATIONS?.en?.[key] || key;
  }

  function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    T = TRANSLATIONS?.[lang] || TRANSLATIONS?.en || {};
    document.documentElement.dir = lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    updateUIText();
    if (currentUser && authToken) {
      apiCall('/auth/me', { method: 'PUT', body: JSON.stringify({ language: lang }) });
    }
  }

  function updateUIText() {
    $all('[data-t]').forEach(el => {
      const key = el.dataset.t;
      if (key) el.textContent = t(key);
    });
    $all('[data-t-placeholder]').forEach(el => {
      const key = el.dataset.tPlaceholder;
      if (key) el.placeholder = t(key);
    });
  }

  async function apiCall(endpoint, options = {}) {
    const headers = options.headers || {};
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    try {
      const res = await fetch(`${API}${endpoint}`, { ...options, headers });
      if (res.status === 401 || res.status === 403) {
        if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
          logout();
        }
        return await res.json();
      }
      return await res.json();
    } catch (e) {
      console.error('API Error:', e);
      return null;
    }
  }

  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('show');
    
    if (id === 'addObservationModal' && currentUser) {
      const nameField = $('#obsReportedBy');
      const idField = $('#obsReportedById');
      if (nameField) nameField.value = currentUser.name || '';
      if (idField) idField.value = currentUser.employee_id || '';
      const dateField = $('#obsDate');
      if (dateField && !dateField.value) dateField.value = new Date().toISOString().split('T')[0];
      const timeField = $('#obsTime');
      if (timeField && !timeField.value) {
        const now = new Date();
        timeField.value = now.toTimeString().slice(0, 5);
      }
    }
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('show');
  }
  window.openModal = openModal;
  window.closeModal = closeModal;

  function openTab(evt, tabId) {
    $all('.tab-content').forEach(t => { t.classList.remove('active'); t.style.display = 'none'; });
    const target = document.getElementById(tabId);
    if (target) { target.classList.add('active'); target.style.display = 'block'; }
    $all('.nav-button').forEach(b => b.classList.remove('active'));
    if (evt && evt.currentTarget) evt.currentTarget.classList.add('active');
    window.scrollTo({ top: 0 });
    hideMoreMenu();
  }
  window.openTab = openTab;

  function toggleMoreMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    const menu = $('#moreMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
  function hideMoreMenu() { 
    const menu = $('#moreMenu');
    if (menu) menu.style.display = 'none'; 
  }
  window.toggleMoreMenu = toggleMoreMenu;
  window.hideMoreMenu = hideMoreMenu;

  document.addEventListener('click', (e) => {
    const menu = $('#moreMenu');
    if (menu && menu.style.display === 'block' && !e.target.closest('.more-menu') && !e.target.closest('[data-tab="MoreTab"]')) {
      hideMoreMenu();
    }
  });

  function setupNav() {
    $all('.nav-button').forEach(btn => {
      const tabId = btn.dataset.tab;
      if (tabId && tabId !== 'MoreTab') {
        btn.addEventListener('click', e => openTab(e, tabId));
      }
    });
  }

  function setupAccordions() {
    $all('.accordion').forEach(btn => {
      if (btn.classList.contains('accordion-modal')) return;
      btn.addEventListener('click', () => {
        const panel = btn.nextElementSibling;
        if (!panel) return;
        const isOpen = panel.style.display === 'block';
        $all('.panel').forEach(p => p.style.display = 'none');
        $all('.accordion').forEach(a => a.classList.remove('active'));
        if (!isOpen) {
          btn.classList.add('active');
          panel.style.display = 'block';
        }
      });
    });
  }

  function setupDarkMode() {
    const stored = localStorage.getItem('darkMode');
    if (stored === '1') applyDarkMode(true);
  }
  function applyDarkMode(dark) {
    document.body.classList.toggle('dark-mode', dark);
    localStorage.setItem('darkMode', dark ? '1' : '0');
    const toggle = $('#darkModeToggle');
    if (toggle) toggle.checked = dark;
  }
  window.toggleDarkMode = function() {
    applyDarkMode(!document.body.classList.contains('dark-mode'));
  };

  function getGPSLocation() {
    const result = $('#locationResult');
    if (!navigator.geolocation) { result.textContent = 'Geolocation not supported'; return; }
    result.textContent = 'Getting location...';
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const link = `https://maps.google.com/?q=${latitude},${longitude}`;
        result.innerHTML = `<strong>Location:</strong> ${latitude.toFixed(5)}, ${longitude.toFixed(5)}<br><a href="${link}" target="_blank">Open in Google Maps</a>`;
      },
      err => { result.textContent = 'Unable to get location: ' + err.message; },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }
  window.getGPSLocation = getGPSLocation;

  function setMonthColor() {
    const month = new Date().getMonth();
    const color = MONTH_COLORS[month] || 'White';
    const el = $('#colorName');
    if (el) {
      el.textContent = color;
      el.className = 'month-color-badge color-' + color.toLowerCase();
    }
  }

  function setupTbtOfDay() {
    const day = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const tbt = TBT_DATA[day % TBT_DATA.length];
    const content = $('#homeTbtContent');
    if (content && tbt) {
      content.innerHTML = `<div class="tbt-title" style="font-weight:600;margin-bottom:.3rem">${tbt.title}</div><a href="${tbt.link}" target="_blank" style="color:var(--accent-blue);font-size:.85rem">${t('openDoc')}</a>`;
    }
  }

  async function loadStats() {
    const stats = await apiCall('/stats');
    if (!stats) return;
    const setVal = (id, val) => { const el = $('#' + id); if (el) el.textContent = val ?? 0; };
    setVal('homeObsToday', stats.observations.today);
    setVal('homePermitsToday', stats.permits.today);
    setVal('homeTbtToday', stats.toolboxTalks.today);
    setVal('obsCountTotal', stats.observations.total);
    setVal('obsCountOpen', stats.observations.open);
    setVal('obsCountClosed', stats.observations.closed);
    setVal('permitsCountTotal', stats.permits.total);
    setVal('permitsCountAreas', stats.permits.areas);
    setVal('permitsCountToday', stats.permits.today);
    setVal('eqCountTotal', stats.equipment.total);
    setVal('eqCountTps', stats.equipment.tpsExpiring);
    setVal('eqCountIns', stats.equipment.insExpiring);
    setVal('tbtCountTotal', stats.toolboxTalks.total);
  }

  async function loadLeaderboard() {
    const users = await apiCall('/leaderboard?period=month');
    if (!users) return;
    const mini = $('#homeLeaderboardMini');
    const full = $('#leaderboardContainer');
    if (mini) {
      mini.innerHTML = users.slice(0, 3).map((u, i) => {
        const medalClass = i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : 'medal-bronze';
        const points = u.monthly_points ?? u.points ?? 0;
        return `<div class="leaderboard-mini-item"><span class="leaderboard-medal ${medalClass}"><i class="fas fa-medal"></i></span><div><div class="leaderboard-name">${u.name}</div><div class="leaderboard-points">${points} ${t('pts')}</div></div></div>`;
      }).join('') || t('noData');
    }
    if (full) {
      full.innerHTML = users.map((u, i) => {
        const points = u.monthly_points ?? u.points ?? 0;
        return `<div class="leaderboard-row"><span class="leaderboard-rank">#${i+1}</span><span class="leaderboard-row-name">${u.name}</span><span class="leaderboard-row-points">${points} ${t('pts')}</span></div>`;
      }).join('') || t('noData');
    }
  }

  async function loadEmployeeOfMonth() {
    const eom = await apiCall('/employee-of-month');
    const el = $('#employeeOfMonth');
    if (el) {
      const points = eom?.monthly_points ?? eom?.points ?? 0;
      el.innerHTML = eom ? `<div style="font-size:1.1rem;font-weight:700">${eom.name}</div><div style="font-size:.8rem;color:var(--text-soft)">${points} ${t('points')} ${t('thisMonth').toLowerCase()}</div>` : t('noData');
    }
  }

  async function loadTopAreasChart() {
    const areas = await apiCall('/top-areas');
    const container = $('#topAreasChart');
    if (!container || !areas || !areas.length) { 
      if (container) container.innerHTML = `<p style="text-align:center;color:var(--text-soft)">${t('noData')}</p>`;
      return;
    }
    
    const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'];
    const maxCount = Math.max(...areas.map(a => a.count));
    
    let html = '<div class="bar-chart">';
    areas.forEach((a, i) => {
      const width = maxCount ? Math.round((a.count / maxCount) * 100) : 0;
      html += `<div class="bar-row">
        <div class="bar-label">${a.area}</div>
        <div class="bar-wrapper">
          <div class="bar-fill" style="width:${width}%;background:${colors[i % colors.length]}"></div>
          <span class="bar-value">${a.count}</span>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  async function loadWeather() {
    if (!navigator.geolocation) return;
    
    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`);
        const data = await res.json();
        if (data.current) {
          const temp = data.current.temperature_2m;
          const humidity = data.current.relative_humidity_2m;
          const wind = data.current.wind_speed_10m;
          
          const hi = temp + 0.5555 * (6.11 * Math.exp(5417.7530 * (1/273.16 - 1/(273.16 + temp))) * humidity / 100 - 10);
          let heatStatus = t('safe');
          let heatClass = 'safe';
          if (hi >= 54) { heatStatus = t('stopWork'); heatClass = 'danger'; }
          else if (hi >= 41) { heatStatus = t('danger'); heatClass = 'danger'; }
          else if (hi >= 32) { heatStatus = t('caution'); heatClass = 'caution'; }
          
          let windStatus = t('safe');
          let windClass = 'safe';
          if (wind > 55) { windStatus = t('stopWork'); windClass = 'danger'; }
          else if (wind > 40) { windStatus = t('danger'); windClass = 'danger'; }
          else if (wind > 25) { windStatus = t('caution'); windClass = 'caution'; }
          
          const weatherEl = $('#weatherWidget');
          if (weatherEl) {
            weatherEl.innerHTML = `
              <div class="weather-grid">
                <div class="weather-item">
                  <i class="fas fa-thermometer-half"></i>
                  <div class="weather-value">${temp.toFixed(1)}°C</div>
                  <div class="weather-label">${t('heatStressLevel')}</div>
                  <div class="weather-status ${heatClass}">${heatStatus}</div>
                </div>
                <div class="weather-item">
                  <i class="fas fa-wind"></i>
                  <div class="weather-value">${wind.toFixed(1)} km/h</div>
                  <div class="weather-label">${t('windSafety')}</div>
                  <div class="weather-status ${windClass}">${windStatus}</div>
                </div>
              </div>`;
          }
        }
      } catch (e) {
        console.log('Weather fetch error:', e);
      }
    });
  }

  async function loadNews() {
    const news = await apiCall('/news');
    const container = $('#newsContainer');
    if (container) {
      container.innerHTML = news && news.length ? news.map(n => `<div class="news-item priority-${n.priority}"><h4>${n.title}</h4><p>${n.content}</p><div class="news-meta">${n.created_by} - ${new Date(n.created_at).toLocaleDateString()}</div></div>`).join('') : t('noData');
    }
  }

  async function loadObservations() {
    const params = new URLSearchParams();
    if (state.obsRange !== 'all') params.append('range', state.obsRange);
    if (state.obsArea) params.append('area', state.obsArea);
    if (state.obsStatus) params.append('status', state.obsStatus);
    if (state.obsSearch) params.append('search', state.obsSearch);
    const obs = await apiCall(`/observations?${params}`);
    const list = $('#observationsList');
    if (!list) return;
    if (!obs || !obs.length) { list.innerHTML = `<p style="text-align:center;color:var(--text-soft)">${t('noData')}</p>`; return; }
    list.innerHTML = obs.map(o => {
      const isPositive = o.observation_class === 'Positive';
      const classColor = isPositive ? 'obs-positive' : 'obs-negative';
      const riskClass = o.risk_level === 'High' ? 'risk-high' : o.risk_level === 'Low' ? 'risk-low' : 'risk-medium';
      const badgeClass = o.risk_level === 'High' ? 'badge-high' : o.risk_level === 'Low' ? 'badge-low' : 'badge-medium';
      const statusClass = o.status === 'Open' ? 'status-open' : 'status-closed';
      return `<div class="obs-card ${riskClass} ${classColor}" onclick="viewObservation(${o.id})"><div class="obs-card-header"><span class="obs-card-title">${o.area || 'Unknown'}</span><div class="obs-card-badges"><span class="badge ${badgeClass}">${o.risk_level}</span><span class="status-pill ${statusClass}">${o.status}</span></div></div><div class="obs-card-date">${o.date} ${o.time || ''}</div><div class="obs-description">${(o.description || '').substring(0, 100)}...</div><div class="obs-chip-row"><span class="obs-chip">${o.observation_type || 'Observation'}</span>${o.reported_by ? `<span class="obs-chip">${o.reported_by}</span>` : ''}</div></div>`;
    }).join('');
  }

  window.viewObservation = async function(id) {
    const obs = await apiCall(`/observations/${id}`);
    if (!obs) return;
    const modal = $('#viewObservationModal');
    const content = $('#viewObservationContent');
    if (!modal || !content) return;
    
    let beforePhotos = [], afterPhotos = [];
    try { beforePhotos = JSON.parse(obs.evidence_urls || '[]'); } catch (e) {}
    try { afterPhotos = JSON.parse(obs.close_evidence_urls || '[]'); } catch (e) {}
    
    let photoComparisonHtml = '';
    if (beforePhotos.length || afterPhotos.length) {
      photoComparisonHtml = `<div class="photo-comparison">
        <div class="photo-section"><h5><i class="fas fa-camera"></i> ${t('beforePhotos')}</h5>
          ${beforePhotos.length ? beforePhotos.map(u => `<img src="${u}" alt="Before" onclick="window.open('${u}','_blank')">`).join('') : `<p style="color:var(--text-soft)">${t('noPhotos')}</p>`}
        </div>
        <div class="photo-section"><h5><i class="fas fa-check-circle"></i> ${t('afterPhotos')}</h5>
          ${afterPhotos.length ? afterPhotos.map(u => `<img src="${u}" alt="After" onclick="window.open('${u}','_blank')">`).join('') : `<p style="color:var(--text-soft)">${t('noPhotos')}</p>`}
        </div>
      </div>`;
    }
    
    let dueDateHtml = '';
    if (obs.due_date) {
      const dueDate = new Date(obs.due_date);
      dueDate.setHours(23, 59, 59, 999);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = obs.status === 'Open' && dueDate < today;
      const isWarning = obs.status === 'Open' && dueDate <= new Date(today.getTime() + 7*24*60*60*1000) && !isOverdue;
      dueDateHtml = `<div class="detail-row"><span class="detail-label">${t('dueDate')}:</span><span class="${isOverdue ? 'due-date-overdue' : isWarning ? 'due-date-warning' : ''}">${obs.due_date}${isOverdue ? ' (OVERDUE)' : ''}</span></div>`;
    }
    
    let actionTrackingHtml = '';
    if (obs.responsible_person || obs.due_date) {
      actionTrackingHtml = `<div class="action-tracking"><h4><i class="fas fa-tasks"></i> ${t('correctiveActionTracking')}</h4>
        <div class="action-row"><span>${t('responsiblePerson')}:</span><span>${obs.responsible_person || '-'}</span></div>
        ${dueDateHtml ? `<div class="action-row"><span>${t('dueDate')}:</span><span>${obs.due_date}</span></div>` : ''}
        <div class="action-row"><span>${t('status')}:</span><span>${obs.status}</span></div>
        ${obs.closed_by ? `<div class="action-row"><span>${t('closedBy')}:</span><span>${obs.closed_by} (${obs.closed_date})</span></div>` : ''}
      </div>`;
    }
    
    let closeButtonHtml = obs.status === 'Open' && currentUser ? 
      `<button class="btn btn-success" onclick="openCloseObservationModal(${obs.id})">${t('closeObservation')}</button>` : '';
    
    content.innerHTML = `
      <div class="detail-grid">
        <div class="detail-row"><span class="detail-label">${t('date')}:</span><span>${obs.date}</span></div>
        <div class="detail-row"><span class="detail-label">${t('time')}:</span><span>${obs.time || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('area')}:</span><span>${obs.area}</span></div>
        <div class="detail-row"><span class="detail-label">${t('location')}:</span><span>${obs.location || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('activityType')}:</span><span>${obs.activity_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('observationClass')}:</span><span class="${obs.observation_class === 'Positive' ? 'text-green' : 'text-red'}">${obs.observation_class || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('observationType')}:</span><span>${obs.observation_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('riskLevel')}:</span><span>${obs.risk_level}</span></div>
        <div class="detail-row"><span class="detail-label">${t('status')}:</span><span>${obs.status}</span></div>
        <div class="detail-row"><span class="detail-label">${t('reportedBy')}:</span><span>${obs.reported_by || '-'} (${obs.reported_by_id || '-'})</span></div>
        ${dueDateHtml}
      </div>
      <div class="detail-section"><h4>${t('description')}</h4><p>${obs.description || '-'}</p></div>
      <div class="detail-section"><h4>${t('directCause')}</h4><p>${obs.direct_cause || '-'}</p></div>
      <div class="detail-section"><h4>${t('immediateAction')}</h4><p>${obs.immediate_action || '-'}</p></div>
      <div class="detail-section"><h4>${t('correctiveAction')}</h4><p>${obs.corrective_action || '-'}</p></div>
      ${actionTrackingHtml}
      ${photoComparisonHtml}
      ${obs.closed_notes ? `<div class="detail-section"><h4>${t('closingNotes')}</h4><p>${obs.closed_notes}</p></div>` : ''}
      <div class="modal-actions">
        ${closeButtonHtml}
        <button class="btn btn-secondary" onclick="printRecord('observation', ${obs.id})">${t('print')}</button>
        <button class="btn btn-primary" onclick="closeModal('viewObservationModal')">${t('close')}</button>
      </div>
    `;
    openModal('viewObservationModal');
  };
  
  let currentObsIdToClose = null;
  window.openCloseObservationModal = function(id) {
    currentObsIdToClose = id;
    closeModal('viewObservationModal');
    openModal('closeObservationModal');
  };
  
  window.submitCloseObservation = async function() {
    if (!currentObsIdToClose) return;
    const afterPhotos = await uploadPhotos($('#closeObsPhotos'));
    const notes = $('#closeObsNotes').value;
    const result = await apiCall(`/observations/${currentObsIdToClose}/close`, {
      method: 'PUT',
      body: JSON.stringify({ closed_notes: notes, close_evidence_urls: afterPhotos })
    });
    if (result && !result.error) {
      closeModal('closeObservationModal');
      $('#closeObsNotes').value = '';
      $('#closeObsPhotos').value = '';
      currentObsIdToClose = null;
      loadObservations();
      loadStats();
      updateUserPoints();
    }
  };

  window.printRecord = function(type, id) {
    const printWindow = window.open('', '_blank');
    const content = $(`#view${type.charAt(0).toUpperCase() + type.slice(1)}Content`);
    if (!content) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Safety Observer Pro - ${type}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #ca8a04; padding-bottom: 10px; }
          .header h1 { color: #ca8a04; margin: 0; }
          .header p { color: #666; margin: 5px 0; }
          .detail-row { display: flex; padding: 8px 0; border-bottom: 1px solid #eee; }
          .detail-label { font-weight: bold; width: 150px; }
          .detail-section { margin: 15px 0; }
          .detail-section h4 { color: #ca8a04; margin-bottom: 5px; }
          .evidence-gallery img { max-width: 200px; margin: 5px; }
          @media print { .modal-actions { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Safety Observer Pro</h1>
          <p>Saudi Safety Group - CAT Project</p>
        </div>
        ${content.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  async function loadAreas() {
    const obsAreas = await apiCall('/observations/areas');
    const permitAreas = await apiCall('/permits/areas');
    const permitTypes = await apiCall('/permits/types');
    const eqAreas = await apiCall('/equipment/areas');
    
    const populateSelect = (sel, areas, addNew = false) => {
      if (!sel || !areas) return;
      areas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
      if (addNew) sel.innerHTML += `<option value="__new__">${t('addNewArea')}</option>`;
    };
    
    populateSelect($('#obsFilterArea'), obsAreas);
    populateSelect($('#obsAreaSelect'), obsAreas, true);
    populateSelect($('#permitsFilterArea'), permitAreas);
    populateSelect($('#permitAreaSelect'), permitAreas, true);
    populateSelect($('#permitsFilterType'), permitTypes);
    populateSelect($('#eqFilterArea'), eqAreas);
    populateSelect($('#eqAreaSelect'), eqAreas, true);
  }

  function setupObsFilters() {
    $all('.obs-filter-chip:not(.permits-chip):not(.tbt-chip)').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.obs-filter-chip:not(.permits-chip):not(.tbt-chip)').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.obsRange = chip.dataset.range;
        loadObservations();
      });
    });
    $('#obsFilterArea')?.addEventListener('change', e => { state.obsArea = e.target.value; loadObservations(); });
    $('#obsFilterStatus')?.addEventListener('change', e => { state.obsStatus = e.target.value; loadObservations(); });
    $('#obsSearch')?.addEventListener('input', debounce(e => { state.obsSearch = e.target.value; loadObservations(); }, 300));
  }

  async function loadPermits() {
    const params = new URLSearchParams();
    if (state.permitsRange !== 'all') params.append('range', state.permitsRange);
    if (state.permitsArea) params.append('area', state.permitsArea);
    if (state.permitsType) params.append('type', state.permitsType);
    if (state.permitsSearch) params.append('search', state.permitsSearch);
    const permits = await apiCall(`/permits?${params}`);
    const list = $('#permitsList');
    if (!list) return;
    if (!permits || !permits.length) { list.innerHTML = `<p style="text-align:center;color:var(--text-soft)">${t('noData')}</p>`; return; }
    list.innerHTML = permits.map(p => {
      const typeClass = p.permit_type === 'Hot Work' ? 'badge-high' : p.permit_type === 'Confined Space' ? 'badge-medium' : 'badge-low';
      return `<div class="obs-card" onclick="viewPermit(${p.id})"><div class="obs-card-header"><span class="obs-card-title">${p.area || 'Unknown'}</span><span class="badge ${typeClass}">${p.permit_type || 'General'}</span></div><div class="obs-card-date">${p.date}</div><div class="obs-description">${p.description || p.project || ''}</div><div class="obs-chip-row">${p.receiver ? `<span class="obs-chip">${t('receiver')}: ${p.receiver}</span>` : ''}${p.permit_number ? `<span class="obs-chip">#${p.permit_number}</span>` : ''}</div></div>`;
    }).join('');
  }

  window.viewPermit = async function(id) {
    const permit = await apiCall(`/permits/${id}`);
    if (!permit) return;
    const modal = $('#viewPermitModal');
    const content = $('#viewPermitContent');
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div class="detail-grid">
        <div class="detail-row"><span class="detail-label">${t('date')}:</span><span>${permit.date}</span></div>
        <div class="detail-row"><span class="detail-label">${t('area')}:</span><span>${permit.area}</span></div>
        <div class="detail-row"><span class="detail-label">${t('permitType')}:</span><span>${permit.permit_type}</span></div>
        <div class="detail-row"><span class="detail-label">${t('permitNumber')}:</span><span>${permit.permit_number || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('project')}:</span><span>${permit.project || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('receiver')}:</span><span>${permit.receiver || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('issuer')}:</span><span>${permit.issuer || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('status')}:</span><span>${permit.status}</span></div>
        <div class="detail-row"><span class="detail-label">${t('createdBy')}:</span><span>${permit.created_by || '-'}</span></div>
      </div>
      <div class="detail-section"><h4>${t('description')}</h4><p>${permit.description || '-'}</p></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="printRecord('permit', ${permit.id})">${t('print')}</button>
        <button class="btn btn-primary" onclick="closeModal('viewPermitModal')">${t('close')}</button>
      </div>
    `;
    openModal('viewPermitModal');
  };

  function setupPermitsFilters() {
    $all('.permits-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.permits-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.permitsRange = chip.dataset.range;
        loadPermits();
      });
    });
    $('#permitsFilterArea')?.addEventListener('change', e => { state.permitsArea = e.target.value; loadPermits(); });
    $('#permitsFilterType')?.addEventListener('change', e => { state.permitsType = e.target.value; loadPermits(); });
    $('#permitsSearch')?.addEventListener('input', debounce(e => { state.permitsSearch = e.target.value; loadPermits(); }, 300));
  }

  async function loadEquipment() {
    const params = new URLSearchParams();
    if (state.eqArea) params.append('area', state.eqArea);
    if (state.eqStatus) params.append('status', state.eqStatus);
    if (state.eqSearch) params.append('search', state.eqSearch);
    const equipment = await apiCall(`/equipment?${params}`);
    const list = $('#equipmentList');
    if (!list) return;
    if (!equipment || !equipment.length) { list.innerHTML = `<p style="text-align:center;color:var(--text-soft)">${t('noData')}</p>`; return; }
    list.innerHTML = equipment.map(e => {
      const statusClass = e.status === 'In Service' ? 'status-open' : 'status-closed';
      return `<div class="obs-card" onclick="viewEquipment(${e.id})"><div class="obs-card-header"><span class="obs-card-title">${e.equipment_type || 'Equipment'}</span><span class="status-pill ${statusClass}">${e.status}</span></div><div class="obs-card-date">${t('assetNumber')}: ${e.asset_number || 'N/A'}</div><div class="obs-chip-row"><span class="obs-chip">${e.yard_area || 'Unknown'}</span>${e.pwas_required ? `<span class="obs-chip">PWAS: ${e.pwas_required}</span>` : ''}</div></div>`;
    }).join('');
  }

  window.viewEquipment = async function(id) {
    const eq = await apiCall(`/equipment/${id}`);
    if (!eq) return;
    const modal = $('#viewEquipmentModal');
    const content = $('#viewEquipmentContent');
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div class="detail-grid">
        <div class="detail-row"><span class="detail-label">${t('assetNumber')}:</span><span>${eq.asset_number || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('equipmentType')}:</span><span>${eq.equipment_type}</span></div>
        <div class="detail-row"><span class="detail-label">${t('owner')}:</span><span>${eq.owner || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('yardArea')}:</span><span>${eq.yard_area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('status')}:</span><span>${eq.status}</span></div>
        <div class="detail-row"><span class="detail-label">${t('pwasRequired')}:</span><span>${eq.pwas_required || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('tpsExpiry')}:</span><span>${eq.tps_expiry || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('insExpiry')}:</span><span>${eq.ins_expiry || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('operatorName')}:</span><span>${eq.operator_name || '-'}</span></div>
      </div>
      <div class="detail-section"><h4>${t('notes')}</h4><p>${eq.notes || '-'}</p></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="printRecord('equipment', ${eq.id})">${t('print')}</button>
        <button class="btn btn-primary" onclick="closeModal('viewEquipmentModal')">${t('close')}</button>
      </div>
    `;
    openModal('viewEquipmentModal');
  };

  function setupEqFilters() {
    $('#eqFilterArea')?.addEventListener('change', e => { state.eqArea = e.target.value; loadEquipment(); });
    $('#eqFilterStatus')?.addEventListener('change', e => { state.eqStatus = e.target.value; loadEquipment(); });
    $('#eqSearch')?.addEventListener('input', debounce(e => { state.eqSearch = e.target.value; loadEquipment(); }, 300));
  }

  async function loadTbt() {
    const params = new URLSearchParams();
    if (state.tbtRange !== 'all') params.append('range', state.tbtRange);
    if (state.tbtSearch) params.append('search', state.tbtSearch);
    const talks = await apiCall(`/toolbox-talks?${params}`);
    const list = $('#tbtList');
    if (!list) return;
    if (!talks || !talks.length) { list.innerHTML = `<p style="text-align:center;color:var(--text-soft)">${t('noData')}</p>`; return; }
    list.innerHTML = talks.map(tbt => `<div class="obs-card" onclick="viewTbt(${tbt.id})"><div class="obs-card-header"><span class="obs-card-title">${tbt.topic || 'TBT'}</span><span class="badge badge-low">${tbt.attendance || 0} ${t('attendance').toLowerCase()}</span></div><div class="obs-card-date">${tbt.date} - ${tbt.presenter || 'Unknown'}</div><div class="obs-chip-row"><span class="obs-chip">${tbt.area || 'General'}</span></div></div>`).join('');
    const avg = talks.length ? Math.round(talks.reduce((s, t) => s + (t.attendance || 0), 0) / talks.length) : 0;
    const tbtAvg = $('#tbtAvgAttendance');
    if (tbtAvg) tbtAvg.textContent = avg;
  }

  window.viewTbt = async function(id) {
    const tbt = await apiCall(`/toolbox-talks/${id}`);
    if (!tbt) return;
    const modal = $('#viewTbtModal');
    const content = $('#viewTbtContent');
    if (!modal || !content) return;
    
    content.innerHTML = `
      <div class="detail-grid">
        <div class="detail-row"><span class="detail-label">${t('date')}:</span><span>${tbt.date}</span></div>
        <div class="detail-row"><span class="detail-label">${t('topic')}:</span><span>${tbt.topic}</span></div>
        <div class="detail-row"><span class="detail-label">${t('presenter')}:</span><span>${tbt.presenter || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('area')}:</span><span>${tbt.area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">${t('attendance')}:</span><span>${tbt.attendance || 0}</span></div>
        <div class="detail-row"><span class="detail-label">${t('createdBy')}:</span><span>${tbt.created_by || '-'}</span></div>
      </div>
      <div class="detail-section"><h4>${t('description')}</h4><p>${tbt.description || '-'}</p></div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="printRecord('tbt', ${tbt.id})">${t('print')}</button>
        <button class="btn btn-primary" onclick="closeModal('viewTbtModal')">${t('close')}</button>
      </div>
    `;
    openModal('viewTbtModal');
  };

  function setupTbtFilters() {
    $all('.tbt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.tbt-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.tbtRange = chip.dataset.range;
        loadTbt();
      });
    });
    $('#tbtSearch')?.addEventListener('input', debounce(e => { state.tbtSearch = e.target.value; loadTbt(); }, 300));
  }

  let currentLibrary = null;
  function openLibrarySection(type) {
    currentLibrary = type;
    const data = type === 'tbt' ? TBT_DATA : type === 'jsa' ? JSA_DATA : CSM_DATA;
    renderLibrary(data);
    $('.library-grid').style.display = 'none';
    $('#libraryContent').style.display = 'block';
  }
  function closeLibrarySection() {
    $('.library-grid').style.display = 'grid';
    $('#libraryContent').style.display = 'none';
    currentLibrary = null;
  }
  function renderLibrary(data, filter = '') {
    const list = $('#libraryList');
    const filtered = filter ? data.filter(d => d.title.toLowerCase().includes(filter.toLowerCase())) : data;
    list.innerHTML = filtered.map(d => `<div class="library-item"><span class="library-item-title">${d.title}</span><a href="${d.link}" target="_blank">${t('view')}</a></div>`).join('') || t('noData');
  }
  window.openLibrarySection = openLibrarySection;
  window.closeLibrarySection = closeLibrarySection;
  $('#librarySearch')?.addEventListener('input', e => {
    const data = currentLibrary === 'tbt' ? TBT_DATA : currentLibrary === 'jsa' ? JSA_DATA : CSM_DATA;
    renderLibrary(data, e.target.value);
  });

  function toggleToolSection(id) {
    const sections = ['trainingMatrix', 'heatStress', 'windSpeed', 'riskMatrix', 'lifeSaving', 'challenges'];
    sections.forEach(s => {
      const el = document.getElementById(s + 'Section');
      if (el) el.style.display = s === id && el.style.display !== 'block' ? 'block' : 'none';
    });
    if (id === 'challenges') loadChallenges();
  }
  window.toggleToolSection = toggleToolSection;

  function calculateHeatIndex() {
    const temp = parseFloat($('#inputTemp')?.value);
    const humidity = parseFloat($('#inputHumidity')?.value);
    if (isNaN(temp) || isNaN(humidity)) return;
    const hi = temp + 0.5555 * (6.11 * Math.exp(5417.7530 * (1/273.16 - 1/(273.16 + temp))) * humidity / 100 - 10);
    const result = $('#heatIndexResult');
    const status = $('#heatRiskLevel');
    result.textContent = hi.toFixed(1) + '°C';
    if (hi >= 54) { status.textContent = t('stopWork'); status.style.color = '#b91c1c'; }
    else if (hi >= 41) { status.textContent = t('danger'); status.style.color = '#dc2626'; }
    else if (hi >= 32) { status.textContent = t('caution'); status.style.color = '#f59e0b'; }
    else { status.textContent = t('safe'); status.style.color = '#22c55e'; }
  }
  window.calculateHeatIndex = calculateHeatIndex;

  function calculateWindSafety() {
    const wind = parseFloat($('#inputWind')?.value);
    if (isNaN(wind)) return;
    const result = $('#windResult');
    const status = $('#windRestrictions');
    if (wind > 55) { result.textContent = t('stopWork').toUpperCase(); result.style.color = '#b91c1c'; status.textContent = 'All outdoor work suspended'; }
    else if (wind > 40) { result.textContent = t('danger').toUpperCase(); result.style.color = '#dc2626'; status.textContent = 'Stop crane ops, review WAH'; }
    else if (wind > 25) { result.textContent = t('caution').toUpperCase(); result.style.color = '#f59e0b'; status.textContent = 'Secure loose materials'; }
    else { result.textContent = t('safe').toUpperCase(); result.style.color = '#22c55e'; status.textContent = 'Normal operations'; }
  }
  window.calculateWindSafety = calculateWindSafety;

  async function loadChallenges() {
    const challenges = await apiCall('/challenges');
    const list = $('#challengesList');
    if (!list) return;
    if (!challenges || !challenges.length) { list.innerHTML = `<p>${t('noData')}</p>`; return; }
    const titleKey = currentLang === 'ar' ? 'title_ar' : currentLang === 'ur' ? 'title_ur' : 'title';
    const descKey = currentLang === 'ar' ? 'description_ar' : currentLang === 'ur' ? 'description_ur' : 'description';
    list.innerHTML = challenges.map(c => `<div class="challenge-card"><div class="challenge-info"><h4>${c[titleKey] || c.title}</h4><p>${c[descKey] || c.description || ''}</p></div><span class="challenge-points">${c.points} ${t('pts')}</span></div>`).join('');
  }

  async function loadMyBadges() {
    const badges = await apiCall('/my-badges');
    const container = $('#myBadgesContainer');
    if (!container) return;
    if (!badges || !badges.length) { container.innerHTML = `<p>${t('noData')}</p>`; return; }
    const nameKey = currentLang === 'ar' ? 'name_ar' : currentLang === 'ur' ? 'name_ur' : 'name';
    container.innerHTML = badges.map(b => `<div class="badge-card"><i class="fas ${b.icon}"></i><span>${b[nameKey] || b.name}</span></div>`).join('');
  }

  async function loadPendingUsers() {
    if (currentUser?.role !== 'admin') return;
    const users = await apiCall('/auth/pending-users');
    const container = $('#pendingUsersContainer');
    if (!container) return;
    if (!users || !users.length) { container.innerHTML = `<p>${t('noData')}</p>`; return; }
    container.innerHTML = users.map(u => `<div class="pending-user-card"><div><strong>${u.name}</strong><br><small>${u.employee_id}</small></div><div class="pending-actions"><button class="btn btn-success btn-sm" onclick="approveUser(${u.id})">${t('approve')}</button><button class="btn btn-danger btn-sm" onclick="rejectUser(${u.id})">${t('reject')}</button></div></div>`).join('');
  }

  window.approveUser = async function(id) {
    await apiCall(`/auth/approve-user/${id}`, { method: 'PUT' });
    loadPendingUsers();
  };

  window.rejectUser = async function(id) {
    if (confirm('Reject this user registration?')) {
      await apiCall(`/auth/reject-user/${id}`, { method: 'DELETE' });
      loadPendingUsers();
    }
  };

  async function uploadPhotos(input) {
    if (!input.files.length) return [];
    const formData = new FormData();
    for (const file of input.files) formData.append('photos', file);
    try {
      const res = await fetch(`${API}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      return data.urls || [];
    } catch (e) { console.error('Upload error:', e); return []; }
  }

  function setupObservationForm() {
    const obsTypeSelect = $('#obsType');
    const injuryGroup = $('#injuryGroup');
    const injuryTypeGroup = $('#injuryTypeGroup');
    const hasInjurySelect = $('#hasInjury');
    
    if (obsTypeSelect) {
      obsTypeSelect.innerHTML = `<option value="">${t('selectObsType')}</option>` + 
        OBSERVATION_TYPES.map(type => `<option value="${type}">${type}</option>`).join('');
      
      obsTypeSelect.addEventListener('change', () => {
        if (obsTypeSelect.value === 'Near Miss/Incident') {
          injuryGroup.style.display = 'block';
        } else {
          injuryGroup.style.display = 'none';
          injuryTypeGroup.style.display = 'none';
        }
      });
    }
    
    if (hasInjurySelect) {
      hasInjurySelect.addEventListener('change', () => {
        if (hasInjurySelect.value === 'yes') {
          injuryTypeGroup.style.display = 'block';
        } else {
          injuryTypeGroup.style.display = 'none';
        }
      });
    }
    
    const injuryTypeSelect = $('#injuryType');
    if (injuryTypeSelect) {
      injuryTypeSelect.innerHTML = `<option value="">${t('selectInjuryType')}</option>` + 
        INJURY_TYPES.map(type => `<option value="${type}">${type}</option>`).join('');
    }
    
    const activitySelect = $('#activityType');
    if (activitySelect) {
      activitySelect.innerHTML = `<option value="">${t('selectActivity')}</option>` + 
        ACTIVITY_TYPES.map(type => `<option value="${type}">${type}</option>`).join('');
    }
    
    const areaSelect = $('#obsAreaSelect');
    if (areaSelect) {
      areaSelect.addEventListener('change', () => {
        if (areaSelect.value === '__new__') {
          const newArea = prompt(t('addNewArea'));
          if (newArea) {
            const opt = document.createElement('option');
            opt.value = newArea;
            opt.textContent = newArea;
            areaSelect.insertBefore(opt, areaSelect.lastElementChild);
            areaSelect.value = newArea;
          } else {
            areaSelect.value = '';
          }
        }
      });
    }
  }

  $('#addObservationForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const evidenceUrls = await uploadPhotos($('#obsPhotos'));
    const data = {
      date: $('#obsDate').value,
      time: $('#obsTime').value,
      area: $('#obsAreaSelect').value,
      location: $('#obsLocation').value,
      activity_type: $('#activityType').value,
      observation_class: $('#obsClass').value,
      observation_type: $('#obsType').value,
      has_injury: $('#hasInjury')?.value === 'yes',
      injury_type: $('#injuryType')?.value,
      description: $('#obsDescription').value,
      direct_cause: $('#obsDirectCause').value,
      root_cause: $('#obsRootCause').value,
      immediate_action: $('#obsImmediateAction').value,
      corrective_action: $('#obsCorrectiveAction').value,
      responsible_person: $('#obsResponsiblePerson').value,
      due_date: $('#obsDueDate').value,
      risk_level: $('#obsRiskLevel').value,
      reported_by: $('#obsReportedBy').value,
      reported_by_id: $('#obsReportedById').value,
      evidence_urls: evidenceUrls
    };
    const result = await apiCall('/observations', { method: 'POST', body: JSON.stringify(data) });
    if (result && !result.error) {
      closeModal('addObservationModal');
      e.target.reset();
      loadObservations();
      loadStats();
      loadAreas();
      updateUserPoints();
    }
  });

  $('#addPermitForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    let area = $('#permitAreaSelect').value;
    if (area === '__new__') {
      area = prompt(t('addNewArea'));
      if (!area) return;
    }
    const data = {
      date: $('#permitDate').value,
      area: area,
      permit_type: $('#permitType').value,
      permit_number: $('#permitNumber').value,
      project: $('#permitProject').value,
      receiver: $('#permitReceiver').value,
      issuer: $('#permitIssuer').value,
      description: $('#permitDescription').value
    };
    const result = await apiCall('/permits', { method: 'POST', body: JSON.stringify(data) });
    if (result && !result.error) {
      closeModal('addPermitModal');
      e.target.reset();
      loadPermits();
      loadStats();
      loadAreas();
      updateUserPoints();
    }
  });

  $('#addEquipmentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    let area = $('#eqAreaSelect').value;
    if (area === '__new__') {
      area = prompt(t('addNewArea'));
      if (!area) return;
    }
    const data = {
      asset_number: $('#eqAssetNumber').value,
      equipment_type: $('#eqType').value,
      owner: $('#eqOwner').value,
      yard_area: area,
      status: $('#eqStatusSelect').value,
      pwas_required: $('#eqPwas').value,
      tps_date: $('#eqTpsDate').value,
      tps_expiry: $('#eqTpsExpiry').value,
      ins_date: $('#eqInsDate').value,
      ins_expiry: $('#eqInsExpiry').value,
      operator_name: $('#eqOperator').value,
      operator_license: $('#eqLicense').value,
      notes: $('#eqNotes').value
    };
    const result = await apiCall('/equipment', { method: 'POST', body: JSON.stringify(data) });
    if (result && !result.error) {
      closeModal('addEquipmentModal');
      e.target.reset();
      loadEquipment();
      loadStats();
      loadAreas();
    }
  });

  $('#addTbtForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const evidenceUrls = await uploadPhotos($('#tbtPhotos'));
    const data = {
      date: $('#tbtDate').value,
      topic: $('#tbtTopic').value,
      presenter: $('#tbtPresenter').value,
      area: $('#tbtArea').value,
      attendance: parseInt($('#tbtAttendance').value) || 0,
      description: $('#tbtDescription').value,
      evidence_urls: evidenceUrls
    };
    const result = await apiCall('/toolbox-talks', { method: 'POST', body: JSON.stringify(data) });
    if (result && !result.error) {
      closeModal('addTbtModal');
      e.target.reset();
      loadTbt();
      loadStats();
      updateUserPoints();
    }
  });

  $('#addNewsForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      title: $('#newsTitle').value,
      content: $('#newsContent').value,
      priority: $('#newsPriority').value
    };
    const result = await apiCall('/news', { method: 'POST', body: JSON.stringify(data) });
    if (result && !result.error) {
      closeModal('addNewsModal');
      e.target.reset();
      loadNews();
    }
  });

  async function updateUserPoints() {
    if (!authToken) return;
    const user = await apiCall('/auth/me');
    if (user && !user.error) {
      currentUser = user;
      const pointsEl = $('#userPoints');
      if (pointsEl) pointsEl.textContent = user.points ?? 0;
      const badgeEl = $('#userBadge');
      if (badgeEl && user.badges && user.badges.length) {
        badgeEl.textContent = user.badges[0].name;
        badgeEl.style.display = 'inline';
      }
    }
  }

  function showLoggedInUI() {
    $('#pointsDisplay').style.display = 'flex';
    if (currentUser?.role === 'admin') {
      $('#adminSection').style.display = 'block';
    }
    updateSettingsUI();
  }

  function updateSettingsUI() {
    if (!currentUser) return;
    $('#settingsPoints').textContent = currentUser.points ?? 0;
    $('#settingsLevel').textContent = currentUser.level ?? 'Bronze';
    loadMyBadges();
    if (currentUser.role === 'admin') {
      loadPendingUsers();
    }
    const langBtns = $all('.lang-btn');
    langBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === currentLang);
    });
    const darkToggle = $('#darkModeToggle');
    if (darkToggle) darkToggle.checked = document.body.classList.contains('dark-mode');
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    $('#pointsDisplay').style.display = 'none';
    $('#adminSection').style.display = 'none';
    openModal('loginModal');
  }
  window.logout = logout;

  $all('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
      updateSettingsUI();
    });
  });

  $all('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $all('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      $('#loginForm').style.display = isLogin ? 'flex' : 'none';
      $('#registerForm').style.display = isLogin ? 'none' : 'flex';
      $('#authMessage').style.display = 'none';
    });
  });

  $('#loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      employee_id: $('#loginEmployeeId').value,
      password: $('#loginPassword').value
    };
    const result = await apiCall('/auth/login', { method: 'POST', body: JSON.stringify(data) });
    if (result?.error) {
      $('#loginError').textContent = result.error;
    } else if (result?.token) {
      authToken = result.token;
      currentUser = result.user;
      localStorage.setItem('authToken', authToken);
      if (result.user.language) {
        setLanguage(result.user.language);
      }
      closeModal('loginModal');
      showLoggedInUI();
      updateUserPoints();
      init();
    }
  });

  $('#registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      employee_id: $('#regEmployeeId').value,
      name: $('#regName').value,
      password: $('#regPassword').value
    };
    const result = await apiCall('/auth/register', { method: 'POST', body: JSON.stringify(data) });
    if (result?.error) {
      $('#registerError').textContent = result.error;
    } else if (result?.pending) {
      $('#authMessage').textContent = t('pendingApproval');
      $('#authMessage').style.display = 'block';
      $('#authMessage').className = 'auth-message success';
      e.target.reset();
    }
  });

  $('#newsToggleButton')?.addEventListener('click', () => {
    loadNews();
    openModal('newsModal');
  });

  function debounce(fn, delay) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function importHistoricalData() {
    const result = await apiCall('/import-google-sheets');
    console.log('Import result:', result);
  }

  async function init() {
    T = TRANSLATIONS?.[currentLang] || TRANSLATIONS?.en || {};
    setLanguage(currentLang);
    setupNav();
    setupAccordions();
    setupDarkMode();
    setMonthColor();
    setupTbtOfDay();
    setupObsFilters();
    setupPermitsFilters();
    setupEqFilters();
    setupTbtFilters();
    setupObservationForm();
    
    if (authToken) {
      const user = await apiCall('/auth/me');
      if (user && !user.error) {
        currentUser = user;
        if (user.language) setLanguage(user.language);
        showLoggedInUI();
        updateUserPoints();
      } else {
        logout();
        return;
      }
    } else {
      openModal('loginModal');
    }
    
    importHistoricalData();
    loadStats();
    loadLeaderboard();
    loadEmployeeOfMonth();
    loadTopAreasChart();
    loadWeather();
    loadAreas();
    loadObservations();
    loadPermits();
    loadEquipment();
    loadTbt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
