/* ═══════════════════════
   Verify Page — Kanban
   ═══════════════════════ */

async function loadVerify() {
  const container = document.getElementById('verify-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading verifications…</div>';

  try {
    const [matches, verifications] = await Promise.all([
      api.get('/matches'),
      api.get('/verify')
    ]);

    const accepted = matches.filter(m => m.status === 'accepted' || m.status === 'completed');
    const verifMap = {};
    verifications.forEach(v => { verifMap[v.match_id] = v; });

    const pending   = [];
    const markedDone = [];
    const verified  = [];

    accepted.forEach(m => {
      const v = verifMap[m.id];
      if (!v || (!v.volunteer_marked_done && !v.ngo_verified)) {
        pending.push({ match: m, verif: v });
      } else if (v.volunteer_marked_done && !v.ngo_verified) {
        markedDone.push({ match: m, verif: v });
      } else if (v.ngo_verified) {
        verified.push({ match: m, verif: v });
      }
    });

    renderKanban(pending, markedDone, verified);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderKanban(pending, markedDone, verified) {
  const container = document.getElementById('verify-content');

  if ([...pending, ...markedDone, ...verified].length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>No accepted matches yet</h3>
        <p>Accept matches in the <strong>Matches</strong> tab to start the verification workflow.</p>
        <button class="btn btn-secondary" style="margin-top:16px" onclick="navigateTo('matches')">Go to Matches →</button>
      </div>`;
    return;
  }

  function card({ match: m, verif: v }, col) {
    const pct = Math.round((m.match_score || 0) * 100);
    return `
      <div class="kanban-item" id="kitem-${m.id}">
        <div class="kanban-item-title">${m.need_title}</div>
        <div class="kanban-item-sub">👤 ${m.volunteer_name}</div>
        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:10px">
          📍 ${m.need_location || '—'} &nbsp;·&nbsp;
          Match: <span style="font-family:'JetBrains Mono',monospace;color:var(--teal)">${pct}%</span>
        </div>

        ${col === 'pending' ? `
          <input type="text" id="vnote-${m.id}" placeholder="Volunteer note (optional)…"
                 style="font-size:0.8125rem;margin-bottom:8px" aria-label="Volunteer completion note" />
          <button class="btn btn-primary btn-sm" style="width:100%" onclick="markDone(${m.id})">
            ✓ Mark as Done
          </button>` : ''}

        ${col === 'marked' ? `
          ${v?.volunteer_note ? `
            <div style="font-size:0.8125rem;color:var(--text-secondary);font-style:italic;margin-bottom:8px;padding:8px;background:var(--bg-card);border-radius:6px">
              💬 "${v.volunteer_note}"
            </div>` : ''}
          <input type="text" id="ngo-note-${m.id}" placeholder="NGO confirmation note…"
                 style="font-size:0.8125rem;margin-bottom:8px" aria-label="NGO confirmation note" />
          <button class="btn btn-success btn-sm" style="width:100%" onclick="ngoConfirm(${m.id})">
            ✅ Confirm Completed
          </button>` : ''}

        ${col === 'verified' ? `
          <div style="display:flex;flex-direction:column;gap:6px">
            ${v?.volunteer_note ? `
              <div style="font-size:0.75rem;background:var(--bg-card);border-radius:6px;padding:8px">
                <strong style="color:var(--text-muted)">👤 Volunteer:</strong> "${v.volunteer_note}"
              </div>` : ''}
            ${v?.ngo_note ? `
              <div style="font-size:0.75rem;background:var(--bg-card);border-radius:6px;padding:8px">
                <strong style="color:var(--teal)">🏢 NGO:</strong> "${v.ngo_note}"
              </div>` : ''}
            <span class="badge badge-completed" style="align-self:flex-start;margin-top:4px">✅ NGO Verified</span>
          </div>` : ''}
      </div>`;
  }

  function emptyCol(msg) {
    return `<div style="text-align:center;padding:24px 12px;color:var(--text-muted);font-size:0.8125rem">${msg}</div>`;
  }

  container.innerHTML = `
    <div class="kanban-board">
      <!-- Column 1: Assigned -->
      <div class="kanban-column">
        <div class="kanban-col-header">
          <div class="kanban-col-title"><span style="color:var(--high)">⏳</span> Assigned</div>
          <span class="kanban-col-count">${pending.length}</span>
        </div>
        <div class="kanban-cards">
          ${pending.length ? pending.map(i => card(i,'pending')).join('') : emptyCol('All tasks reported!')}
        </div>
      </div>

      <!-- Column 2: Marked Done -->
      <div class="kanban-column" style="border-color:rgba(96,165,250,0.2)">
        <div class="kanban-col-header">
          <div class="kanban-col-title"><span style="color:var(--blue)">🔄</span> Marked Done</div>
          <span class="kanban-col-count">${markedDone.length}</span>
        </div>
        <div class="kanban-cards">
          ${markedDone.length ? markedDone.map(i => card(i,'marked')).join('') : emptyCol('Waiting for volunteer reports')}
        </div>
      </div>

      <!-- Column 3: NGO Verified -->
      <div class="kanban-column" style="border-color:rgba(52,211,153,0.2)">
        <div class="kanban-col-header">
          <div class="kanban-col-title"><span style="color:var(--normal)">✅</span> NGO Verified</div>
          <span class="kanban-col-count">${verified.length}</span>
        </div>
        <div class="kanban-cards">
          ${verified.length ? verified.map(i => card(i,'verified')).join('') : emptyCol('No verified tasks yet')}
        </div>
      </div>
    </div>`;
}

async function markDone(matchId) {
  const note = document.getElementById(`vnote-${matchId}`)?.value || '';
  try {
    await api.post(`/verify/${matchId}/done`, { note });
    showToast('Task marked as done! NGO review pending.', 'success');
    loadVerify();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function ngoConfirm(matchId) {
  const note = document.getElementById(`ngo-note-${matchId}`)?.value || '';
  try {
    await api.post(`/verify/${matchId}/confirm`, { note });
    showToast('🎉 Task verified by NGO!', 'success');
    loadVerify();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
