import { useState, useEffect } from 'react';
import { getDashboardStats, runDemo } from '../api/index.js';

const KPI_CONFIG = [
  { key: 'open_needs',           label: 'Open Needs',          icon: '📋', cls: 'critical' },
  { key: 'available_volunteers', label: 'Available Volunteers', icon: '👥', cls: 'primary'  },
  { key: 'active_matches',       label: 'Active Matches',       icon: '🤝', cls: 'warning'  },
  { key: 'resolved_needs',       label: 'Resolved',             icon: '✅', cls: 'success'  },
];

export default function Header({ onDemoRun, onRefresh }) {
  const [stats, setStats]     = useState(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast]     = useState(null);

  const fetchStats = async () => {
    try {
      const res = await getDashboardStats();
      setStats(res.data);
    } catch (e) {
      console.error('Stats fetch failed', e);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch when parent signals refresh
  useEffect(() => { fetchStats(); }, [onRefresh]);

  const handleDemo = async () => {
    setRunning(true);
    try {
      const res = await runDemo();
      setToast({ type: 'success', msg: `Demo complete! ${res.data.matches.length} matches created.` });
      onDemoRun && onDemoRun(res.data);
      await fetchStats();
    } catch (e) {
      setToast({ type: 'error', msg: 'Demo failed. Is the backend running?' });
    } finally {
      setRunning(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <>
      <div className="header-bar">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px' }}>
          <div>
            <h1 style={{ fontSize:'0.95rem', fontWeight:800, color:'#c7d2fe', letterSpacing:'0.01em' }}>
              🌐 AID NEXUX
            </h1>
            <p style={{ fontSize:'0.65rem', color:'#475569', marginTop:'1px' }}>
              NGO Volunteer Coordination Platform · Live Data
            </p>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <button
              className="btn btn-demo"
              onClick={handleDemo}
              disabled={running}
              id="demo-btn"
            >
              {running ? <><span className="spinner" style={{marginRight:6}}/>Running Demo…</> : '⚡ Run Demo Flow'}
            </button>
          </div>
        </div>

        <div className="kpi-grid">
          {KPI_CONFIG.map(cfg => (
            <div key={cfg.key} className={`kpi-card ${cfg.cls}`} id={`kpi-${cfg.key}`}>
              <span className="kpi-icon">{cfg.icon}</span>
              <div>
                <div className="kpi-label">{cfg.label}</div>
                <div className="kpi-value">
                  {stats ? stats[cfg.key] ?? '—' : <span className="spinner" />}
                </div>
              </div>
            </div>
          ))}
          {stats && (
            <div className="kpi-card" style={{minWidth:'auto',flexShrink:0}}>
              <span className="kpi-icon">🎯</span>
              <div>
                <div className="kpi-label">Coverage</div>
                <div className="kpi-value" style={{color:'#818cf8'}}>{stats.coverage_pct}%</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </>
  );
}
