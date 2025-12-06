let currentUser = null;
let authToken = null;

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  checkAuth();
});

function checkAuth() {
  authToken = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  
  if (authToken && userData) {
    currentUser = JSON.parse(userData);
    showApp();
    loadData();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('registerScreen').style.display = 'none';
  document.getElementById('appContent').style.display = 'none';
  document.getElementById('bottomNav').style.display = 'none';
  document.getElementById('logoutBtn').style.display = 'none';
  document.getElementById('pointsDisplay').style.display = 'none';
}

function showRegister() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('registerScreen').style.display = 'flex';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('registerScreen').style.display = 'none';
  document.getElementById('appContent').style.display = 'block';
  document.getElementById('bottomNav').style.display = 'flex';
  document.getElementById('logoutBtn').style.display = 'flex';
  document.getElementById('pointsDisplay').style.display = 'flex';
  
  document.getElementById('userPoints').textContent = currentUser.points || 0;
  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmployeeId').textContent = currentUser.employee_id;
  document.getElementById('settingsPoints').textContent = currentUser.points || 0;
  document.getElementById('userLevel').textContent = currentUser.level || 'Bronze';
  
  if (currentUser.role === 'admin') {
    document.getElementById('adminSection').style.display = 'flex';
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const employee_id = document.getElementById('loginEmployeeId').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    showApp();
    loadData();
    showToast('Welcome back, ' + currentUser.name + '!');
  } catch (err) {
    showToast(err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const employee_id = document.getElementById('regEmployeeId').value;
  const password = document.getElementById('regPassword').value;
  
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, employee_id, password })
    });
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    showApp();
    loadData();
    showToast('Welcome, ' + currentUser.name + '!');
  } catch (err) {
    showToast(err.message);
  }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  authToken = null;
  currentUser = null;
  showLogin();
  showToast('Logged out successfully');
}

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`
  };
}

async function loadData() {
  await Promise.all([loadStats(), loadObservations(), loadPermits(), loadEquipment()]);
  loadRecentActivity();
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats', { headers: apiHeaders() });
    const stats = await res.json();
    document.getElementById('statObservations').textContent = stats.observations;
    document.getElementById('statPermits').textContent = stats.permits;
    document.getElementById('statEquipment').textContent = stats.equipment;
    document.getElementById('statUsers').textContent = stats.users;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

let observations = [];
let permits = [];
let equipment = [];

async function loadObservations() {
  try {
    const res = await fetch('/api/observations', { headers: apiHeaders() });
    observations = await res.json();
    renderObservations();
  } catch (err) {
    console.error('Failed to load observations:', err);
  }
}

function renderObservations() {
  const list = document.getElementById('observationsList');
  if (observations.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">No observations yet</p>';
    return;
  }
  
  list.innerHTML = observations.map(o => `
    <div class="item-card">
      <div class="item-header">
        <span class="item-title">${escapeHtml(o.area)}</span>
        <span class="item-badge badge-${o.risk_level}">${o.risk_level.toUpperCase()}</span>
      </div>
      <div class="item-desc">${escapeHtml(o.description)}</div>
      <div class="item-meta">
        <span><i class="fas fa-user"></i> ${o.observer_name || 'Unknown'}</span>
        <span><i class="fas fa-clock"></i> ${formatDate(o.created_at)}</span>
      </div>
      ${renderEvidenceThumbs(o.evidence_urls)}
      ${canEdit(o.user_id) ? `
        <div class="item-actions">
          <button class="btn-edit" onclick="editObservation(${o.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-delete" onclick="deleteObservation(${o.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function loadPermits() {
  try {
    const res = await fetch('/api/permits', { headers: apiHeaders() });
    permits = await res.json();
    renderPermits();
  } catch (err) {
    console.error('Failed to load permits:', err);
  }
}

function renderPermits() {
  const list = document.getElementById('permitsList');
  if (permits.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">No permits yet</p>';
    return;
  }
  
  list.innerHTML = permits.map(p => `
    <div class="item-card">
      <div class="item-header">
        <span class="item-title">${escapeHtml(p.permit_type)}</span>
        <span class="item-badge badge-${p.status}">${p.status.toUpperCase()}</span>
      </div>
      <div class="item-desc">${escapeHtml(p.description)}</div>
      <div class="item-meta">
        <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(p.area)}</span>
        <span><i class="fas fa-clock"></i> ${formatDate(p.created_at)}</span>
      </div>
      ${canEdit(p.user_id) ? `
        <div class="item-actions">
          <button class="btn-edit" onclick="editPermit(${p.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-delete" onclick="deletePermit(${p.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function loadEquipment() {
  try {
    const res = await fetch('/api/equipment', { headers: apiHeaders() });
    equipment = await res.json();
    renderEquipment();
  } catch (err) {
    console.error('Failed to load equipment:', err);
  }
}

function renderEquipment() {
  const list = document.getElementById('equipmentList');
  if (equipment.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-secondary);">No equipment yet</p>';
    return;
  }
  
  list.innerHTML = equipment.map(e => `
    <div class="item-card">
      <div class="item-header">
        <span class="item-title">${escapeHtml(e.equipment_type)}</span>
        <span class="item-badge badge-${e.status === 'operational' ? 'low' : 'high'}">${e.status.toUpperCase()}</span>
      </div>
      <div class="item-desc">ID: ${escapeHtml(e.equipment_id || 'N/A')} | Location: ${escapeHtml(e.location || 'N/A')}</div>
      <div class="item-meta">
        <span><i class="fas fa-shield-alt"></i> PWAS: ${e.pwas_required}</span>
        <span><i class="fas fa-calendar"></i> Next Inspection: ${e.next_inspection || 'N/A'}</span>
      </div>
      ${canEdit(e.user_id) ? `
        <div class="item-actions">
          <button class="btn-edit" onclick="editEquipment(${e.id})"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn-delete" onclick="deleteEquipment(${e.id})"><i class="fas fa-trash"></i> Delete</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

function loadRecentActivity() {
  const recent = [...observations.slice(0, 2), ...permits.slice(0, 2)].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  ).slice(0, 3);
  
  const container = document.getElementById('recentActivity');
  if (recent.length === 0) {
    container.innerHTML = '<p style="color:var(--text-secondary);">No recent activity</p>';
    return;
  }
  
  container.innerHTML = recent.map(item => `
    <div class="item-card" style="margin-bottom:0.5rem;">
      <div class="item-header">
        <span class="item-title">${escapeHtml(item.area || item.permit_type)}</span>
        <span style="font-size:0.75rem;color:var(--text-secondary);">${formatDate(item.created_at)}</span>
      </div>
    </div>
  `).join('');
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  document.getElementById(tabName + 'Tab').classList.add('active');
  const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
  if (navItem) navItem.classList.add('active');
}

function showAddObservation() {
  openModal('Add Observation', `
    <form id="addObsForm" onsubmit="submitObservation(event)">
      <div class="form-group">
        <label>Area/Location</label>
        <input type="text" id="obsArea" required placeholder="e.g., Building A, Floor 2">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="obsDesc" rows="3" required placeholder="Describe the observation..."></textarea>
      </div>
      <div class="form-group">
        <label>Risk Level</label>
        <select id="obsRisk">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div class="form-group">
        <label>Cause</label>
        <input type="text" id="obsCause" placeholder="What caused this issue?">
      </div>
      <div class="form-group">
        <label>Corrective Action</label>
        <textarea id="obsAction" rows="2" placeholder="Recommended action..."></textarea>
      </div>
      <div class="form-group">
        <label>Photo Evidence</label>
        <div class="photo-upload" onclick="document.getElementById('obsPhotos').click()">
          <i class="fas fa-camera"></i>
          <p>Click to add photos</p>
        </div>
        <input type="file" id="obsPhotos" multiple accept="image/*" style="display:none" onchange="previewPhotos(this, 'obsPhotoPreview')">
        <div class="photo-preview" id="obsPhotoPreview"></div>
      </div>
      <button type="submit" class="btn btn-primary btn-full">Submit Observation (+10 pts)</button>
    </form>
  `);
}

async function submitObservation(e) {
  e.preventDefault();
  
  const photos = document.getElementById('obsPhotos').files;
  let evidence_urls = [];
  
  if (photos.length > 0) {
    const formData = new FormData();
    for (let i = 0; i < photos.length; i++) {
      formData.append('photos', photos[i]);
    }
    
    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const uploadData = await uploadRes.json();
      evidence_urls = uploadData.urls;
    } catch (err) {
      showToast('Failed to upload photos');
      return;
    }
  }
  
  try {
    const res = await fetch('/api/observations', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        area: document.getElementById('obsArea').value,
        description: document.getElementById('obsDesc').value,
        risk_level: document.getElementById('obsRisk').value,
        cause: document.getElementById('obsCause').value,
        corrective_action: document.getElementById('obsAction').value,
        evidence_urls
      })
    });
    
    if (!res.ok) throw new Error('Failed to add observation');
    
    closeModal();
    await loadData();
    updateUserPoints(10);
    showToast('Observation added! +10 points');
  } catch (err) {
    showToast(err.message);
  }
}

function showAddPermit() {
  openModal('Add Permit', `
    <form id="addPermitForm" onsubmit="submitPermit(event)">
      <div class="form-group">
        <label>Permit Type</label>
        <select id="permitType" required>
          <option value="">Select type...</option>
          <option value="Hot Work">Hot Work</option>
          <option value="Confined Space">Confined Space</option>
          <option value="Excavation">Excavation</option>
          <option value="Lifting">Lifting</option>
          <option value="Electrical">Electrical</option>
          <option value="Working at Height">Working at Height</option>
          <option value="Cold Work">Cold Work</option>
        </select>
      </div>
      <div class="form-group">
        <label>Area/Location</label>
        <input type="text" id="permitArea" required placeholder="e.g., Building A">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="permitDesc" rows="3" required placeholder="Describe the work..."></textarea>
      </div>
      <div class="form-group">
        <label>Valid From</label>
        <input type="date" id="permitFrom">
      </div>
      <div class="form-group">
        <label>Valid To</label>
        <input type="date" id="permitTo">
      </div>
      <button type="submit" class="btn btn-primary btn-full">Submit Permit (+8 pts)</button>
    </form>
  `);
}

async function submitPermit(e) {
  e.preventDefault();
  
  try {
    const res = await fetch('/api/permits', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        permit_type: document.getElementById('permitType').value,
        area: document.getElementById('permitArea').value,
        description: document.getElementById('permitDesc').value,
        valid_from: document.getElementById('permitFrom').value,
        valid_to: document.getElementById('permitTo').value
      })
    });
    
    if (!res.ok) throw new Error('Failed to add permit');
    
    closeModal();
    await loadData();
    updateUserPoints(8);
    showToast('Permit added! +8 points');
  } catch (err) {
    showToast(err.message);
  }
}

function showAddEquipment() {
  openModal('Add Equipment', `
    <form id="addEquipForm" onsubmit="submitEquipment(event)">
      <div class="form-group">
        <label>Equipment Type</label>
        <select id="equipType" required>
          <option value="">Select type...</option>
          <option value="Excavator">Excavator</option>
          <option value="Crane">Crane</option>
          <option value="Forklift">Forklift</option>
          <option value="Loader">Loader</option>
          <option value="Dump Truck">Dump Truck</option>
          <option value="Grader">Grader</option>
          <option value="Telehandler">Telehandler</option>
          <option value="Manlift">Manlift</option>
          <option value="Compactor">Compactor</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label>Equipment ID</label>
        <input type="text" id="equipId" required placeholder="e.g., EXC-001">
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" id="equipLocation" placeholder="Current location">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="equipStatus">
          <option value="operational">Operational</option>
          <option value="maintenance">Under Maintenance</option>
          <option value="out_of_service">Out of Service</option>
        </select>
      </div>
      <div class="form-group">
        <label>PWAS Required</label>
        <select id="equipPwas">
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>
      </div>
      <div class="form-group">
        <label>Last Inspection</label>
        <input type="date" id="equipLastInsp">
      </div>
      <div class="form-group">
        <label>Next Inspection</label>
        <input type="date" id="equipNextInsp">
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="equipNotes" rows="2" placeholder="Additional notes..."></textarea>
      </div>
      <button type="submit" class="btn btn-primary btn-full">Add Equipment (+5 pts)</button>
    </form>
  `);
}

async function submitEquipment(e) {
  e.preventDefault();
  
  try {
    const res = await fetch('/api/equipment', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({
        equipment_type: document.getElementById('equipType').value,
        equipment_id: document.getElementById('equipId').value,
        location: document.getElementById('equipLocation').value,
        status: document.getElementById('equipStatus').value,
        pwas_required: document.getElementById('equipPwas').value,
        last_inspection: document.getElementById('equipLastInsp').value,
        next_inspection: document.getElementById('equipNextInsp').value,
        notes: document.getElementById('equipNotes').value
      })
    });
    
    if (!res.ok) throw new Error('Failed to add equipment');
    
    closeModal();
    await loadData();
    updateUserPoints(5);
    showToast('Equipment added! +5 points');
  } catch (err) {
    showToast(err.message);
  }
}

function editObservation(id) {
  const obs = observations.find(o => o.id === id);
  if (!obs) return;
  
  openModal('Edit Observation', `
    <form onsubmit="updateObservation(event, ${id})">
      <div class="form-group">
        <label>Area/Location</label>
        <input type="text" id="editObsArea" value="${escapeHtml(obs.area)}" required>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="editObsDesc" rows="3" required>${escapeHtml(obs.description)}</textarea>
      </div>
      <div class="form-group">
        <label>Risk Level</label>
        <select id="editObsRisk">
          <option value="low" ${obs.risk_level === 'low' ? 'selected' : ''}>Low</option>
          <option value="medium" ${obs.risk_level === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="high" ${obs.risk_level === 'high' ? 'selected' : ''}>High</option>
        </select>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editObsStatus">
          <option value="open" ${obs.status === 'open' ? 'selected' : ''}>Open</option>
          <option value="in_progress" ${obs.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="closed" ${obs.status === 'closed' ? 'selected' : ''}>Closed</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary btn-full">Update Observation</button>
    </form>
  `);
}

async function updateObservation(e, id) {
  e.preventDefault();
  
  try {
    const res = await fetch(`/api/observations/${id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify({
        area: document.getElementById('editObsArea').value,
        description: document.getElementById('editObsDesc').value,
        risk_level: document.getElementById('editObsRisk').value,
        status: document.getElementById('editObsStatus').value
      })
    });
    
    if (!res.ok) throw new Error('Failed to update');
    
    closeModal();
    await loadData();
    showToast('Observation updated');
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteObservation(id) {
  if (!confirm('Delete this observation?')) return;
  
  try {
    const res = await fetch(`/api/observations/${id}`, {
      method: 'DELETE',
      headers: apiHeaders()
    });
    
    if (!res.ok) throw new Error('Failed to delete');
    
    await loadData();
    showToast('Observation deleted');
  } catch (err) {
    showToast(err.message);
  }
}

function editPermit(id) {
  const permit = permits.find(p => p.id === id);
  if (!permit) return;
  
  openModal('Edit Permit', `
    <form onsubmit="updatePermit(event, ${id})">
      <div class="form-group">
        <label>Permit Type</label>
        <input type="text" id="editPermitType" value="${escapeHtml(permit.permit_type)}" required>
      </div>
      <div class="form-group">
        <label>Area</label>
        <input type="text" id="editPermitArea" value="${escapeHtml(permit.area)}" required>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="editPermitDesc" rows="3" required>${escapeHtml(permit.description)}</textarea>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editPermitStatus">
          <option value="pending" ${permit.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="approved" ${permit.status === 'approved' ? 'selected' : ''}>Approved</option>
          <option value="expired" ${permit.status === 'expired' ? 'selected' : ''}>Expired</option>
          <option value="cancelled" ${permit.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary btn-full">Update Permit</button>
    </form>
  `);
}

async function updatePermit(e, id) {
  e.preventDefault();
  
  try {
    const res = await fetch(`/api/permits/${id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify({
        permit_type: document.getElementById('editPermitType').value,
        area: document.getElementById('editPermitArea').value,
        description: document.getElementById('editPermitDesc').value,
        status: document.getElementById('editPermitStatus').value
      })
    });
    
    if (!res.ok) throw new Error('Failed to update');
    
    closeModal();
    await loadData();
    showToast('Permit updated');
  } catch (err) {
    showToast(err.message);
  }
}

async function deletePermit(id) {
  if (!confirm('Delete this permit?')) return;
  
  try {
    const res = await fetch(`/api/permits/${id}`, {
      method: 'DELETE',
      headers: apiHeaders()
    });
    
    if (!res.ok) throw new Error('Failed to delete');
    
    await loadData();
    showToast('Permit deleted');
  } catch (err) {
    showToast(err.message);
  }
}

function editEquipment(id) {
  const eq = equipment.find(e => e.id === id);
  if (!eq) return;
  
  openModal('Edit Equipment', `
    <form onsubmit="updateEquipment(event, ${id})">
      <div class="form-group">
        <label>Equipment Type</label>
        <input type="text" id="editEquipType" value="${escapeHtml(eq.equipment_type)}" required>
      </div>
      <div class="form-group">
        <label>Equipment ID</label>
        <input type="text" id="editEquipId" value="${escapeHtml(eq.equipment_id || '')}">
      </div>
      <div class="form-group">
        <label>Location</label>
        <input type="text" id="editEquipLocation" value="${escapeHtml(eq.location || '')}">
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editEquipStatus">
          <option value="operational" ${eq.status === 'operational' ? 'selected' : ''}>Operational</option>
          <option value="maintenance" ${eq.status === 'maintenance' ? 'selected' : ''}>Under Maintenance</option>
          <option value="out_of_service" ${eq.status === 'out_of_service' ? 'selected' : ''}>Out of Service</option>
        </select>
      </div>
      <button type="submit" class="btn btn-primary btn-full">Update Equipment</button>
    </form>
  `);
}

async function updateEquipment(e, id) {
  e.preventDefault();
  
  try {
    const res = await fetch(`/api/equipment/${id}`, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify({
        equipment_type: document.getElementById('editEquipType').value,
        equipment_id: document.getElementById('editEquipId').value,
        location: document.getElementById('editEquipLocation').value,
        status: document.getElementById('editEquipStatus').value
      })
    });
    
    if (!res.ok) throw new Error('Failed to update');
    
    closeModal();
    await loadData();
    showToast('Equipment updated');
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteEquipment(id) {
  if (!confirm('Delete this equipment?')) return;
  
  try {
    const res = await fetch(`/api/equipment/${id}`, {
      method: 'DELETE',
      headers: apiHeaders()
    });
    
    if (!res.ok) throw new Error('Failed to delete');
    
    await loadData();
    showToast('Equipment deleted');
  } catch (err) {
    showToast(err.message);
  }
}

function showAdminPanel() {
  switchTab('admin');
  loadAdminUsers();
}

async function loadAdminUsers() {
  try {
    const res = await fetch('/api/admin/users', { headers: apiHeaders() });
    const users = await res.json();
    
    document.getElementById('adminUsers').innerHTML = users.map(u => `
      <div class="user-card">
        <div class="user-info">
          <div class="user-details">
            <h4>${escapeHtml(u.name)} ${u.role === 'admin' ? '<span style="color:var(--primary);">(Admin)</span>' : ''}</h4>
            <span>${u.employee_id}</span>
          </div>
          <span class="item-badge badge-${u.level.toLowerCase()}">${u.level}</span>
        </div>
        <div class="user-stats">
          <span><i class="fas fa-star"></i> ${u.points} pts</span>
          <span><i class="fas fa-fire"></i> ${u.streak || 0} streak</span>
        </div>
        <div class="user-actions">
          <button class="btn-edit" onclick="adjustPoints(${u.id}, '${escapeHtml(u.name)}', ${u.points})">
            <i class="fas fa-coins"></i> Adjust Points
          </button>
          ${u.id !== currentUser.id ? `
            <button class="btn-delete" onclick="deleteUser(${u.id})">
              <i class="fas fa-trash"></i> Delete
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast('Failed to load users');
  }
}

function adjustPoints(userId, userName, currentPoints) {
  const points = prompt(`Adjust points for ${userName}\nCurrent: ${currentPoints}\nEnter points to add (or negative to subtract):`);
  if (points === null) return;
  
  const pointsNum = parseInt(points);
  if (isNaN(pointsNum)) {
    showToast('Invalid number');
    return;
  }
  
  fetch(`/api/admin/users/${userId}/points`, {
    method: 'PUT',
    headers: apiHeaders(),
    body: JSON.stringify({ points: pointsNum, action: 'admin_adjustment' })
  }).then(res => {
    if (res.ok) {
      showToast('Points adjusted');
      loadAdminUsers();
    } else {
      showToast('Failed to adjust points');
    }
  });
}

async function deleteUser(userId) {
  if (!confirm('Delete this user? This cannot be undone.')) return;
  
  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      headers: apiHeaders()
    });
    
    if (!res.ok) throw new Error('Failed to delete user');
    
    loadAdminUsers();
    showToast('User deleted');
  } catch (err) {
    showToast(err.message);
  }
}

function showAdminSection(section) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(s => { s.style.display = 'none'; s.classList.remove('active'); });
  
  event.target.classList.add('active');
  
  switch (section) {
    case 'users':
      document.getElementById('adminUsers').style.display = 'block';
      loadAdminUsers();
      break;
    case 'allObs':
      document.getElementById('adminAllObs').style.display = 'block';
      document.getElementById('adminAllObs').innerHTML = observations.map(o => `
        <div class="item-card">
          <div class="item-header">
            <span class="item-title">${escapeHtml(o.area)}</span>
            <span class="item-badge badge-${o.risk_level}">${o.risk_level}</span>
          </div>
          <div class="item-desc">${escapeHtml(o.description)}</div>
          <div class="item-actions">
            <button class="btn-edit" onclick="editObservation(${o.id})">Edit</button>
            <button class="btn-delete" onclick="deleteObservation(${o.id})">Delete</button>
          </div>
        </div>
      `).join('') || '<p>No observations</p>';
      break;
    case 'allPermits':
      document.getElementById('adminAllPermits').style.display = 'block';
      document.getElementById('adminAllPermits').innerHTML = permits.map(p => `
        <div class="item-card">
          <div class="item-header">
            <span class="item-title">${escapeHtml(p.permit_type)}</span>
            <span class="item-badge badge-${p.status}">${p.status}</span>
          </div>
          <div class="item-actions">
            <button class="btn-edit" onclick="editPermit(${p.id})">Edit</button>
            <button class="btn-delete" onclick="deletePermit(${p.id})">Delete</button>
          </div>
        </div>
      `).join('') || '<p>No permits</p>';
      break;
    case 'allEquip':
      document.getElementById('adminAllEquip').style.display = 'block';
      document.getElementById('adminAllEquip').innerHTML = equipment.map(e => `
        <div class="item-card">
          <div class="item-header">
            <span class="item-title">${escapeHtml(e.equipment_type)}</span>
            <span class="item-badge">${e.equipment_id}</span>
          </div>
          <div class="item-actions">
            <button class="btn-edit" onclick="editEquipment(${e.id})">Edit</button>
            <button class="btn-delete" onclick="deleteEquipment(${e.id})">Delete</button>
          </div>
        </div>
      `).join('') || '<p>No equipment</p>';
      break;
  }
}

async function showLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard', { headers: apiHeaders() });
    const users = await res.json();
    
    openModal('Leaderboard', `
      <div class="leaderboard">
        ${users.map((u, i) => `
          <div class="user-card">
            <div class="user-info">
              <div style="display:flex;align-items:center;gap:0.75rem;">
                <span style="font-size:1.25rem;font-weight:bold;color:${i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7f32' : 'var(--text)'};">
                  ${i + 1}
                </span>
                <div class="user-details">
                  <h4>${escapeHtml(u.name)}</h4>
                  <span>${u.level}</span>
                </div>
              </div>
              <span style="font-weight:bold;color:var(--primary);">${u.points} pts</span>
            </div>
          </div>
        `).join('')}
      </div>
    `);
  } catch (err) {
    showToast('Failed to load leaderboard');
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  const icon = document.getElementById('themeIcon');
  icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
  
  const darkSwitch = document.getElementById('darkModeSwitch');
  if (darkSwitch) darkSwitch.checked = isDark;
}

function loadTheme() {
  const theme = localStorage.getItem('theme');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    document.getElementById('themeIcon').className = 'fas fa-sun';
    const darkSwitch = document.getElementById('darkModeSwitch');
    if (darkSwitch) darkSwitch.checked = true;
  }
}

function openModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMessage').textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function previewPhotos(input, previewId) {
  const preview = document.getElementById(previewId);
  preview.innerHTML = '';
  
  for (const file of input.files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  }
}

function renderEvidenceThumbs(urls) {
  if (!urls) return '';
  try {
    const parsed = typeof urls === 'string' ? JSON.parse(urls) : urls;
    if (!Array.isArray(parsed) || parsed.length === 0) return '';
    
    return `
      <div class="evidence-thumbnails">
        ${parsed.map(url => `<img src="${url}" class="evidence-thumb" onclick="openLightbox('${url}')">`).join('')}
      </div>
    `;
  } catch {
    return '';
  }
}

function openLightbox(src) {
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightbox').classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
}

function canEdit(userId) {
  return currentUser && (currentUser.id === userId || currentUser.role === 'admin');
}

function updateUserPoints(amount) {
  currentUser.points = (currentUser.points || 0) + amount;
  localStorage.setItem('user', JSON.stringify(currentUser));
  document.getElementById('userPoints').textContent = currentUser.points;
  document.getElementById('settingsPoints').textContent = currentUser.points;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
