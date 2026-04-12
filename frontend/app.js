/* ═════════════════════════════════════════════
   SMARTALLOC — Main Application
   API client · Router · Modal system · Toasts
   ═════════════════════════════════════════════ */

const API_BASE = '/api';

// ── API Client ──────────────────────────────────────────────────
const api = {
  async get(path) {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t); }
    return res.json();
  },
  async put(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) { const t = await res.text(); throw new Error(t); }
    return res.json();
  },
  async del(path) {
    const res = await fetch(API_BASE + path, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
    return res.json();
  },
  async upload(path, formData) {
    const res = await fetch(API_BASE + path, { method: 'POST', body: formData });
    if (!res.ok) { const t = await res.text(); throw new Error(t); }
    return res.json();
  }
};

// ── Toast ───────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span aria-hidden="true">${icons[type] || '💬'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ── Utilities ───────────────────────────────────────────────────
function urgencyClass(score) {
  if (score >= 1.0) return 'critical';
  if (score >= 0.3) return 'high';
  return 'normal';
}
function scoreColor(score) {
  if (score >= 1.0) return 'var(--critical)';
  if (score >= 0.3) return 'var(--high)';
  return 'var(--normal)';
}
function matchScoreColor(score) {
  if (score >= 0.7) return 'var(--normal)';
  if (score >= 0.4) return 'var(--high)';
  return 'var(--critical)';
}
function skillsToArray(str) {
  if (Array.isArray(str)) return str;
  return String(str).split(',').map(s => s.trim()).filter(Boolean);
}
function getCategoryEmoji(cat) {
  const m = { medical:'🏥', food:'🍱', shelter:'🏠', water:'💧', rescue:'🚁',
               infrastructure:'🔧', care:'❤️', education:'📚', 'mental-health':'🧠',
               legal:'⚖️', 'animal-care':'🐾', other:'📦' };
  return m[cat] || '📦';
}
function statusBadge(status) {
  const labels = { open:'Open', in_progress:'In Progress', done:'Done', verified:'Verified',
                   pending:'Pending', accepted:'Accepted', declined:'Declined', completed:'Completed' };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

// ── Modal System ─────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open');    }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Router ───────────────────────────────────────────────────────
const PAGE_LOADERS = {
  dashboard:  () => loadDashboard(),
  needs:      () => loadNeeds(),
  volunteers: () => loadVolunteers(),
  matches:    () => loadMatches(),
  verify:     () => loadVerify(),
  map:        () => loadMap()
};

function navigateTo(pageId) {
  if (!PAGE_LOADERS[pageId]) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });

  document.getElementById(`page-${pageId}`)?.classList.add('active');
  const tab = document.querySelector(`[data-page="${pageId}"]`);
  if (tab) { tab.classList.add('active'); tab.setAttribute('aria-selected', 'true'); }

  history.replaceState(null, '', `#${pageId}`);
  PAGE_LOADERS[pageId]();
}

// ── Form Submission ──────────────────────────────────────────────
async function submitNeed() {
  const title = document.getElementById('need-title').value.trim();
  if (!title) { showToast('Title is required', 'error'); return; }

  const payload = {
    title,
    description:         document.getElementById('need-description').value,
    category:            document.getElementById('need-category').value,
    severity:            parseFloat(document.getElementById('need-severity').value),
    time_remaining_hours: parseFloat(document.getElementById('need-time').value),
    location_lat:        parseFloat(document.getElementById('need-lat').value) || 0,
    location_lng:        parseFloat(document.getElementById('need-lng').value) || 0,
    location_name:       document.getElementById('need-location-name').value,
    skills_required:     skillsToArray(document.getElementById('need-skills').value),
    status:              document.getElementById('need-status').value
  };

  try {
    await api.post('/needs', payload);
    closeModal('modal-add-need');
    document.getElementById('form-add-need').reset();
    showToast('Need registered!', 'success');
    loadNeeds();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function submitVolunteer() {
  const name  = document.getElementById('vol-name').value.trim();
  const email = document.getElementById('vol-email').value.trim();
  if (!name || !email) { showToast('Name and email required', 'error'); return; }

  const payload = {
    name, email,
    phone:         document.getElementById('vol-phone').value,
    skills:        skillsToArray(document.getElementById('vol-skills').value),
    lat:           parseFloat(document.getElementById('vol-lat').value) || 0,
    lng:           parseFloat(document.getElementById('vol-lng').value) || 0,
    location_name: document.getElementById('vol-location').value,
    role:          document.getElementById('vol-role').value,
    available:     true
  };

  try {
    await api.post('/volunteers', payload);
    closeModal('modal-add-volunteer');
    document.getElementById('form-add-volunteer').reset();
    showToast('Volunteer registered!', 'success');
    loadVolunteers();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function runMatchingEngine() {
  const btn = document.getElementById('btn-run-matching');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Running Engine…';

  try {
    const result = await api.post('/matches/run', {});
    const engineLabel = result.engine === 'java' ? '☕ Java microservice' : '⚡ JS fallback engine';
    const msg = result.matchesCreated > 0
      ? `${engineLabel}: ${result.matchesCreated} matches from ${result.totalCandidates} candidates!`
      : result.message || 'No new matches generated (check open needs & available volunteers)';
    showToast(msg, result.matchesCreated > 0 ? 'success' : 'info');
    loadMatches();
  } catch (err) {
    showToast('Matching engine error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '⚡ Run Matching Engine';
  }
}

// ── Dropzone ─────────────────────────────────────────────────────
function setupDropzone() {
  const zone   = document.getElementById('dropzone');
  const input  = document.getElementById('survey-file-input');
  const upBtn  = document.getElementById('btn-upload-survey');
  let file = null;

  function setFile(f) {
    file = f;
    zone.querySelector('.dropzone-text').innerHTML =
      `<strong>${f.name}</strong><br><span style="font-size:0.75rem;color:var(--teal)">Ready to import · ${(f.size/1024).toFixed(1)} KB</span>`;
    upBtn.disabled = false;
  }

  zone.addEventListener('click',    () => input.click());
  zone.addEventListener('keydown',  e => { if (e.key === 'Enter' || e.key === ' ') input.click(); });
  input.addEventListener('change',  () => input.files[0] && setFile(input.files[0]));
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', ()  => zone.classList.remove('dragover'));
  zone.addEventListener('drop',     e  => { e.preventDefault(); zone.classList.remove('dragover'); e.dataTransfer.files[0] && setFile(e.dataTransfer.files[0]); });

  upBtn.addEventListener('click', async () => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    upBtn.disabled = true; upBtn.textContent = 'Importing…';

    try {
      const r = await api.upload('/survey/upload', fd);
      const div = document.getElementById('import-result');
      div.style.display = 'block';
      div.innerHTML = `
        <div class="card card-pad" style="background:rgba(52,211,153,0.05);border-color:rgba(52,211,153,0.2)">
          <h4 style="color:var(--normal);margin-bottom:8px">✅ Import Complete</h4>
          <p style="font-size:0.875rem;color:var(--text-secondary)">
            <strong style="color:var(--text-primary)">${r.imported}</strong> needs imported ·
            <strong style="color:var(--text-primary)">${r.skipped}</strong> skipped
            from <strong style="color:var(--text-primary)">${r.total}</strong> rows
            ${r.errors.length ? `<br><span style="color:var(--critical)">${r.errors.length} errors</span>` : ''}
          </p>
        </div>`;
      showToast(`Imported ${r.imported} needs!`, 'success');
      loadNeeds();
    } catch (err) { showToast('Upload failed: ' + err.message, 'error'); }
    finally { upBtn.disabled = false; upBtn.textContent = 'Upload & Import'; }
  });
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Tab navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigateTo(tab.dataset.page));
  });

  // Close modals
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay.id); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(o => closeModal(o.id));
  });

  // Button bindings
  document.getElementById('btn-add-need')?.addEventListener('click',      () => openModal('modal-add-need'));
  document.getElementById('btn-submit-need')?.addEventListener('click',   submitNeed);
  document.getElementById('btn-add-volunteer')?.addEventListener('click', () => openModal('modal-add-volunteer'));
  document.getElementById('btn-submit-volunteer')?.addEventListener('click', submitVolunteer);
  document.getElementById('btn-import-survey')?.addEventListener('click', () => openModal('modal-import-survey'));
  document.getElementById('btn-run-matching')?.addEventListener('click',  runMatchingEngine);
  document.getElementById('btn-refresh-map')?.addEventListener('click',   refreshMapData);

  setupDropzone();

  // Initial route
  const hash = window.location.hash.slice(1);
  navigateTo(PAGE_LOADERS[hash] ? hash : 'dashboard');
});

// ── Expose globals for page modules ──────────────────────────────
window.api            = api;
window.showToast      = showToast;
window.urgencyClass   = urgencyClass;
window.scoreColor     = scoreColor;
window.matchScoreColor = matchScoreColor;
window.skillsToArray  = skillsToArray;
window.getCategoryEmoji = getCategoryEmoji;
window.statusBadge    = statusBadge;
window.openModal      = openModal;
window.closeModal     = closeModal;
window.navigateTo     = navigateTo;
window.loadNeeds      = loadNeeds;
window.loadVolunteers = loadVolunteers;
window.loadMatches    = loadMatches;
window.loadVerify     = loadVerify;
