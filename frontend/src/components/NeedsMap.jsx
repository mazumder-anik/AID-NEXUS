import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayerGroup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getNeedsAll, getVolunteers } from '../api/index.js';

const CATEGORY_COLORS = {
  food:       '#fbbf24',
  medical:    '#f87171',
  education:  '#818cf8',
  shelter:    '#34d399',
  sanitation: '#38bdf8',
};

const CATEGORY_ICONS = {
  food:'🍱', medical:'🏥', education:'📚', shelter:'🏠', sanitation:'💧',
};

function urgencyColor(badge) {
  if (badge === 'Critical') return '#ef4444';
  if (badge === 'High')     return '#f59e0b';
  return '#22c55e';
}

export default function NeedsMap({ refresh, onNeedSelect }) {
  const [needs,      setNeeds]      = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [showVols,   setShowVols]   = useState(false);
  const [filter,     setFilter]     = useState('all');

  const load = useCallback(async () => {
    try {
      const [nr, vr] = await Promise.all([
        getNeedsAll({ status: 'open' }),
        showVols ? getVolunteers() : Promise.resolve({ data: [] }),
      ]);
      setNeeds(nr.data);
      setVolunteers(vr.data);
    } catch (e) { console.error(e); }
  }, [showVols]);

  useEffect(() => { load(); }, [load, refresh]);

  const filtered = filter === 'all'
    ? needs
    : needs.filter(n => n.category === filter);

  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      {/* Controls overlay */}
      <div style={{
        position:'absolute', top:10, left:10, zIndex:1000,
        display:'flex', flexDirection:'column', gap:6,
      }}>
        {/* Category filter */}
        <div style={{
          background:'rgba(15,22,41,0.92)', borderRadius:8,
          border:'1px solid rgba(99,102,241,0.3)', padding:'8px 10px',
          display:'flex', gap:5, flexWrap:'wrap',
        }}>
          {['all','food','medical','education','shelter','sanitation'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`btn ${filter===cat ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding:'3px 9px', fontSize:'0.65rem', textTransform:'capitalize' }}
            >
              {cat === 'all' ? '🗺 All' : `${CATEGORY_ICONS[cat]} ${cat}`}
            </button>
          ))}
        </div>

        {/* Volunteer toggle */}
        <button
          className={`btn ${showVols ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowVols(v => !v)}
          style={{ fontSize:'0.7rem' }}
        >
          👥 {showVols ? 'Hide' : 'Show'} Volunteers
        </button>
      </div>

      {/* Legends */}
      <div style={{
        position:'absolute', bottom:10, left:10, zIndex:1000,
        background:'rgba(15,22,41,0.92)', borderRadius:8,
        border:'1px solid rgba(99,102,241,0.25)', padding:'8px 12px',
        fontSize:'0.65rem', display:'flex', flexDirection:'column', gap:4,
      }}>
        <span style={{color:'#475569',fontWeight:700,marginBottom:2}}>URGENCY</span>
        {[['🔴','Critical'],['🟡','High'],['🟢','Moderate']].map(([e,l])=>(
          <span key={l} style={{color:'#94a3b8'}}>{e} {l}</span>
        ))}
        <span style={{color:'#475569',fontWeight:700,margin:'4px 0 2px'}}>SIZE</span>
        <span style={{color:'#94a3b8'}}>∝ People affected</span>
      </div>

      <MapContainer
        center={[19.07, 72.88]}
        zoom={11}
        style={{ width:'100%', height:'100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Need markers */}
        <LayerGroup>
          {filtered.map(need => {
            const radius = Math.max(6, Math.min(28, need.reported_count / 8));
            const color  = urgencyColor(need.urgency_badge);
            return (
              <CircleMarker
                key={need.need_id}
                center={[need.lat, need.lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.55,
                  weight: 2,
                }}
                eventHandlers={{ click: () => onNeedSelect && onNeedSelect(need) }}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{ fontWeight:700, color:'#c7d2fe', marginBottom:4, fontSize:'0.8rem' }}>
                      {CATEGORY_ICONS[need.category]} {need.area}
                    </div>
                    <div style={{ color:'#94a3b8', marginBottom:6, fontSize:'0.72rem', lineHeight:1.4 }}>
                      {need.description}
                    </div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:'0.68rem' }}>
                      <span style={{ color:'#fbbf24' }}>👥 {need.reported_count} affected</span>
                      <span style={{
                        background: need.urgency_badge === 'Critical' ? 'rgba(239,68,68,0.2)' :
                                    need.urgency_badge === 'High'     ? 'rgba(251,191,36,0.15)' :
                                    'rgba(74,222,128,0.12)',
                        color: need.urgency_badge === 'Critical' ? '#f87171' :
                               need.urgency_badge === 'High'     ? '#fbbf24' : '#4ade80',
                        padding:'1px 6px', borderRadius:4, fontWeight:700,
                      }}>
                        {need.urgency_badge}
                      </span>
                    </div>
                    {need.urgency_score && (
                      <div style={{ marginTop:6, fontSize:'0.68rem', color:'#64748b' }}>
                        Urgency score: <b style={{color:'#818cf8'}}>{need.urgency_score.toFixed(1)}</b>
                      </div>
                    )}
                    <div style={{ marginTop:6, fontSize:'0.66rem', color:'#475569' }}>
                      Source: {need.source}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </LayerGroup>

        {/* Volunteer markers */}
        {showVols && (
          <LayerGroup>
            {volunteers.map(vol => (
              <CircleMarker
                key={vol.volunteer_id}
                center={[vol.lat, vol.lng]}
                radius={6}
                pathOptions={{
                  color: vol.status === 'available' ? '#60a5fa' : '#94a3b8',
                  fillColor: vol.status === 'available' ? '#3b82f6' : '#64748b',
                  fillOpacity: 0.8,
                  weight: 1.5,
                }}
              >
                <Popup>
                  <div>
                    <b style={{color:'#c7d2fe'}}>{vol.name}</b>
                    <div style={{color:'#64748b', fontSize:'0.7rem', marginTop:4}}>
                      Skills: {(vol.skills||[]).join(', ')}
                    </div>
                    <div style={{color:'#64748b', fontSize:'0.7rem'}}>
                      Status: <span style={{color: vol.status==='available'?'#4ade80':'#fbbf24'}}>{vol.status}</span>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </LayerGroup>
        )}
      </MapContainer>
    </div>
  );
}
