/* ═══════════════════════
   Volunteers Page
   ═══════════════════════ */

let allVolunteers = [];

async function loadVolunteers() {
  const container = document.getElementById('volunteers-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading volunteers…</div>';
  try {
    allVolunteers = await api.get('/volunteers');
    renderVolunteers();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderVolunteers() {
  const container = document.getElementById('volunteers-content');
  const volunteers = allVolunteers.filter(v => v.role === 'volunteer');
  const ngos       = allVolunteers.filter(v => v.role === 'ngo');

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  function volCard(v, isNgo = false) {
    const ini = initials(v.name);
    const skills = Array.isArray(v.skills) ? v.skills : [];

    return `
      <div class="card volunteer-card" ${isNgo ? 'style="border-color:rgba(167,139,250,0.2);background:rgba(167,139,250,0.03)"' : ''}>
        <div class="volunteer-header">
          <div class="volunteer-avatar" style="${isNgo ? 'background:linear-gradient(135deg,#a78bfa,#7c3aed)' : ''}">${ini}</div>
          <div class="volunteer-info">
            <h4>${v.name}</h4>
            <p>📍 ${v.location_name || 'Unknown location'}</p>
          </div>
        </div>

        <div class="volunteer-skills">
          ${skills.length
            ? skills.map(s => `<span class="skill-tag">${s}</span>`).join('')
            : `<span style="font-size:0.8125rem;color:var(--text-muted)">${isNgo ? 'NGO Partner' : 'No skills listed'}</span>`}
        </div>

        <div class="volunteer-footer">
          <div class="availability-label">
            <div class="availability-dot ${v.available ? '' : 'offline'}"></div>
            ${v.available ? 'Available' : 'Offline'}
          </div>
          ${!isNgo ? `
            <button
              class="btn btn-ghost btn-sm"
              onclick="toggleAvailability(${v.id}, ${v.available})"
              title="Toggle availability"
              aria-label="Toggle availability for ${v.name}"
            >
              ${v.available ? '🟢 On' : '⚫ Off'}
            </button>` : ''}
        </div>

        <div style="font-size:0.75rem;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:8px">
          <span>📧 ${v.email}</span>
          ${v.phone ? `<span>📞 ${v.phone}</span>` : ''}
        </div>
      </div>`;
  }

  const available  = volunteers.filter(v =>  v.available);
  const unavailable = volunteers.filter(v => !v.available);

  container.innerHTML = `
    <!-- Volunteers -->
    <div style="margin-bottom:28px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h3>👤 Volunteers
          <span style="color:var(--text-muted);font-weight:400;font-size:0.875rem">(${volunteers.length})</span>
        </h3>
        <div style="display:flex;gap:8px;font-size:0.8125rem">
          <span style="color:var(--normal)">● ${available.length} available</span>
          <span style="color:var(--text-muted)">● ${unavailable.length} offline</span>
        </div>
      </div>
      ${volunteers.length === 0
        ? `<div class="empty-state" style="padding:40px 20px">
             <div class="empty-state-icon">👤</div>
             <h3>No volunteers yet</h3>
             <p>Register the first volunteer to get started</p>
           </div>`
        : `<div class="grid-3">${volunteers.map(v => volCard(v)).join('')}</div>`}
    </div>

    <!-- NGOs -->
    ${ngos.length > 0 ? `
      <div>
        <h3 style="margin-bottom:14px">🏢 NGO Partners
          <span style="color:var(--text-muted);font-weight:400;font-size:0.875rem">(${ngos.length})</span>
        </h3>
        <div class="grid-3">${ngos.map(v => volCard(v, true)).join('')}</div>
      </div>` : ''}
  `;
}

async function toggleAvailability(id, current) {
  try {
    await api.put(`/volunteers/${id}`, { available: !current });
    showToast('Availability updated', 'success');
    loadVolunteers();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
