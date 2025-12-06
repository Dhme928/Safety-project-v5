(function() {
  const API = '/api';
  let currentUser = null;
  let authToken = localStorage.getItem('authToken');

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

  async function apiCall(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    try {
      const res = await fetch(`${API}${endpoint}`, { ...options, headers });
      if (res.status === 401 || res.status === 403) {
        logout();
        return null;
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
  }
  window.openTab = openTab;

  function toggleMoreMenu(e) {
    e.preventDefault();
    e.stopPropagation();
    const menu = $('#moreMenu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  }
  function hideMoreMenu() { $('#moreMenu').style.display = 'none'; }
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
    $('.mode-toggle')?.addEventListener('click', () => applyDarkMode(!document.body.classList.contains('dark-mode')));
  }
  function applyDarkMode(dark) {
    document.body.classList.toggle('dark-mode', dark);
    const icon = $('#modeIcon');
    if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
    localStorage.setItem('darkMode', dark ? '1' : '0');
  }

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
      content.innerHTML = `<div class="tbt-title" style="font-weight:600;margin-bottom:.3rem">${tbt.title}</div><a href="${tbt.link}" target="_blank" style="color:var(--accent-blue);font-size:.85rem">Open TBT Document</a>`;
    }
  }

  async function loadStats() {
    const stats = await apiCall('/stats');
    if (!stats) return;
    $('#homeObsToday').textContent = stats.observations.today;
    $('#homePermitsToday').textContent = stats.permits.today;
    $('#homeTbtToday').textContent = stats.toolboxTalks.today;
    $('#obsCountTotal').textContent = stats.observations.total;
    $('#obsCountOpen').textContent = stats.observations.open;
    $('#obsCountClosed').textContent = stats.observations.closed;
    $('#permitsCountTotal').textContent = stats.permits.total;
    $('#permitsCountAreas').textContent = stats.permits.areas;
    $('#permitsCountToday').textContent = stats.permits.today;
    $('#eqCountTotal').textContent = stats.equipment.total;
    $('#eqCountTps').textContent = stats.equipment.tpsExpiring;
    $('#eqCountIns').textContent = stats.equipment.insExpiring;
    $('#tbtCountTotal').textContent = stats.toolboxTalks.total;
  }

  async function loadLeaderboard() {
    const users = await apiCall('/leaderboard?period=month');
    if (!users) return;
    const mini = $('#homeLeaderboardMini');
    const full = $('#leaderboardContainer');
    if (mini) {
      mini.innerHTML = users.slice(0, 3).map((u, i) => {
        const medalClass = i === 0 ? 'medal-gold' : i === 1 ? 'medal-silver' : 'medal-bronze';
        return `<div class="leaderboard-mini-item"><span class="leaderboard-medal ${medalClass}"><i class="fas fa-medal"></i></span><div><div class="leaderboard-name">${u.name}</div><div class="leaderboard-points">${u.monthly_points || u.points} pts</div></div></div>`;
      }).join('') || 'No data';
    }
    if (full) {
      full.innerHTML = users.map((u, i) => `<div class="leaderboard-row"><span class="leaderboard-rank">#${i+1}</span><span class="leaderboard-row-name">${u.name}</span><span class="leaderboard-row-points">${u.monthly_points || u.points} pts</span></div>`).join('') || 'No data';
    }
  }

  async function loadEmployeeOfMonth() {
    const eom = await apiCall('/employee-of-month');
    const el = $('#employeeOfMonth');
    if (el) {
      el.innerHTML = eom ? `<div style="font-size:1.1rem;font-weight:700">${eom.name}</div><div style="font-size:.8rem;color:var(--text-soft)">${eom.monthly_points} points this month</div>` : 'No data yet';
    }
  }

  async function loadNews() {
    const news = await apiCall('/news');
    const container = $('#newsContainer');
    if (container) {
      container.innerHTML = news && news.length ? news.map(n => `<div class="news-item priority-${n.priority}"><h4>${n.title}</h4><p>${n.content}</p><div class="news-meta">Posted by ${n.created_by} on ${new Date(n.created_at).toLocaleDateString()}</div></div>`).join('') : 'No news';
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
    if (!obs || !obs.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No observations found</p>'; return; }
    list.innerHTML = obs.map(o => {
      const riskClass = o.risk_level === 'High' ? 'risk-high' : o.risk_level === 'Low' ? 'risk-low' : 'risk-medium';
      const badgeClass = o.risk_level === 'High' ? 'badge-high' : o.risk_level === 'Low' ? 'badge-low' : 'badge-medium';
      const statusClass = o.status === 'Open' ? 'status-open' : 'status-closed';
      return `<div class="obs-card ${riskClass}" onclick="viewObservation(${o.id})"><div class="obs-card-header"><span class="obs-card-title">${o.area || 'Unknown Area'}</span><div class="obs-card-badges"><span class="badge ${badgeClass}">${o.risk_level}</span><span class="status-pill ${statusClass}">${o.status}</span></div></div><div class="obs-card-date">${o.date} ${o.time || ''}</div><div class="obs-description">${(o.description || '').substring(0, 100)}...</div><div class="obs-chip-row"><span class="obs-chip">${o.observation_type || 'Observation'}</span>${o.reported_by ? `<span class="obs-chip">${o.reported_by}</span>` : ''}</div></div>`;
    }).join('');
  }
  window.viewObservation = function(id) {
    alert('View observation #' + id + ' - Feature coming soon');
  };

  async function loadAreas() {
    const obsAreas = await apiCall('/observations/areas');
    const permitAreas = await apiCall('/permits/areas');
    const permitTypes = await apiCall('/permits/types');
    const eqAreas = await apiCall('/equipment/areas');
    if (obsAreas) {
      const sel = $('#obsFilterArea');
      if (sel) obsAreas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
    if (permitAreas) {
      const sel = $('#permitsFilterArea');
      if (sel) permitAreas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
    if (permitTypes) {
      const sel = $('#permitsFilterType');
      if (sel) permitTypes.forEach(t => sel.innerHTML += `<option value="${t}">${t}</option>`);
    }
    if (eqAreas) {
      const sel = $('#eqFilterArea');
      if (sel) eqAreas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
  }

  function setupObsFilters() {
    $all('.obs-filter-chip:not(.permits-chip):not(.tbt-chip)').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.obs-filter-chip:not(.permits-chip):not(.tbt-chip)').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.obsRange = chip.dataset.range;
        $('#obsSummaryLabel').textContent = chip.textContent;
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
    if (!permits || !permits.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No permits found</p>'; return; }
    list.innerHTML = permits.map(p => {
      const typeClass = p.permit_type === 'Hot Work' ? 'badge-high' : p.permit_type === 'Confined Space' ? 'badge-medium' : 'badge-low';
      return `<div class="obs-card"><div class="obs-card-header"><span class="obs-card-title">${p.area || 'Unknown'}</span><span class="badge ${typeClass}">${p.permit_type || 'General'}</span></div><div class="obs-card-date">${p.date}</div><div class="obs-description">${p.description || p.project || ''}</div><div class="obs-chip-row">${p.receiver ? `<span class="obs-chip">Receiver: ${p.receiver}</span>` : ''}${p.permit_number ? `<span class="obs-chip">#${p.permit_number}</span>` : ''}</div></div>`;
    }).join('');
  }

  function setupPermitsFilters() {
    $all('.permits-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.permits-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.permitsRange = chip.dataset.range;
        $('#permitsSummaryLabel').textContent = chip.textContent;
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
    if (!equipment || !equipment.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No equipment found</p>'; return; }
    list.innerHTML = equipment.map(e => {
      const statusClass = e.status === 'In Service' ? 'status-open' : 'status-closed';
      return `<div class="obs-card"><div class="obs-card-header"><span class="obs-card-title">${e.equipment_type || 'Equipment'}</span><span class="status-pill ${statusClass}">${e.status}</span></div><div class="obs-card-date">Asset: ${e.asset_number || 'N/A'}</div><div class="obs-chip-row"><span class="obs-chip">${e.yard_area || 'Unknown'}</span>${e.pwas_required ? `<span class="obs-chip">PWAS: ${e.pwas_required}</span>` : ''}</div></div>`;
    }).join('');
  }

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
    if (!talks || !talks.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-soft)">No toolbox talks found</p>'; return; }
    list.innerHTML = talks.map(t => `<div class="obs-card"><div class="obs-card-header"><span class="obs-card-title">${t.topic || 'TBT'}</span><span class="badge badge-low">${t.attendance || 0} attendees</span></div><div class="obs-card-date">${t.date} - ${t.presenter || 'Unknown'}</div><div class="obs-chip-row"><span class="obs-chip">${t.area || 'General'}</span></div></div>`).join('');
    const filtered = talks.length;
    const avg = talks.length ? Math.round(talks.reduce((s, t) => s + (t.attendance || 0), 0) / talks.length) : 0;
    $('#tbtCountFiltered').textContent = filtered;
    $('#tbtAvgAttendance').textContent = avg;
  }

  function setupTbtFilters() {
    $all('.tbt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $all('.tbt-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.tbtRange = chip.dataset.range;
        $('#tbtSummaryLabel').textContent = chip.textContent;
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
    list.innerHTML = filtered.map(d => `<div class="library-item"><span class="library-item-title">${d.title}</span><a href="${d.link}" target="_blank">Open</a></div>`).join('') || 'No documents found';
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
    if (hi >= 54) { status.textContent = 'EXTREME DANGER - Stop work'; status.style.color = '#b91c1c'; }
    else if (hi >= 41) { status.textContent = 'DANGER - Limit exposure'; status.style.color = '#dc2626'; }
    else if (hi >= 32) { status.textContent = 'CAUTION - Hydrate frequently'; status.style.color = '#f59e0b'; }
    else { status.textContent = 'Safe conditions'; status.style.color = '#22c55e'; }
  }
  window.calculateHeatIndex = calculateHeatIndex;

  function calculateWindSafety() {
    const wind = parseFloat($('#inputWind')?.value);
    if (isNaN(wind)) return;
    const result = $('#windResult');
    const status = $('#windRestrictions');
    if (wind > 55) { result.textContent = 'STOP WORK'; result.style.color = '#b91c1c'; status.textContent = 'All outdoor work suspended'; }
    else if (wind > 40) { result.textContent = 'RESTRICTED'; result.style.color = '#dc2626'; status.textContent = 'Stop crane ops, review WAH'; }
    else if (wind > 25) { result.textContent = 'CAUTION'; result.style.color = '#f59e0b'; status.textContent = 'Secure loose materials'; }
    else { result.textContent = 'SAFE'; result.style.color = '#22c55e'; status.textContent = 'Normal operations'; }
  }
  window.calculateWindSafety = calculateWindSafety;

  async function loadChallenges() {
    const challenges = await apiCall('/challenges');
    const list = $('#challengesList');
    if (!list) return;
    if (!challenges || !challenges.length) { list.innerHTML = '<p>No challenges today. Check back tomorrow!</p>'; return; }
    list.innerHTML = challenges.map(c => `<div class="challenge-card"><div class="challenge-info"><h4>${c.title}</h4><p>${c.description || ''}</p></div><span class="challenge-points">${c.points} pts</span></div>`).join('');
  }

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

  $('#addObservationForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const evidenceUrls = await uploadPhotos($('#obsPhotos'));
    const data = {
      date: $('#obsDate').value,
      time: $('#obsTime').value,
      area: $('#obsArea').value,
      location: $('#obsLocation').value,
      observation_type: $('#obsType').value,
      description: $('#obsDescription').value,
      direct_cause: $('#obsDirectCause').value,
      root_cause: $('#obsRootCause').value,
      immediate_action: $('#obsImmediateAction').value,
      corrective_action: $('#obsCorrectiveAction').value,
      risk_level: $('#obsRiskLevel').value,
      evidence_urls: evidenceUrls
    };
    const result = await apiCall('/observations', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addObservationModal');
      e.target.reset();
      loadObservations();
      loadStats();
      updateUserPoints();
    }
  });

  $('#addPermitForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      date: $('#permitDate').value,
      area: $('#permitArea').value,
      permit_type: $('#permitType').value,
      permit_number: $('#permitNumber').value,
      project: $('#permitProject').value,
      receiver: $('#permitReceiver').value,
      issuer: $('#permitIssuer').value,
      description: $('#permitDescription').value
    };
    const result = await apiCall('/permits', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addPermitModal');
      e.target.reset();
      loadPermits();
      loadStats();
      updateUserPoints();
    }
  });

  $('#addEquipmentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      asset_number: $('#eqAssetNumber').value,
      equipment_type: $('#eqType').value,
      owner: $('#eqOwner').value,
      yard_area: $('#eqYardArea').value,
      status: $('#eqStatus').value,
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
    if (result) {
      closeModal('addEquipmentModal');
      e.target.reset();
      loadEquipment();
      loadStats();
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
    if (result) {
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
    if (result) {
      closeModal('addNewsModal');
      e.target.reset();
      loadNews();
    }
  });

  async function updateUserPoints() {
    if (!authToken) return;
    const user = await apiCall('/auth/me');
    if (user) {
      currentUser = user;
      $('#userPoints').textContent = user.points;
    }
  }

  function checkAuth() {
    if (!authToken) {
      openModal('loginModal');
      return false;
    }
    return true;
  }

  function showLoggedInUI() {
    $('#pointsDisplay').style.display = 'flex';
    $('#logoutBtn').style.display = 'flex';
    if (currentUser?.role === 'admin') {
      $('#adminMenuBtn').style.display = 'block';
    }
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    $('#pointsDisplay').style.display = 'none';
    $('#logoutBtn').style.display = 'none';
    $('#adminMenuBtn').style.display = 'none';
    openModal('loginModal');
  }
  window.logout = logout;
  $('#logoutBtn')?.addEventListener('click', logout);

  $all('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $all('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isLogin = tab.dataset.tab === 'login';
      $('#loginForm').style.display = isLogin ? 'flex' : 'none';
      $('#registerForm').style.display = isLogin ? 'none' : 'flex';
    });
  });

  $('#loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      employee_id: $('#loginEmployeeId').value,
      password: $('#loginPassword').value
    };
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.error) {
        $('#loginError').textContent = result.error;
      } else {
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        closeModal('loginModal');
        showLoggedInUI();
        $('#userPoints').textContent = currentUser.points;
        init();
      }
    } catch (err) {
      $('#loginError').textContent = 'Login failed';
    }
  });

  $('#registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      employee_id: $('#regEmployeeId').value,
      name: $('#regName').value,
      password: $('#regPassword').value
    };
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (result.error) {
        $('#registerError').textContent = result.error;
      } else {
        authToken = result.token;
        currentUser = result.user;
        localStorage.setItem('authToken', authToken);
        closeModal('loginModal');
        showLoggedInUI();
        $('#userPoints').textContent = currentUser.points;
        init();
      }
    } catch (err) {
      $('#registerError').textContent = 'Registration failed';
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

  async function init() {
    setupNav();
    setupAccordions();
    setupDarkMode();
    setMonthColor();
    setupTbtOfDay();
    setupObsFilters();
    setupPermitsFilters();
    setupEqFilters();
    setupTbtFilters();
    if (authToken) {
      const user = await apiCall('/auth/me');
      if (user) {
        currentUser = user;
        showLoggedInUI();
        $('#userPoints').textContent = user.points;
      } else {
        logout();
        return;
      }
    } else {
      openModal('loginModal');
    }
    loadStats();
    loadLeaderboard();
    loadEmployeeOfMonth();
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
