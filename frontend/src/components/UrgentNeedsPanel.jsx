import { useEffect, useState, useCallback } from 'react';
import { getUrgentNeeds, runMatching, resolveNeed } from '../api/index.js';

const CAT_ICON = { food:'🍱', medical:'🏥', education:'📚', shelter:'🏠', sanitation:'💧' };

function daysSince(dt) {
  if (!dt) return '?';
  const ms = Date.now() - new Date(dt).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export default function UrgentNeedsPanel({ refresh, onMatchRun }) {
  const [needs,   setNeeds]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy,    setBusy]    = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getUrgentNeeds();
      setNeeds(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, refresh]);

  const handleMatch = async (need) => {
    setBusy(b => ({ ...b, [need.need_id]: 'match' }));
    try {
      const res = await runMatching();
      onMatchRun && onMatchRun(res.data);
      await load();
    } catch(e) { console.error(e); }
    finally { setBusy(b => ({ ...b, [need.need_id]: null })); }
  };

  const handleResolve = async (need) => {
    setBusy(b => ({ ...b, [need.need_id]: 'resolve' }));
    try {
      await resolveNeed(need.need_id);
      await load();
    } catch(e) { console.error(e); }
    finally { setBusy(b => ({ ...b, [need.need_id]: null })); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'50%', borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
      <div className="panel-header">
        <span className="panel-title">🚨 Urgent Needs</span>
        <button className="btn btn-ghost" onClick={load} style={{ fontSize:'0.65rem' }}>
          {loading ? <span className="spinner" /> : '↻'}
        </button>
      </div>

      <div className="panel-scroll" id="urgent-needs-list">
        {needs.length === 0 && !loading && (
          <div style={{ textAlign:'center', color:'#475569', fontSize:'0.75rem', padding:'20px 0' }}>
            No open urgent needs found.
          </div>
        )}

        {needs.map((need, idx) => (
          <div
            key={need.need_id}
            className={`need-card ${need.urgency_badge || 'Moderate'}`}
            id={`need-card-${need.need_id}`}
          >
            <div className="need-card-header">
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ font:'600 0.7rem Inter', color:'#475569' }}>#{idx+1}</span>
                <span className={`cat-icon cat-${need.category}`}>
                  {CAT_ICON[need.category] || '📌'}
                </span>
                <span className="need-area">{need.area}</span>
              </div>
              <span className={`badge ${need.urgency_badge || 'Moderate'}`}>
                {need.urgency_badge === 'Critical' ? '🔴' :
                 need.urgency_badge === 'High'     ? '🟡' : '🟢'} {need.urgency_badge}
              </span>
            </div>

            <div className="need-desc">{need.description}</div>

            <div className="need-meta">
              <span className="meta-chip">👥 {need.reported_count} affected</span>
              <span className="meta-chip">⏱ {daysSince(need.reported_at)}d ago</span>
              <span className="meta-chip" style={{textTransform:'capitalize'}}>
                📂 {need.category}
              </span>
              {need.urgency_score && (
                <span className="meta-chip" style={{color:'#818cf8'}}>
                  📊 {need.urgency_score.toFixed(1)}
                </span>
              )}
            </div>

            {need.urgency_score && (
              <div className="urgency-bar" style={{marginTop:6}}>
                <div
                  className="urgency-bar-fill"
                  style={{
                    width: `${need.urgency_score}%`,
                    background: need.urgency_badge === 'Critical' ? '#ef4444' :
                                need.urgency_badge === 'High'     ? '#f59e0b' : '#22c55e',
                  }}
                />
              </div>
            )}

            <div className="need-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleMatch(need)}
                disabled={!!busy[need.need_id]}
                id={`match-btn-${need.need_id}`}
              >
                {busy[need.need_id] === 'match' ? <span className="spinner"/> : '🤝'} Match
              </button>
              <button
                className="btn btn-success"
                onClick={() => handleResolve(need)}
                disabled={!!busy[need.need_id]}
                id={`resolve-btn-${need.need_id}`}
              >
                {busy[need.need_id] === 'resolve' ? <span className="spinner"/> : '✅'} Resolve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
