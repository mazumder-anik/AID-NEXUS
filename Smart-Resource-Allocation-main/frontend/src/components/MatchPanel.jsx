import { useEffect, useState, useCallback } from 'react';
import { getMatches, acceptMatch } from '../api/index.js';

const SKILL_EMOJI = {
  food_distribution: '🍱', medical_aid: '🏥', teaching: '📚',
  construction: '🏗', driving: '🚗', logistics: '📦',
  first_aid: '⚕️', counseling: '💬', community_outreach: '🤝',
  data_entry: '💻', language_translation: '🗣', fundraising: '💰',
};

function scoreClass(s) {
  if (s >= 0.9) return 'score-excellent';
  if (s >= 0.7) return 'score-good';
  return 'score-review';
}

function scoreLabel(s) {
  if (s >= 0.9) return { label:'Excellent', color:'#4ade80' };
  if (s >= 0.7) return { label:'Good',      color:'#818cf8' };
  return            { label:'Review',    color:'#fbbf24' };
}

export default function MatchPanel({ refresh }) {
  const [matches,  setMatches]  = useState([]);
  const [tab,      setTab]      = useState('pending');
  const [loading,  setLoading]  = useState(false);
  const [busy,     setBusy]     = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMatches({ status: tab });
      setMatches(res.data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load, refresh]);

  const handleAccept = async (matchId) => {
    setBusy(b => ({...b,[matchId]:true}));
    try {
      await acceptMatch(matchId);
      await load();
    } catch(e) { console.error(e); }
    finally { setBusy(b => ({...b,[matchId]:false})); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>
      <div className="panel-header">
        <span className="panel-title">🤝 Match Results</span>
        <button className="btn btn-ghost" onClick={load} style={{ fontSize:'0.65rem' }}>
          {loading ? <span className="spinner"/> : '↻'}
        </button>
      </div>

      <div className="tabs">
        {['pending','accepted','completed'].map(t => (
          <div
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>

      <div className="panel-scroll" id="match-panel-list">
        {matches.length === 0 && !loading && (
          <div style={{ textAlign:'center',color:'#475569',fontSize:'0.75rem',padding:'20px 0' }}>
            No {tab} matches. Run matching to generate pairs.
          </div>
        )}

        {matches.map(match => {
          const sl = scoreLabel(match.match_score);
          return (
            <div key={match.match_id} className="match-card" id={`match-card-${match.match_id}`}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontSize:'0.65rem', color:'#475569' }}>
                  {match.match_id}
                </span>
                <span style={{
                  fontSize:'0.65rem', fontWeight:700, color: sl.color,
                  background: `${sl.color}20`, padding:'1px 7px',
                  borderRadius:4, border:`1px solid ${sl.color}40`,
                }}>
                  {sl.label}
                </span>
              </div>

              {/* Volunteer → Need */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <div style={{
                  background:'rgba(99,102,241,0.15)', borderRadius:8,
                  padding:'6px 10px', flex:1, fontSize:'0.72rem',
                }}>
                  <div style={{ color:'#94a3b8', fontSize:'0.6rem', marginBottom:1 }}>VOLUNTEER</div>
                  <div style={{ color:'#c7d2fe', fontWeight:600 }}>{match.volunteer_id}</div>
                  {match.skill_overlap?.length > 0 && (
                    <div style={{ marginTop:3, display:'flex', gap:3, flexWrap:'wrap' }}>
                      {match.skill_overlap.map(s => (
                        <span key={s} style={{
                          fontSize:'0.6rem', background:'rgba(99,102,241,0.2)',
                          color:'#818cf8', padding:'1px 5px', borderRadius:3,
                        }}>
                          {SKILL_EMOJI[s] || '🔧'} {s.replace(/_/g,' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ color:'#4f46e5', fontSize:'1.1rem' }}>→</div>

                <div style={{
                  background:'rgba(239,68,68,0.08)', borderRadius:8,
                  padding:'6px 10px', flex:1, fontSize:'0.72rem',
                }}>
                  <div style={{ color:'#94a3b8', fontSize:'0.6rem', marginBottom:1 }}>NEED</div>
                  <div style={{ color:'#fca5a5', fontWeight:600 }}>{match.need_id}</div>
                </div>
              </div>

              {/* Meta row */}
              <div style={{ display:'flex', gap:12, fontSize:'0.65rem', color:'#64748b', marginBottom:6 }}>
                <span>📍 {match.distance_km} km</span>
                <span>📊 Score: <b style={{color:'#c7d2fe'}}>{(match.match_score*100).toFixed(0)}%</b></span>
                {match.assigned_at && (
                  <span>🕐 {new Date(match.assigned_at).toLocaleDateString()}</span>
                )}
              </div>

              {/* Score bar */}
              <div className="match-score-bar">
                <div
                  className={`match-score-fill ${scoreClass(match.match_score)}`}
                  style={{ width: `${match.match_score * 100}%` }}
                />
              </div>

              {tab === 'pending' && (
                <div style={{ marginTop:8 }}>
                  <button
                    className="btn btn-success"
                    onClick={() => handleAccept(match.match_id)}
                    disabled={busy[match.match_id]}
                    id={`accept-btn-${match.match_id}`}
                    style={{ fontSize:'0.68rem' }}
                  >
                    {busy[match.match_id] ? <span className="spinner"/> : '✅'} Accept Match
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
