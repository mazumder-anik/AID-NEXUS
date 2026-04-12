/* ═══════════════════════
   Needs Page
   ═══════════════════════ */

let allNeeds = [];
let needsFilter = { search: '', category: '', status: '' };

async function loadNeeds() {
  const container = document.getElementById('needs-content');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Loading needs…</div>';
  try {
    allNeeds = await api.get('/needs');
    renderNeeds();
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><h3>Error loading needs</h3><p>${err.message}</p></div>`;
  }
}

function renderNeeds() {
  const container = document.getElementById('needs-content');

  let filtered = allNeeds;
  const q = needsFilter.search.toLowerCase();
  if (q) filtered = filtered.filter(n =>
    n.title.toLowerCase().includes(q) ||
    (n.description || '').toLowerCase().includes(q) ||
    (n.location_name || '').toLowerCase().includes(q)
  );
  if (needsFilter.category) filtered = filtered.filter(n => n.category === needsFilter.category);
  if (needsFilter.status)   filtered = filtered.filter(n => n.status   === needsFilter.status);

  const categories = [...new Set(allNeeds.map(n => n.category))].sort();

  container.innerHTML = `
    <div class="search-bar">
      <div class="search-input-wrap">
        <span class="search-icon" aria-hidden="true">🔍</span>
        <input type="text" id="needs-search" placeholder="Search by title, description, location…" value="${needsFilter.search}" aria-label="Search needs" />
      </div>
      <select id="needs-cat-filter" style="width:auto" aria-label="Filter by category">
        <option value="">All Categories</option>
        ${categories.map(c => `<option value="${c}" ${needsFilter.category===c?'selected':''}>${getCategoryEmoji(c)} ${c}</option>`).join('')}
      </select>
      <select id="needs-status-filter" style="width:auto" aria-label="Filter by status">
        <option value="">All Statuses</option>
        <option value="open"        ${needsFilter.status==='open'?'selected':''}>Open</option>
        <option value="in_progress" ${needsFilter.status==='in_progress'?'selected':''}>In Progress</option>
        <option value="done"        ${needsFilter.status==='done'?'selected':''}>Done</option>
        <option value="verified"    ${needsFilter.status==='verified'?'selected':''}>Verified</option>
      </select>
      <span style="color:var(--text-muted);font-size:0.8125rem;align-self:center">${filtered.length} result${filtered.length!==1?'s':''}</span>
    </div>

    ${filtered.length === 0
      ? `<div class="empty-state">
           <div class="empty-state-icon">🔍</div>
           <h3>No needs found</h3>
           <p>Try adjusting your filters or <button class="btn btn-ghost btn-sm" onclick="document.getElementById('btn-add-need').click()">add a new need</button></p>
         </div>`
      : `<div class="table-container">
           <table>
             <thead>
               <tr>
                 <th>Need</th>
                 <th>Category</th>
                 <th>Urgency Score</th>
                 <th>Severity</th>
                 <th>Time Left</th>
                 <th>Location</th>
                 <th>Status</th>
                 <th>Actions</th>
               </tr>
             </thead>
             <tbody>
               ${filtered.map(need => `
                 <tr>
                   <td>
                     <div style="font-weight:600;margin-bottom:2px">${need.title}</div>
                     <div style="font-size:0.75rem;color:var(--text-muted)">
                       ${need.description ? need.description.slice(0,65)+(need.description.length>65?'…':'') : '—'}
                     </div>
                     ${need.skills_required?.length
                       ? `<div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:4px">
                            ${need.skills_required.slice(0,3).map(s=>`<span class="skill-tag">${s}</span>`).join('')}
                            ${need.skills_required.length>3?`<span class="skill-tag">+${need.skills_required.length-3}</span>`:''}
                          </div>` : ''}
                   </td>
                   <td><span style="font-size:0.875rem">${getCategoryEmoji(need.category)} ${need.category}</span></td>
                   <td>
                     <span class="badge badge-${urgencyClass(need.urgency_score)}"
                           style="font-family:'JetBrains Mono',monospace;font-size:0.8125rem">
                       ${need.urgency_score.toFixed(3)}
                     </span>
                   </td>
                   <td>
                     <div class="progress-bar">
                       <div class="progress-fill" style="width:${(need.severity/10)*100}%;background:${scoreColor(need.urgency_score)}"></div>
                     </div>
                     <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px">${need.severity}/10</div>
                   </td>
                   <td>
                     <span style="font-family:'JetBrains Mono',monospace;font-size:0.875rem;color:${need.time_remaining_hours<12?'var(--critical)':'var(--text-secondary)'}">
                       ${need.time_remaining_hours}h
                     </span>
                     ${need.time_remaining_hours < 12 ? '<span style="font-size:0.75rem;color:var(--critical)"> ⚠️</span>' : ''}
                   </td>
                   <td style="font-size:0.8125rem;color:var(--text-secondary)">
                     ${need.location_name ? `📍 ${need.location_name}` : '—'}
                   </td>
                   <td>${statusBadge(need.status)}</td>
                   <td>
                     <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteNeed(${need.id})" title="Delete need" aria-label="Delete ${need.title}">🗑️</button>
                   </td>
                 </tr>`).join('')}
             </tbody>
           </table>
         </div>`}
  `;

  // Wire up filters
  document.getElementById('needs-search')?.addEventListener('input', e => { needsFilter.search = e.target.value; renderNeeds(); });
  document.getElementById('needs-cat-filter')?.addEventListener('change', e => { needsFilter.category = e.target.value; renderNeeds(); });
  document.getElementById('needs-status-filter')?.addEventListener('change', e => { needsFilter.status = e.target.value; renderNeeds(); });
}

async function deleteNeed(id) {
  if (!confirm('Permanently delete this need?')) return;
  try {
    await api.del(`/needs/${id}`);
    showToast('Need deleted', 'success');
    loadNeeds();
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}
