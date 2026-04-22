import { useState } from 'react';
import { getDashboardStats } from '../api/index.js';
import Header          from '../components/Header.jsx';
import NeedsMap        from '../components/NeedsMap.jsx';
import UrgentNeedsPanel from '../components/UrgentNeedsPanel.jsx';
import MatchPanel       from '../components/MatchPanel.jsx';
import UploadPanel      from '../components/UploadPanel.jsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer
} from 'recharts';

const CAT_COLORS = {
  food:'#fbbf24', medical:'#f87171', education:'#818cf8',
  shelter:'#34d399', sanitation:'#38bdf8',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{
        background:'#151d35', border:'1px solid rgba(99,102,241,0.3)',
        borderRadius:8, padding:'8px 12px', fontSize:'0.72rem',
      }}>
        <p style={{color:'#c7d2fe',fontWeight:600}}>{label}: {payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [mapRefresh,   setMapRefresh]   = useState(0);
  const [rightRefresh, setRightRefresh] = useState(0);
  const [headerRef,    setHeaderRef]    = useState(0);
  const [rightTab,     setRightTab]     = useState('needs');  // needs | upload
  const [catData,      setCatData]      = useState([]);
  const [demoSteps,    setDemoSteps]    = useState([]);

  const triggerRefresh = () => {
    setMapRefresh(r => r + 1);
    setRightRefresh(r => r + 1);
    setHeaderRef(r => r + 1);
  };

  const handleDemoRun = async (data) => {
    // Show demo steps overlay briefly
    setDemoSteps(data.demo_steps || []);
    setTimeout(() => setDemoSteps([]), 8000);
    triggerRefresh();
    // Update bottom bar chart
    if (data.stats?.needs_by_category) {
      const cd = Object.entries(data.stats.needs_by_category).map(([k,v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1), value: v,
        color: CAT_COLORS[k] || '#818cf8',
      }));
      setCatData(cd);
    }
  };

  const handleMatchRun = () => triggerRefresh();
  const handleUploadDone = () => triggerRefresh();

  // Load initial cat data
  const loadStats = async () => {
    try {
      const res = await getDashboardStats();
      const cd = Object.entries(res.data.needs_by_category || {}).map(([k,v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1), value: v,
        color: CAT_COLORS[k] || '#818cf8',
      }));
      setCatData(cd);
    } catch(e) {}
  };

  useState(() => { loadStats(); }, []);

  return (
    <div className="main-content">
      <Header onDemoRun={handleDemoRun} onRefresh={headerRef} />

      <div className="dashboard-body">
        {/* Left: Map */}
        <div className="map-panel">
          <NeedsMap refresh={mapRefresh} />
        </div>

        {/* Right: Needs / Upload tabs + Match panel */}
        <div className="right-panel">
          {/* Tab bar */}
          <div style={{
            display:'flex', borderBottom:'1px solid rgba(99,102,241,0.15)',
            background:'rgba(15,22,41,0.9)', flexShrink:0,
          }}>
            <div
              className={`tab ${rightTab==='needs'?'active':''}`}
              onClick={() => setRightTab('needs')}
            >🚨 Urgent Needs</div>
            <div
              className={`tab ${rightTab==='upload'?'active':''}`}
              onClick={() => setRightTab('upload')}
            >📂 Upload</div>
          </div>

          {rightTab === 'needs' ? (
            <UrgentNeedsPanel
              refresh={rightRefresh}
              onMatchRun={handleMatchRun}
            />
          ) : (
            <div style={{ height:'50%', overflowY:'auto', borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
              <UploadPanel onUploadDone={handleUploadDone}/>
            </div>
          )}

          <MatchPanel refresh={rightRefresh} />
        </div>

        {/* Bottom: Category bar chart + Demo steps */}
        <div className="bottom-panel">
          {demoSteps.length > 0 ? (
            <div style={{ flex:1, padding:'0 12px' }}>
              <div style={{ fontSize:'0.72rem', fontWeight:700, color:'#c7d2fe', marginBottom:6 }}>
                ⚡ Demo Flow Complete
              </div>
              <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                {demoSteps.map((step,i) => (
                  <div key={i} className="demo-step" style={{ color:'#4ade80' }}>{step}</div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div style={{ minWidth:180, paddingRight:20 }}>
                <div style={{ fontSize:'0.7rem', fontWeight:700, color:'#c7d2fe', marginBottom:4 }}>
                  📊 Needs by Category
                </div>
                {catData.length === 0 && (
                  <div style={{ fontSize:'0.65rem', color:'#475569' }}>
                    Click "Run Demo Flow" to populate data
                  </div>
                )}
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={catData} barCategoryGap="25%">
                  <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {catData.map((e,i) => <Cell key={i} fill={e.color}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
