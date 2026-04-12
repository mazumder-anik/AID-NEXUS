/* ═══════════════════════
   Matches Page
   ═══════════════════════ */

async function loadMatches() {
  const container = document.getElementById('matches-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading matches…</div>';
  try {
    const matches = await api.get('/matches');
    renderMatches(matches);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderMatches(matches) {
  const container = document.getElementById('matches-content');

  const byStatus = {};
  ['pending','accepted','declined','completed'].forEach(s => byStatus[s] = []);
  matches.forEach(m => { if (byStatus[m.status]) byStatus[m.status].push(m); });

  if (matches.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🤝</div>
        <h3>No matches yet</h3>
        <p>Click <strong>"Run Matching Engine"</strong> above to find volunteer–need pairs using the Java microservice.</p>
        <div class="card card-pad" style="margin:20px auto;max-width:400px;text-align:left;background:rgba(20,184,166,0.04);border-color:rgba(20,184,166,0.15)">
          <h4 style="margin-bottom:10px;color:var(--teal)">⚙️ Algorithm Details</h4>
          <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:8px">
            <strong style="color:var(--text-primary)">60%</strong> Skill Overlap Score<br>
            <strong style="color:var(--text-primary)">40%</strong> Proximity Score (Haversine distance)
          </p>
          <code style="font-size:0.8125rem;background:rgba(255,255,255,0.04);padding:10px;border-radius:6px;display:block;font-family:'JetBrains Mono',monospace">
            score = (skill × 0.6) + (proximity × 0.4)
          </code>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <!-- Summary row -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
      ${[
        { label:'Pending',   val: byStatus.pending.length,   col:'var(--high)' },
        { label:'Accepted',  val: byStatus.accepted.length,  col:'var(--teal)' },
        { label:'Completed', val: byStatus.completed.length, col:'var(--normal)' },
        { label:'Declined',  val: byStatus.declined.length,  col:'var(--critical)' }
      ].map(s => `
        <div class="card card-pad" style="flex:1;min-width:100px;text-align:center">
          <div style="font-size:1.75rem;font-weight:800;color:${s.col}">${s.val}</div>
          <div style="font-size:0.8125rem;color:var(--text-secondary)">${s.label}</div>
        </div>`).join('')}
    </div>

    <!-- Match cards -->
    <div style="display:flex;flex-direction:column;gap:12px">
      ${matches.map(m => {
        const pct   = Math.round((m.match_score || 0) * 100);
        const col   = matchScoreColor(m.match_score || 0);
        const skills = Array.isArray(m.volunteer_skills) ? m.volunteer_skills : JSON.parse(m.volunteer_skills || '[]');
        const skillPct = Math.round((m.skill_score || 0) * 100);
        const proxPct  = Math.round((m.proximity_score || 0) * 100);

        return `
          <div class="card card-pad" style="position:relative;overflow:hidden">
            <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${col}"></div>

            <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px">

              <!-- Need side -->
              <div>
                <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">🚨 Need</div>
                <div style="font-weight:700;margin-bottom:4px">${m.need_title}</div>
                <div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:8px">📍 ${m.need_location || '—'}</div>
                ${statusBadge(m.status)}
              </div>

              <!-- Score circle -->
              <div style="text-align:center;flex-shrink:0">
                <div style="width:68px;height:68px;border-radius:50%;border:3px solid ${col};display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);">
                  <div style="font-size:1.1rem;font-weight:800;color:${col};font-family:'JetBrains Mono',monospace;line-height:1">${pct}%</div>
                  <div style="font-size:0.625rem;color:var(--text-muted);margin-top:2px">match</div>
                </div>
              </div>

              <!-- Volunteer side -->
              <div style="text-align:right">
                <div style="font-size:0.7rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">👤 Volunteer</div>
                <div style="font-weight:700;margin-bottom:4px">${m.volunteer_name}</div>
                <div style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:8px">📍 ${m.volunteer_location || '—'}</div>
                <div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end">
                  ${skills.slice(0,4).map(s=>`<span class="skill-tag">${s}</span>`).join('')}
                  ${skills.length>4?`<span class="skill-tag">+${skills.length-4}</span>`:''}
                </div>
              </div>
            </div>

            <!-- Score breakdown -->
            <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">Skill Match</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${skillPct}%;background:var(--teal)"></div>
                </div>
                <div style="font-size:0.75rem;color:var(--teal);margin-top:2px;font-family:'JetBrains Mono',monospace">${skillPct}%</div>
              </div>
              <div>
                <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px">Proximity</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${proxPct}%;background:var(--blue)"></div>
                </div>
                <div style="font-size:0.75rem;color:var(--blue);margin-top:2px;font-family:'JetBrains Mono',monospace">${proxPct}%</div>
              </div>
            </div>

            <!-- Actions -->
            ${m.status === 'pending' ? `
              <div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">
                <button class="btn btn-danger btn-sm" onclick="updateMatchStatus(${m.id},'declined')">✕ Decline</button>
                <button class="btn btn-primary btn-sm" onclick="updateMatchStatus(${m.id},'accepted')">✓ Accept Match</button>
              </div>` : ''}
          </div>`;
      }).join('')}
    </div>`;
}

async function updateMatchStatus(id, status) {
  try {
    await api.put(`/matches/${id}/status`, { status });
    showToast(`Match ${status}!`, 'success');
    loadMatches();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
