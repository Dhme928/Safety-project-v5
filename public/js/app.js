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
      if (res.status === 401) {
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
    updateDarkModeToggle();
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

  const DEFAULT_LOCATION = { lat: 24.1537, lon: 49.3553, name: 'Haradh, Saudi Arabia' };
  
  function getHeatStressLevel(tempC, humidity) {
    const tempF = (tempC * 9/5) + 32;
    let heatIndexF = tempF;
    
    if (tempF >= 80) {
      heatIndexF = -42.379 + 2.04901523 * tempF + 10.14333127 * humidity - 0.22475541 * tempF * humidity - 0.00683783 * tempF * tempF - 0.05481717 * humidity * humidity + 0.00122874 * tempF * tempF * humidity + 0.00085282 * tempF * humidity * humidity - 0.00000199 * tempF * tempF * humidity * humidity;
      
      if (humidity < 13 && tempF >= 80 && tempF <= 112) {
        heatIndexF -= ((13 - humidity) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
      } else if (humidity > 85 && tempF >= 80 && tempF <= 87) {
        heatIndexF += ((humidity - 85) / 10) * ((87 - tempF) / 5);
      }
    }
    
    const heatIndexC = (heatIndexF - 32) * 5/9;
    
    if (heatIndexC < 27 || tempC < 27) return { level: 'low', title: 'Low Heat Stress', desc: 'Normal conditions. Stay hydrated.', icon: 'fa-thermometer-quarter' };
    if (heatIndexC < 32) return { level: 'moderate', title: 'Moderate Heat Stress', desc: 'Take regular water breaks. Monitor for fatigue.', icon: 'fa-thermometer-half' };
    if (heatIndexC < 41) return { level: 'high', title: 'High Heat Stress', desc: 'Limit heavy work. Mandatory rest breaks every 30 mins.', icon: 'fa-thermometer-three-quarters' };
    return { level: 'extreme', title: 'Extreme Heat Stress', desc: 'Stop non-essential outdoor work. Emergency protocols active.', icon: 'fa-thermometer-full' };
  }

  function getWeatherIcon(code) {
    if (code === 0) return 'fa-sun';
    if (code <= 3) return 'fa-cloud-sun';
    if (code <= 48) return 'fa-smog';
    if (code <= 67) return 'fa-cloud-rain';
    if (code <= 77) return 'fa-snowflake';
    if (code <= 82) return 'fa-cloud-showers-heavy';
    if (code <= 86) return 'fa-snowflake';
    return 'fa-bolt';
  }

  async function loadWeather(lat, lon, locationName) {
    const container = $('#weatherContent');
    if (!container) return;
    
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_gusts_10m,wind_direction_10m&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather API error');
      const data = await res.json();
      
      const current = data.current;
      const temp = Math.round(current.temperature_2m);
      const feels = Math.round(current.apparent_temperature);
      const humidity = current.relative_humidity_2m;
      const windSpeed = Math.round(current.wind_speed_10m);
      const windGusts = Math.round(current.wind_gusts_10m);
      const weatherCode = current.weather_code;
      
      const heatStress = getHeatStressLevel(current.temperature_2m, humidity);
      const weatherIcon = getWeatherIcon(weatherCode);
      
      const windDir = current.wind_direction_10m;
      const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      const windDirText = directions[Math.round(windDir / 45) % 8];
      
      container.innerHTML = `
        <div class="weather-main">
          <i class="fas ${weatherIcon} weather-icon"></i>
          <div>
            <div class="weather-temp-big">${temp}°C</div>
            <div class="weather-feels">Feels like ${feels}°C</div>
          </div>
        </div>
        <div class="weather-info-row">
          <div class="weather-info-item"><i class="fas fa-tint"></i> ${humidity}% Humidity</div>
          <div class="weather-info-item"><i class="fas fa-wind"></i> ${windSpeed} km/h ${windDirText}</div>
          <div class="weather-info-item"><i class="fas fa-wind"></i> Gusts ${windGusts} km/h</div>
        </div>
        <div class="heat-stress-box level-${heatStress.level}">
          <i class="fas ${heatStress.icon} heat-stress-icon"></i>
          <div class="heat-stress-details">
            <div class="heat-stress-title">${heatStress.title}</div>
            <div class="heat-stress-desc">${heatStress.desc}</div>
          </div>
        </div>
        <div class="weather-location"><i class="fas fa-map-marker-alt"></i> ${locationName}</div>
      `;
    } catch (err) {
      console.error('Weather error:', err);
      container.innerHTML = '<div class="weather-loading"><i class="fas fa-exclamation-circle"></i> Unable to load weather data</div>';
    }
  }

  async function refreshWeather() {
    const container = $('#weatherContent');
    if (container) container.innerHTML = '<div class="weather-loading"><i class="fas fa-spinner fa-spin"></i> Getting weather data...</div>';
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => loadWeather(pos.coords.latitude, pos.coords.longitude, 'Your Location'),
        () => loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.name),
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      loadWeather(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, DEFAULT_LOCATION.name);
    }
  }
  window.refreshWeather = refreshWeather;

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
      if (eom) {
        const displayPoints = eom.monthly_points || eom.points || 0;
        const pointsLabel = eom.monthly_points > 0 ? 'this month' : 'total';
        el.innerHTML = `<div style="font-size:1.1rem;font-weight:700">${eom.name}</div><div style="font-size:.8rem;color:var(--text-soft)">${displayPoints} points ${pointsLabel}</div>`;
      } else {
        el.innerHTML = 'No data yet';
      }
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
      const classType = o.observation_class === 'Positive' ? 'class-positive' : 'class-negative';
      const riskClass = o.risk_level === 'High' ? 'risk-high' : o.risk_level === 'Low' ? 'risk-low' : 'risk-medium';
      const badgeClass = o.risk_level === 'High' ? 'badge-high' : o.risk_level === 'Low' ? 'badge-low' : 'badge-medium';
      const statusClass = o.status === 'Open' ? 'status-open' : 'status-closed';
      const classLabel = o.observation_class === 'Positive' ? '<span class="obs-chip" style="background:#dcfce7;color:#15803d;border-color:#22c55e">Positive</span>' : '<span class="obs-chip" style="background:#fee2e2;color:#b91c1c;border-color:#ef4444">Negative</span>';
      return `<div class="obs-card ${classType}" onclick="viewObservation(${o.id})"><div class="obs-card-header"><span class="obs-card-title">${o.area || 'Unknown Area'}</span><div class="obs-card-badges"><span class="badge ${badgeClass}">${o.risk_level}</span><span class="status-pill ${statusClass}">${o.status}</span></div></div><div class="obs-card-date">${o.date} ${o.time || ''}</div><div class="obs-description">${(o.description || '').substring(0, 100)}...</div><div class="obs-chip-row">${classLabel}<span class="obs-chip">${o.observation_type || 'Observation'}</span>${o.activity_type ? `<span class="obs-chip">${o.activity_type}</span>` : ''}${o.reported_by ? `<span class="obs-chip">${o.reported_by}</span>` : ''}</div></div>`;
    }).join('');
  }
  window.viewObservation = async function(id) {
    const obs = await apiCall(`/observations/${id}`);
    if (!obs) return;
    
    window.currentObservationId = id;
    
    let evidenceUrls = [];
    try { evidenceUrls = JSON.parse(obs.evidence_urls || '[]'); } catch (e) {}
    let closeEvidenceUrls = [];
    try { closeEvidenceUrls = JSON.parse(obs.close_evidence_urls || '[]'); } catch (e) {}
    
    const statusClass = obs.status === 'Open' ? 'detail-status-open' : 'detail-status-closed';
    const riskClass = obs.risk_level === 'High' ? 'detail-risk-high' : obs.risk_level === 'Low' ? 'detail-risk-low' : 'detail-risk-medium';
    const classClass = obs.observation_class === 'Positive' ? 'detail-class-positive' : 'detail-class-negative';
    
    const caStatus = obs.corrective_action_status || 'Not Started';
    const caStatusClass = caStatus === 'Completed' ? 'ca-completed' : caStatus === 'In Progress' ? 'ca-inprogress' : 'ca-notstarted';
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-info-circle"></i> Basic Information</div>
        <div class="detail-row"><span class="detail-label">Date & Time</span><span class="detail-value">${obs.date || ''} ${obs.time || ''}</span></div>
        <div class="detail-row"><span class="detail-label">Area</span><span class="detail-value">${obs.area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${obs.location || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="detail-status-badge ${statusClass}">${obs.status}</span></span></div>
        <div class="detail-row"><span class="detail-label">Risk Level</span><span class="detail-value"><span class="detail-status-badge ${riskClass}">${obs.risk_level || '-'}</span></span></div>
        <div class="detail-row"><span class="detail-label">Observation Class</span><span class="detail-value"><span class="detail-status-badge ${classClass}">${obs.observation_class || '-'}</span></span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-clipboard-list"></i> Observation Details</div>
        <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${obs.observation_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Activity Type</span><span class="detail-value">${obs.activity_type || '-'}</span></div>
        <div class="detail-full-row"><span class="detail-label">Description</span><div class="detail-value">${obs.description || '-'}</div></div>
        <div class="detail-row"><span class="detail-label">Direct Cause</span><span class="detail-value">${obs.direct_cause || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Root Cause</span><span class="detail-value">${obs.root_cause || '-'}</span></div>
        <div class="detail-full-row"><span class="detail-label">Immediate Action</span><div class="detail-value">${obs.immediate_action || '-'}</div></div>
        <div class="detail-full-row"><span class="detail-label">Corrective Action</span><div class="detail-value">${obs.corrective_action || '-'}</div></div>
      </div>`;
    
    html += `
      <div class="detail-section corrective-action-section">
        <div class="detail-section-title"><i class="fas fa-tasks"></i> Corrective Action Tracking</div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="ca-status-badge ${caStatusClass}">${caStatus}</span></span></div>
        <div class="detail-row"><span class="detail-label">Due Date</span><span class="detail-value">${obs.corrective_action_due_date || 'Not set'}</span></div>
        <div class="detail-row"><span class="detail-label">Assigned To</span><span class="detail-value">${obs.corrective_action_assigned_to || 'Not assigned'}</span></div>
        ${currentUser && obs.status === 'Open' ? `
        <div class="ca-actions">
          <button class="ca-btn ca-btn-notstarted ${caStatus === 'Not Started' ? 'active' : ''}" onclick="updateCorrectiveAction(${id}, 'Not Started')">Not Started</button>
          <button class="ca-btn ca-btn-inprogress ${caStatus === 'In Progress' ? 'active' : ''}" onclick="updateCorrectiveAction(${id}, 'In Progress')">In Progress</button>
          <button class="ca-btn ca-btn-completed ${caStatus === 'Completed' ? 'active' : ''}" onclick="updateCorrectiveAction(${id}, 'Completed')">Completed</button>
        </div>
        <div class="ca-update-form">
          <input type="date" id="caDueDate" value="${obs.corrective_action_due_date || ''}" placeholder="Due Date"/>
          <input type="text" id="caAssignedTo" value="${obs.corrective_action_assigned_to || ''}" placeholder="Assigned To"/>
          <button class="ca-save-btn" onclick="saveCorrectiveActionDetails(${id})"><i class="fas fa-save"></i> Save</button>
        </div>` : ''}
      </div>`;
    
    if (obs.injury_type || obs.injury_body_part) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-first-aid"></i> Injury Information</div>
        <div class="detail-row"><span class="detail-label">Injury Type</span><span class="detail-value">${obs.injury_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Body Part</span><span class="detail-value">${obs.injury_body_part || '-'}</span></div>
      </div>`;
    }
    
    html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-user"></i> Reporting</div>
        <div class="detail-row"><span class="detail-label">Reported By</span><span class="detail-value">${obs.reported_by || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Employee ID</span><span class="detail-value">${obs.reported_by_id || '-'}</span></div>
      </div>`;
    
    if (evidenceUrls.length > 0 && closeEvidenceUrls.length > 0) {
      html += `
      <div class="detail-section before-after-section">
        <div class="detail-section-title"><i class="fas fa-exchange-alt"></i> Before / After Comparison</div>
        <div class="before-after-container">
          <div class="before-after-column">
            <div class="before-after-label"><i class="fas fa-camera"></i> BEFORE</div>
            <div class="before-after-images">${evidenceUrls.map(url => `<img src="${url}" onclick="window.open('${url}', '_blank')" alt="Before"/>`).join('')}</div>
          </div>
          <div class="before-after-divider"><i class="fas fa-arrow-right"></i></div>
          <div class="before-after-column">
            <div class="before-after-label"><i class="fas fa-check-circle"></i> AFTER</div>
            <div class="before-after-images">${closeEvidenceUrls.map(url => `<img src="${url}" onclick="window.open('${url}', '_blank')" alt="After"/>`).join('')}</div>
          </div>
        </div>
      </div>`;
    } else {
      if (evidenceUrls.length > 0) {
        html += `
        <div class="detail-section">
          <div class="detail-section-title"><i class="fas fa-camera"></i> Before Photos (Initial Evidence)</div>
          <div class="detail-images">${evidenceUrls.map(url => `<img src="${url}" onclick="window.open('${url}', '_blank')" alt="Evidence"/>`).join('')}</div>
        </div>`;
      }
      
      if (closeEvidenceUrls.length > 0) {
        html += `
        <div class="detail-section">
          <div class="detail-section-title"><i class="fas fa-check-circle"></i> After Photos (Closure Evidence)</div>
          <div class="detail-images">${closeEvidenceUrls.map(url => `<img src="${url}" onclick="window.open('${url}', '_blank')" alt="Closure Evidence"/>`).join('')}</div>
        </div>`;
      }
    }
    
    if (obs.status === 'Closed') {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-check-circle"></i> Closure Information</div>
        <div class="detail-row"><span class="detail-label">Closed By</span><span class="detail-value">${obs.closed_by || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Closed Date</span><span class="detail-value">${obs.closed_date || '-'}</span></div>
        <div class="detail-full-row"><span class="detail-label">Closure Notes</span><div class="detail-value">${obs.closed_notes || '-'}</div></div>
      </div>`;
    }
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-eye"></i> Observation #' + obs.id;
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };
  
  window.updateCorrectiveAction = async function(id, status) {
    const result = await apiCall(`/observations/${id}/corrective-action`, {
      method: 'PUT',
      body: JSON.stringify({ corrective_action_status: status })
    });
    if (result) {
      viewObservation(id);
    }
  };
  
  window.saveCorrectiveActionDetails = async function(id) {
    const dueDate = $('#caDueDate')?.value || null;
    const assignedTo = $('#caAssignedTo')?.value || null;
    const result = await apiCall(`/observations/${id}/corrective-action`, {
      method: 'PUT',
      body: JSON.stringify({ 
        corrective_action_due_date: dueDate,
        corrective_action_assigned_to: assignedTo
      })
    });
    if (result) {
      viewObservation(id);
    }
  };

  window.viewPermit = async function(id) {
    const permit = await apiCall(`/permits/${id}`);
    if (!permit) return;
    
    let evidenceUrls = [];
    try { evidenceUrls = JSON.parse(permit.evidence_urls || '[]'); } catch (e) {}
    
    const statusClass = permit.status === 'Active' ? 'detail-status-open' : 'detail-status-closed';
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-clipboard-check"></i> Permit Information</div>
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${permit.date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Permit Number</span><span class="detail-value">${permit.permit_number || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Permit Type</span><span class="detail-value">${permit.permit_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="detail-status-badge ${statusClass}">${permit.status}</span></span></div>
        <div class="detail-row"><span class="detail-label">Area</span><span class="detail-value">${permit.area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Project</span><span class="detail-value">${permit.project || '-'}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-users"></i> Personnel</div>
        <div class="detail-row"><span class="detail-label">Receiver</span><span class="detail-value">${permit.receiver || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Issuer</span><span class="detail-value">${permit.issuer || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Created By</span><span class="detail-value">${permit.created_by || '-'}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-file-alt"></i> Description</div>
        <div class="detail-full-row"><div class="detail-value">${permit.description || 'No description provided'}</div></div>
      </div>`;
    
    if (evidenceUrls.length > 0) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-camera"></i> Evidence Photos</div>
        <div class="detail-images">${evidenceUrls.map(url => `<img src="${url}" onclick="window.open('${url}', '_blank')" alt="Evidence"/>`).join('')}</div>
      </div>`;
    }
    
    if (permit.status === 'Closed') {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-check-circle"></i> Closure Information</div>
        <div class="detail-row"><span class="detail-label">Closed By</span><span class="detail-value">${permit.closed_by || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Closed Date</span><span class="detail-value">${permit.closed_date || '-'}</span></div>
        <div class="detail-full-row"><span class="detail-label">Closure Notes</span><div class="detail-value">${permit.closed_notes || '-'}</div></div>
      </div>`;
    }
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-clipboard-check"></i> Permit #' + permit.id;
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };

  window.viewEquipment = async function(id) {
    const eq = await apiCall(`/equipment/${id}`);
    if (!eq) return;
    
    const statusClass = eq.status === 'In Service' ? 'detail-status-open' : 'detail-status-closed';
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-truck"></i> Equipment Information</div>
        <div class="detail-row"><span class="detail-label">Asset Number</span><span class="detail-value">${eq.asset_number || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Equipment Type</span><span class="detail-value">${eq.equipment_type || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Owner</span><span class="detail-value">${eq.owner || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Yard/Area</span><span class="detail-value">${eq.yard_area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="detail-status-badge ${statusClass}">${eq.status}</span></span></div>
        <div class="detail-row"><span class="detail-label">PWAS Required</span><span class="detail-value">${eq.pwas_required || '-'}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-calendar-alt"></i> Inspection Dates</div>
        <div class="detail-row"><span class="detail-label">TPS Date</span><span class="detail-value">${eq.tps_date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">TPS Expiry</span><span class="detail-value">${eq.tps_expiry || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">INS Date</span><span class="detail-value">${eq.ins_date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">INS Expiry</span><span class="detail-value">${eq.ins_expiry || '-'}</span></div>
      </div>
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-user"></i> Operator Information</div>
        <div class="detail-row"><span class="detail-label">Operator Name</span><span class="detail-value">${eq.operator_name || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Operator License</span><span class="detail-value">${eq.operator_license || '-'}</span></div>
      </div>`;
    
    if (eq.notes) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-sticky-note"></i> Notes</div>
        <div class="detail-full-row"><div class="detail-value">${eq.notes}</div></div>
      </div>`;
    }
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-truck"></i> Equipment: ' + (eq.asset_number || eq.equipment_type || '#' + eq.id);
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };

  window.viewTbt = async function(id) {
    const tbt = await apiCall(`/toolbox-talks/${id}`);
    if (!tbt) return;
    
    let evidenceUrls = [];
    try { evidenceUrls = JSON.parse(tbt.evidence_urls || '[]'); } catch (e) {}
    
    let html = `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-chalkboard-teacher"></i> Toolbox Talk Information</div>
        <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${tbt.date || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Topic</span><span class="detail-value">${tbt.topic || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Presenter</span><span class="detail-value">${tbt.presenter || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Area</span><span class="detail-value">${tbt.area || '-'}</span></div>
        <div class="detail-row"><span class="detail-label">Attendance</span><span class="detail-value">${tbt.attendance || 0} attendees</span></div>
        <div class="detail-row"><span class="detail-label">Created By</span><span class="detail-value">${tbt.created_by || '-'}</span></div>
      </div>`;
    
    if (tbt.description) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-file-alt"></i> Description</div>
        <div class="detail-full-row"><div class="detail-value">${tbt.description}</div></div>
      </div>`;
    }
    
    if (evidenceUrls.length > 0) {
      html += `
      <div class="detail-section">
        <div class="detail-section-title"><i class="fas fa-camera"></i> Evidence Photos</div>
        <div class="detail-images">${evidenceUrls.map(url => `<img src="${url}" onclick="window.open('${url}', '_blank')" alt="Evidence"/>`).join('')}</div>
      </div>`;
    }
    
    $('#viewDetailsTitle').innerHTML = '<i class="fas fa-chalkboard-teacher"></i> Toolbox Talk #' + tbt.id;
    $('#viewDetailsContent').innerHTML = html;
    openModal('viewDetailsModal');
  };

  window.printDetails = function() {
    window.print();
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
      return `<div class="obs-card" onclick="viewPermit(${p.id})"><div class="obs-card-header"><span class="obs-card-title">${p.area || 'Unknown'}</span><span class="badge ${typeClass}">${p.permit_type || 'General'}</span></div><div class="obs-card-date">${p.date}</div><div class="obs-description">${p.description || p.project || ''}</div><div class="obs-chip-row">${p.receiver ? `<span class="obs-chip">Receiver: ${p.receiver}</span>` : ''}${p.permit_number ? `<span class="obs-chip">#${p.permit_number}</span>` : ''}</div></div>`;
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
      return `<div class="obs-card" onclick="viewEquipment(${e.id})"><div class="obs-card-header"><span class="obs-card-title">${e.equipment_type || 'Equipment'}</span><span class="status-pill ${statusClass}">${e.status}</span></div><div class="obs-card-date">Asset: ${e.asset_number || 'N/A'}</div><div class="obs-chip-row"><span class="obs-chip">${e.yard_area || 'Unknown'}</span>${e.pwas_required ? `<span class="obs-chip">PWAS: ${e.pwas_required}</span>` : ''}</div></div>`;
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
    list.innerHTML = talks.map(t => `<div class="obs-card" onclick="viewTbt(${t.id})"><div class="obs-card-header"><span class="obs-card-title">${t.topic || 'TBT'}</span><span class="badge badge-low">${t.attendance || 0} attendees</span></div><div class="obs-card-date">${t.date} - ${t.presenter || 'Unknown'}</div><div class="obs-chip-row"><span class="obs-chip">${t.area || 'General'}</span></div></div>`).join('');
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
    
    const completions = await apiCall('/challenges/my-completions');
    const completedIds = completions ? completions.map(c => c.challenge_id) : [];
    
    list.innerHTML = challenges.map(c => {
      const badgeHtml = c.badge_reward ? `<span class="challenge-badge"><i class="fas ${getBadgeIcon(c.badge_reward)}"></i> ${c.badge_reward}</span>` : '';
      const isCompleted = completedIds.includes(c.id);
      const actionHtml = isCompleted 
        ? '<span class="challenge-completed"><i class="fas fa-check-circle"></i> Completed</span>'
        : `<button class="challenge-complete-btn" onclick="completeChallenge(${c.id})"><i class="fas fa-check"></i> Complete</button>`;
      return `<div class="challenge-card">
        <div class="challenge-info">
          <h4>${c.title}</h4>
          <p>${c.description || ''}</p>
          ${badgeHtml}
          ${actionHtml}
        </div>
        <span class="challenge-points">${c.points} pts</span>
      </div>`;
    }).join('');
  }

  async function completeChallenge(challengeId) {
    if (!authToken) {
      alert('Please login to complete challenges');
      return;
    }
    const result = await apiCall(`/challenges/${challengeId}/complete`, { method: 'POST', body: JSON.stringify({}) });
    if (result && result.success) {
      await updateUserPoints();
      updateHeaderBadge();
      loadSettingsData();
      loadChallenges();
      
      let message = `Challenge completed! You earned ${result.points_earned} points.`;
      if (result.badge_earned) {
        message += `\n\nYou also earned a new badge: ${result.badge_earned}!`;
      }
      alert(message);
    } else if (result && result.error) {
      alert(result.error);
    }
  }
  window.completeChallenge = completeChallenge;

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

  async function loadAreasDropdown() {
    const areas = await apiCall('/areas');
    const sel = $('#obsAreaSelect');
    if (sel && areas) {
      sel.innerHTML = '<option value="">-- Select Area --</option>';
      areas.forEach(a => sel.innerHTML += `<option value="${a}">${a}</option>`);
    }
  }

  function showAddAreaInput() {
    $('#addAreaInput').style.display = 'flex';
    $('#newAreaName').focus();
  }
  window.showAddAreaInput = showAddAreaInput;

  function hideAddAreaInput() {
    $('#addAreaInput').style.display = 'none';
    $('#newAreaName').value = '';
  }
  window.hideAddAreaInput = hideAddAreaInput;

  async function addNewArea() {
    const name = $('#newAreaName').value.trim();
    if (!name) return;
    const result = await apiCall('/areas', { method: 'POST', body: JSON.stringify({ name }) });
    if (result && result.success) {
      await loadAreasDropdown();
      $('#obsAreaSelect').value = name;
      hideAddAreaInput();
    }
  }
  window.addNewArea = addNewArea;

  function setObservationClass(cls) {
    $('#obsClass').value = cls;
    if (cls === 'Positive') {
      $('#btnPositive').classList.add('active');
      $('#btnNegative').classList.remove('active');
      $('#injurySection').style.display = 'none';
    } else {
      $('#btnNegative').classList.add('active');
      $('#btnPositive').classList.remove('active');
      const obsType = $('#obsType')?.value || '';
      const showInjury = ['Near Miss', 'Unsafe Act', 'Unsafe Condition'].includes(obsType);
      $('#injurySection').style.display = showInjury ? 'block' : 'none';
    }
  }
  window.setObservationClass = setObservationClass;

  $('#obsType')?.addEventListener('change', function() {
    const val = this.value;
    const obsClass = $('#obsClass').value;
    const showInjury = obsClass === 'Negative' && ['Near Miss', 'Unsafe Act', 'Unsafe Condition'].includes(val);
    $('#injurySection').style.display = showInjury ? 'block' : 'none';
  });

  function resetObservationForm() {
    $('#obsClass').value = 'Negative';
    $('#btnNegative').classList.add('active');
    $('#btnPositive').classList.remove('active');
    $('#injurySection').style.display = 'none';
    $('#addAreaInput').style.display = 'none';
    $('#newAreaName').value = '';
  }

  const origOpenModal = window.openModal;
  window.openModal = function(id) {
    if (id === 'addObservationModal') {
      resetObservationForm();
    }
    origOpenModal(id);
  };

  $('#addObservationForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const evidenceUrls = await uploadPhotos($('#obsPhotos'));
    const data = {
      date: $('#obsDate').value,
      time: $('#obsTime').value,
      area: $('#obsAreaSelect').value,
      location: $('#obsLocation').value,
      observation_type: $('#obsType').value,
      description: $('#obsDescription').value,
      direct_cause: $('#obsDirectCause').value,
      root_cause: $('#obsRootCause').value,
      immediate_action: $('#obsImmediateAction').value,
      corrective_action: $('#obsCorrectiveAction').value,
      risk_level: $('#obsRiskLevel').value,
      evidence_urls: evidenceUrls,
      activity_type: $('#obsActivityType').value,
      observation_class: $('#obsClass').value,
      injury_type: $('#obsInjuryType')?.value || '',
      injury_body_part: $('#obsInjuryBodyPart')?.value || ''
    };
    const result = await apiCall('/observations', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addObservationModal');
      e.target.reset();
      $('#obsClass').value = 'Negative';
      $('#btnNegative').classList.add('active');
      $('#btnPositive').classList.remove('active');
      $('#injurySection').style.display = 'none';
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

  $('#addChallengeForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      title: $('#challengeTitle').value,
      description: $('#challengeDescription').value,
      points: parseInt($('#challengePoints').value) || 10,
      badge_reward: $('#challengeBadgeReward').value || null,
      challenge_date: $('#challengeDate').value || null
    };
    const result = await apiCall('/challenges', { method: 'POST', body: JSON.stringify(data) });
    if (result) {
      closeModal('addChallengeModal');
      e.target.reset();
      loadChallenges();
      if (typeof loadAdminChallenges === 'function') loadAdminChallenges();
      alert('Challenge created successfully!');
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
    updateHeaderBadge();
    if (currentUser?.role === 'admin') {
      $('#adminMenuBtn').style.display = 'block';
    }
    loadSettingsData();
  }

  function updateHeaderBadge() {
    const badgeEl = $('#headerBadge');
    if (!badgeEl) return;
    
    if (currentUser?.badges) {
      let badges = [];
      try { badges = JSON.parse(currentUser.badges); } catch(e) {}
      if (badges.length > 0) {
        const topBadge = badges[0];
        badgeEl.innerHTML = `<i class="fas ${getBadgeIcon(topBadge)}"></i>`;
        badgeEl.title = topBadge;
        badgeEl.style.display = 'flex';
        return;
      }
    }
    badgeEl.style.display = 'none';
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    $('#pointsDisplay').style.display = 'none';
    $('#headerBadge').style.display = 'none';
    $('#adminMenuBtn').style.display = 'none';
    openModal('loginModal');
    openTab(null, 'HomeTab');
  }
  window.logout = logout;

  function loadSettingsData() {
    if (!currentUser) return;
    
    $('#settingsUserName').textContent = currentUser.name || 'User';
    $('#settingsEmployeeId').textContent = 'ID: ' + (currentUser.employee_id || '-');
    $('#settingsUserRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Safety Observer';
    $('#settingsPoints').textContent = currentUser.points || 0;
    $('#settingsLevel').textContent = currentUser.level || Math.floor((currentUser.points || 0) / 100) + 1;
    
    if (currentUser.profile_picture) {
      $('#settingsProfilePic').src = currentUser.profile_picture;
    } else {
      $('#settingsProfilePic').src = 'img/default-avatar.svg';
    }
    
    const badgesContainer = $('#settingsBadges');
    if (currentUser.badges) {
      let badges = [];
      try { badges = JSON.parse(currentUser.badges); } catch(e) {}
      if (badges.length > 0) {
        badgesContainer.innerHTML = badges.map(b => `
          <div class="badge-item">
            <i class="fas ${getBadgeIcon(b)}"></i>
            <span>${b}</span>
          </div>
        `).join('');
      } else {
        badgesContainer.innerHTML = '<div class="no-badges">No badges earned yet. Keep up the good work!</div>';
      }
    } else {
      badgesContainer.innerHTML = '<div class="no-badges">No badges earned yet. Keep up the good work!</div>';
    }
    
    updateDarkModeToggle();
  }
  window.loadSettingsData = loadSettingsData;

  function getBadgeIcon(badgeName) {
    const icons = {
      'First Observer': 'fa-eye',
      'Safety Champion': 'fa-shield-alt',
      'Top Performer': 'fa-trophy',
      'Team Player': 'fa-users',
      'Quick Responder': 'fa-bolt',
      'Mentor': 'fa-chalkboard-teacher',
      'Risk Spotter': 'fa-exclamation-triangle',
      'Safety Star': 'fa-star'
    };
    return icons[badgeName] || 'fa-medal';
  }

  function updateDarkModeToggle() {
    const toggle = $('#darkModeToggle');
    if (toggle) {
      const isDark = document.body.classList.contains('dark-mode');
      toggle.classList.toggle('active', isDark);
    }
  }

  function toggleDarkModeSettings() {
    const isDark = document.body.classList.contains('dark-mode');
    applyDarkMode(!isDark);
    updateDarkModeToggle();
  }
  window.toggleDarkModeSettings = toggleDarkModeSettings;

  async function uploadProfilePicture(input) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    const reader = new FileReader();
    
    reader.onload = async function(e) {
      const base64 = e.target.result;
      
      try {
        const result = await apiCall('/users/profile-picture', {
          method: 'PUT',
          body: JSON.stringify({ profile_picture: base64 })
        });
        
        if (result?.success) {
          currentUser.profile_picture = base64;
          $('#settingsProfilePic').src = base64;
        }
      } catch (err) {
        console.error('Failed to upload profile picture:', err);
      }
    };
    
    reader.readAsDataURL(file);
  }
  window.uploadProfilePicture = uploadProfilePicture;

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
      if (result.pending) {
        $('#loginError').innerHTML = '<span style="color:#b45309"><i class="fas fa-clock"></i> ' + result.error + '</span>';
      } else if (result.error) {
        $('#loginError').textContent = result.error;
        $('#loginError').style.color = '#dc2626';
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
        $('#registerError').style.color = '#dc2626';
      } else if (result.pending) {
        $('#registerError').innerHTML = '<span style="color:#059669">&#10003; ' + result.message + '</span>';
        $('#regEmployeeId').value = '';
        $('#regName').value = '';
        $('#regPassword').value = '';
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

  async function loadPendingUsers() {
    const container = $('#adminContent');
    container.innerHTML = '<p>Loading pending registrations...</p>';
    const users = await apiCall('/users/pending');
    if (!users || !Array.isArray(users) || users.length === 0) {
      container.innerHTML = '<div class="no-data">No pending registrations</div>';
      return;
    }
    let html = '<h3><i class="fas fa-user-clock"></i> Pending Approvals</h3><div class="admin-list">';
    users.forEach(u => {
      html += `<div class="admin-user-item" id="pending-${u.id}">
        <div class="user-info">
          <strong>${u.name}</strong>
          <span class="user-id">${u.employee_id}</span>
          <span class="user-date">${new Date(u.created_at).toLocaleDateString()}</span>
        </div>
        <div class="user-actions">
          <button class="btn btn-success btn-sm" onclick="approveUser(${u.id})"><i class="fas fa-check"></i> Approve</button>
          <button class="btn btn-danger btn-sm" onclick="rejectUser(${u.id})"><i class="fas fa-times"></i> Reject</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }
  window.loadPendingUsers = loadPendingUsers;

  async function approveUser(userId) {
    const result = await apiCall(`/users/${userId}/approve`, { method: 'PUT' });
    if (result?.success) {
      const el = document.getElementById(`pending-${userId}`);
      if (el) el.remove();
      const remaining = document.querySelectorAll('.admin-user-item').length;
      if (remaining === 0) {
        $('#adminContent').innerHTML = '<div class="no-data">No pending registrations</div>';
      }
      updatePendingCount();
    }
  }
  window.approveUser = approveUser;

  async function rejectUser(userId) {
    if (!confirm('Are you sure you want to reject this registration? This will delete the user.')) return;
    const result = await apiCall(`/users/${userId}/reject`, { method: 'PUT' });
    if (result?.success) {
      const el = document.getElementById(`pending-${userId}`);
      if (el) el.remove();
      const remaining = document.querySelectorAll('.admin-user-item').length;
      if (remaining === 0) {
        $('#adminContent').innerHTML = '<div class="no-data">No pending registrations</div>';
      }
      updatePendingCount();
    }
  }
  window.rejectUser = rejectUser;

  async function updatePendingCount() {
    if (currentUser?.role !== 'admin') return;
    const users = await apiCall('/users/pending');
    const count = Array.isArray(users) ? users.length : 0;
    const badge = $('#pendingCount');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  }

  async function loadAdminUsers() {
    const container = $('#adminContent');
    container.innerHTML = '<p>Loading users...</p>';
    const users = await apiCall('/users');
    if (!users || !Array.isArray(users) || users.length === 0) {
      container.innerHTML = '<div class="no-data">No users found</div>';
      return;
    }
    let html = '<h3><i class="fas fa-users"></i> All Users</h3><div class="admin-list">';
    users.forEach(u => {
      const approvedText = u.approved ? '<span class="badge badge-success">Approved</span>' : '<span class="badge badge-warning">Pending</span>';
      html += `<div class="admin-user-item">
        <div class="user-info">
          <strong>${u.name}</strong>
          <span class="user-id">${u.employee_id}</span>
          <span class="user-role badge badge-${u.role === 'admin' ? 'primary' : 'secondary'}">${u.role}</span>
          ${approvedText}
          <span class="user-points">${u.points} pts</span>
        </div>
        <div class="user-actions">
          <button class="btn btn-sm" onclick="adjustUserPoints(${u.id}, '${u.name}')"><i class="fas fa-star"></i> Points</button>
          ${u.role !== 'admin' ? `<button class="btn btn-sm" onclick="toggleUserRole(${u.id}, '${u.role}')"><i class="fas fa-user-shield"></i> Toggle Admin</button>` : ''}
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }
  window.loadAdminUsers = loadAdminUsers;

  async function adjustUserPoints(userId, userName) {
    const points = prompt(`Adjust points for ${userName} (use negative to deduct):`);
    if (points === null) return;
    const reason = prompt('Reason for adjustment:') || 'Admin adjustment';
    await apiCall(`/users/${userId}/points`, {
      method: 'PUT',
      body: JSON.stringify({ points: parseInt(points), reason })
    });
    loadAdminUsers();
  }
  window.adjustUserPoints = adjustUserPoints;

  async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await apiCall(`/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    loadAdminUsers();
  }
  window.toggleUserRole = toggleUserRole;

  async function loadAdminChallenges() {
    const container = $('#adminContent');
    container.innerHTML = '<h3><i class="fas fa-tasks"></i> Manage Challenges</h3><button class="btn btn-primary" onclick="openModal(\'addChallengeModal\')"><i class="fas fa-plus"></i> Add Challenge</button><div id="adminChallengesList" style="margin-top:1rem;">Loading...</div>';
    const challenges = await apiCall('/challenges');
    const list = document.getElementById('adminChallengesList');
    if (!challenges || !Array.isArray(challenges) || challenges.length === 0) {
      list.innerHTML = '<div class="no-data">No active challenges. Click "Add Challenge" to create one.</div>';
      return;
    }
    let html = '<div class="admin-list">';
    challenges.forEach(c => {
      const badgeHtml = c.badge_reward ? `<span class="challenge-badge-admin"><i class="fas ${getBadgeIcon(c.badge_reward)}"></i> ${c.badge_reward}</span>` : '<span class="no-badge">No badge</span>';
      html += `<div class="admin-challenge-item">
        <div class="challenge-main-info">
          <strong>${c.title}</strong>
          <p style="margin:.25rem 0;font-size:.85rem;color:var(--text-soft)">${c.description || 'No description'}</p>
        </div>
        <div class="challenge-meta">
          <span class="user-points">${c.points} pts</span>
          ${badgeHtml}
          <span class="user-date">${c.challenge_date || 'Any day'}</span>
        </div>
      </div>`;
    });
    html += '</div>';
    list.innerHTML = html;
  }
  window.loadAdminChallenges = loadAdminChallenges;

  async function importHistoricalObservations() {
    if (!confirm('This will import historical observations from the Google Sheets CSV. Duplicate records will be skipped. Continue?')) return;
    const container = $('#adminContent');
    container.innerHTML = '<h3><i class="fas fa-file-import"></i> Importing Historical Data...</h3><div class="import-progress"><i class="fas fa-spinner fa-spin"></i> Please wait, fetching and importing data from Google Sheets...</div>';
    try {
      const result = await apiCall('/import-observations', { method: 'POST', body: JSON.stringify({}) });
      if (result && result.success) {
        let errorsHtml = '';
        if (result.errors && result.errors.length > 0) {
          errorsHtml = '<div class="import-errors"><h4 style="color:#dc2626;margin:.5rem 0">Row Errors:</h4>';
          result.errors.forEach(e => {
            errorsHtml += `<div class="import-error-item">Code ${e.code}: ${e.error}</div>`;
          });
          errorsHtml += '</div>';
        }
        container.innerHTML = `<h3><i class="fas fa-check-circle" style="color:#22c55e"></i> Import Complete</h3>
          <div class="import-result">
            <div class="import-stat"><strong>${result.imported}</strong> observations imported</div>
            <div class="import-stat"><strong>${result.skipped}</strong> records skipped (duplicates or empty)</div>
            <div class="import-stat"><strong>${result.total}</strong> total records in CSV</div>
          </div>
          ${errorsHtml}
          <button class="btn btn-primary" onclick="loadObservations();openTab(null,'ObservationsTab')"><i class="fas fa-eye"></i> View Observations</button>`;
        loadStats();
        loadAreas();
        loadAreasDropdown();
        loadObservations();
      } else {
        container.innerHTML = `<h3><i class="fas fa-exclamation-triangle" style="color:#dc2626"></i> Import Failed</h3><p>${result?.error || 'Unknown error occurred'}</p>`;
      }
    } catch (err) {
      container.innerHTML = `<h3><i class="fas fa-exclamation-triangle" style="color:#dc2626"></i> Import Failed</h3><p>${err.message}</p>`;
    }
  }
  window.importHistoricalObservations = importHistoricalObservations;

  let areasChartInstance = null;
  async function loadAreasChart() {
    try {
      const data = await apiCall('/observations/by-area');
      const canvas = document.getElementById('areasChart');
      const noDataEl = $('#areasChartNoData');
      
      if (!canvas) return;
      
      if (!data || data.length === 0) {
        canvas.style.display = 'none';
        if (noDataEl) noDataEl.style.display = 'block';
        return;
      }
      
      canvas.style.display = 'block';
      if (noDataEl) noDataEl.style.display = 'none';
      
      const labels = data.map(d => d.area);
      const values = data.map(d => d.count);
      const colors = ['#22c55e', '#0ea5e9', '#f97316', '#8b5cf6', '#ef4444'];
      
      if (areasChartInstance) {
        areasChartInstance.destroy();
      }
      
      areasChartInstance = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: values,
            backgroundColor: colors.slice(0, data.length),
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                padding: 12,
                usePointStyle: true,
                font: { size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.raw / total) * 100).toFixed(1);
                  return `${context.label}: ${context.raw} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Error loading areas chart:', err);
    }
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
        if (user.role === 'admin') {
          updatePendingCount();
        }
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
    loadAreasChart();
    refreshWeather();
    loadAreas();
    loadAreasDropdown();
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
