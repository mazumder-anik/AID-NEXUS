/* ═══════════════════════
   Dashboard Page
   ═══════════════════════ */

async function loadDashboard() {
  const container = document.getElementById('dashboard-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading dashboard…</div>';

  try {
    const [needs, volunteers, matches] = await Promise.all([
      api.get('/needs'),
      api.get('/volunteers'),
      api.get('/matches')
    ]);

    const openNeeds    = needs.filter(n => n.status === 'open');
    const activeMatches = needs.filter(n => n.status === 'in_progress');
    const verified     = needs.filter(n => n.status === 'verified');
    const availVols    = volunteers.filter(v => v.available && v.role === 'volunteer');

    const topUrgent = [...needs].sort((a, b) => b.urgency_score - a.urgency_score).slice(0, 6);

    // Category stats
    const catCount = {};
    needs.forEach(n => { catCount[n.category] = (catCount[n.category] || 0) + 1; });
    const maxCat = Math.max(...Object.values(catCount), 1);

    container.innerHTML = `
      <!-- ── Stat Cards ── -->
      <div class="stats-grid">
        <div class="card stat-card" style="--accent-color:var(--critical);--accent-glow:var(--critical-glow)">
          <div class="stat-card-icon">🚨</div>
          <div class="stat-card-value">${openNeeds.length}</div>
          <div class="stat-card-label">Open Needs</div>
        </div>
        <div class="card stat-card" style="--accent-color:var(--teal);--accent-glow:var(--teal-glow)">
          <div class="stat-card-icon">👥</div>
          <div class="stat-card-value">${availVols.length}</div>
          <div class="stat-card-label">Available Volunteers</div>
        </div>
        <div class="card stat-card" style="--accent-color:var(--blue);--accent-glow:rgba(96,165,250,0.18)">
          <div class="stat-card-icon">🤝</div>
          <div class="stat-card-value">${activeMatches.length}</div>
          <div class="stat-card-label">Active Matches</div>
        </div>
        <div class="card stat-card" style="--accent-color:var(--normal);--accent-glow:var(--normal-glow)">
          <div class="stat-card-icon">✅</div>
          <div class="stat-card-value">${verified.length}</div>
          <div class="stat-card-label">NGO Verified</div>
        </div>
      </div>

      <!-- ── Two-column content ── -->
      <div class="grid-2" style="margin-bottom:20px;gap:20px">

        <!-- Urgency Leaderboard -->
        <div class="card card-pad">
          <h3 style="margin-bottom:16px">🔥 Top Urgent Needs</h3>
          ${topUrgent.length === 0
            ? `<p style="color:var(--text-muted)">No needs registered yet</p>`
            : `<div class="urgency-list">
                ${topUrgent.map((n, i) => {
                  const max = topUrgent[0]?.urgency_score || 1;
                  const pct = Math.min((n.urgency_score / max) * 100, 100);
                  const col = scoreColor(n.urgency_score);
                  return `
                    <div class="urgency-item" onclick="navigateTo('needs')" style="cursor:pointer" title="${n.title}">
                      <div class="urgency-rank">#${i+1}</div>
                      <div style="flex:1;min-width:0">
                        <div style="font-size:0.8125rem;font-weight:600;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                          ${getCategoryEmoji(n.category)} ${n.title}
                        </div>
                        <div class="urgency-bar-bg">
                          <div class="urgency-bar-fill" style="width:${pct}%;background:${col}"></div>
                        </div>
                      </div>
                      <div class="urgency-score" style="color:${col}">${n.urgency_score.toFixed(3)}</div>
                    </div>`;
                }).join('')}
              </div>`}
        </div>

        <!-- Category Breakdown -->
        <div class="card card-pad">
          <h3 style="margin-bottom:16px">📊 Needs by Category</h3>
          ${Object.keys(catCount).length === 0
            ? `<p style="color:var(--text-muted)">No data yet</p>`
            : `<div style="display:flex;flex-direction:column;gap:10px">
                ${Object.entries(catCount)
                  .sort((a,b) => b[1] - a[1])
                  .map(([cat, count]) => `
                    <div style="display:flex;align-items:center;gap:12px">
                      <div style="font-size:0.8125rem;color:var(--text-secondary);width:130px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                        ${getCategoryEmoji(cat)} ${cat}
                      </div>
                      <div class="progress-bar" style="flex:1">
                        <div class="progress-fill" style="width:${(count/maxCat)*100}%;background:var(--teal)"></div>
                      </div>
                      <div style="font-size:0.8125rem;font-weight:700;width:20px;text-align:right">${count}</div>
                    </div>`
                  ).join('')}
              </div>`}
        </div>
      </div>

      <!-- ── Quick Actions ── -->
      <div class="card card-pad">
        <h3 style="margin-bottom:14px">⚡ Quick Actions</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="navigateTo('needs'); setTimeout(()=>document.getElementById('btn-add-need').click(),300)">
            + Register Need
          </button>
          <button class="btn btn-secondary" onclick="navigateTo('volunteers'); setTimeout(()=>document.getElementById('btn-add-volunteer').click(),300)">
            + Add Volunteer
          </button>
          <button class="btn btn-secondary" onclick="navigateTo('needs'); setTimeout(()=>document.getElementById('btn-import-survey').click(),300)">
            📄 Import Survey
          </button>
          <button class="btn btn-secondary" onclick="navigateTo('matches')">
            ⚡ Run Matching Engine
          </button>
          <button class="btn btn-secondary" onclick="navigateTo('map')">
            🗺️ Live Map
          </button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load dashboard</h3>
        <p>${err.message}</p>
      </div>`;
  }
}
