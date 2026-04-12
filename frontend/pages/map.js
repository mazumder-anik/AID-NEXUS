/* ═══════════════════════
   Map Page — Leaflet.js
   CartoDB Dark tiles
   ═══════════════════════ */

let mapInstance = null;
let markerLayers = [];
let lineLayers   = [];

async function loadMap() {
  // Init map once
  if (!mapInstance) {
    mapInstance = L.map('map', {
      center: [20.5937, 78.9629],
      zoom: 5,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapInstance);
  }

  await refreshMapData();
}

async function refreshMapData() {
  if (!mapInstance) { await loadMap(); return; }

  // Clear previous markers and lines
  markerLayers.forEach(l => mapInstance.removeLayer(l));
  lineLayers.forEach(l => mapInstance.removeLayer(l));
  markerLayers = [];
  lineLayers   = [];

  try {
    const [needs, volunteers, matches] = await Promise.all([
      api.get('/needs'),
      api.get('/volunteers'),
      api.get('/matches')
    ]);

    // Build quick lookup maps
    const needsByTitle = {};
    const volsByName   = {};
    needs.forEach(n => needsByTitle[n.title] = n);
    volunteers.forEach(v => volsByName[v.name] = v);

    // Draw accepted match connections
    matches
      .filter(m => m.status === 'accepted' || m.status === 'completed')
      .forEach(m => {
        const n = needsByTitle[m.need_title];
        const v = volsByName[m.volunteer_name];
        if (!n || !v || !n.location_lat || !v.lat) return;

        const line = L.polyline(
          [[n.location_lat, n.location_lng], [v.lat, v.lng]],
          { color: '#14b8a6', weight: 2, opacity: 0.55, dashArray: '6, 5' }
        ).addTo(mapInstance);
        lineLayers.push(line);
      });

    // Draw need markers (radius ∝ urgency)
    needs.forEach(n => {
      if (!n.location_lat || !n.location_lng) return;

      const u     = n.urgency_score || 0;
      const color = u >= 1.0 ? '#f87171' : u >= 0.3 ? '#fbbf24' : '#34d399';
      const radius = Math.max(7, Math.min(22, u * 10 + 6));

      const m = L.circleMarker([n.location_lat, n.location_lng], {
        radius, color, fillColor: color, weight: 2, opacity: 1, fillOpacity: 0.75
      }).addTo(mapInstance);

      m.bindPopup(`
        <div style="min-width:210px;font-family:'Inter',sans-serif">
          <div style="font-weight:700;font-size:.9375rem;margin-bottom:4px;color:${color}">${n.title}</div>
          <div style="font-size:.8125rem;color:rgba(238,242,255,.65);margin-bottom:8px">${n.description?.slice(0,80) || ''}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:.75rem;color:rgba(238,242,255,.5)">
            <span>📍 ${n.location_name || '—'}</span>
            <span>⏰ ${n.time_remaining_hours}h left</span>
          </div>
          <div style="margin-top:8px;font-size:.8125rem">
            <strong>Urgency:</strong>
            <span style="color:${color};font-family:'JetBrains Mono',monospace">${u.toFixed(3)}</span>
            &nbsp;= ${n.severity} ÷ ${n.time_remaining_hours}h
          </div>
          <div style="font-size:.75rem;margin-top:4px;color:rgba(238,242,255,.5)">Status: <strong style="color:rgba(238,242,255,.9)">${n.status}</strong></div>
        </div>
      `, { maxWidth: 260 });

      markerLayers.push(m);
    });

    // Draw volunteer markers
    volunteers.forEach(v => {
      if (!v.lat || !v.lng) return;

      const color  = v.role === 'ngo' ? '#a78bfa' : v.available ? '#60a5fa' : '#6b7280';
      const radius = 8;
      const skills = Array.isArray(v.skills) ? v.skills : JSON.parse(v.skills || '[]');

      const m = L.circleMarker([v.lat, v.lng], {
        radius, color, fillColor: color, weight: 2, opacity: 1, fillOpacity: 0.85
      }).addTo(mapInstance);

      m.bindPopup(`
        <div style="min-width:190px;font-family:'Inter',sans-serif">
          <div style="font-weight:700;font-size:.9375rem;margin-bottom:4px">${v.name}</div>
          <div style="font-size:.8125rem;color:rgba(238,242,255,.65);margin-bottom:6px">
            ${v.role === 'ngo' ? '🏢 NGO Partner' : '👤 Volunteer'}
          </div>
          <div style="font-size:.75rem;margin-bottom:8px;color:rgba(238,242,255,.5)">📍 ${v.location_name || '—'}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${skills.map(s=>`<span style="background:rgba(20,184,166,.15);color:#14b8a6;padding:2px 7px;border-radius:999px;font-size:.7rem">${s}</span>`).join('')}
          </div>
          <div style="margin-top:8px;font-size:.75rem;color:${v.available?'#34d399':'#6b7280'}">
            ${v.available ? '● Available' : '● Offline'}
          </div>
        </div>
      `, { maxWidth: 220 });

      markerLayers.push(m);
    });

    // Force re-render (needed when tab was inactive during init)
    setTimeout(() => mapInstance.invalidateSize(), 150);

  } catch (err) {
    console.error('Map refresh error:', err);
    showToast('Map data error: ' + err.message, 'error');
  }
}
