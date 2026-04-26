import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { getDashboardStats, getSkillDistribution, getTimeline } from '../api/index.js';

const COLORS = ['#6366f1','#f87171','#fbbf24','#34d399','#38bdf8','#a78bfa','#fb923c'];

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
        <p style={{color:'#c7d2fe',fontWeight:600,marginBottom:4}}>{label}</p>
        {payload.map((p,i) => (
          <p key={i} style={{color:p.color}}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [stats,  setStats]  = useState(null);
  const [skills, setSkills] = useState(null);
  const [tl,     setTl]     = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, sk, t] = await Promise.all([
        getDashboardStats(), getSkillDistribution(), getTimeline(),
      ]);
      setStats(s.data);
      setSkills(sk.data);
      setTl(t.data);
    } catch(e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Prepare chart data
  const catData = stats ? Object.entries(stats.needs_by_category).map(([k,v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1), value: v, color: CAT_COLORS[k] || '#818cf8',
  })) : [];

  const skillData = skills ? Object.entries(skills.skills)
    .sort((a,b) => b[1]-a[1])
    .slice(0,10)
    .map(([k,v]) => ({ name: k.replace(/_/g,' '), count: v }))
    : [];

  const timelineData = tl ? Object.entries(tl.timeline).map(([week, vals]) => ({
    week, open: vals.open || 0, resolved: vals.resolved || 0,
  })) : [];

  return (
    <div style={{
      height:'100%', overflowY:'auto', padding:'20px 24px',
      background:'#0a0e1a',
    }}>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:'1rem', fontWeight:800, color:'#c7d2fe' }}>📊 Analytics Dashboard</h2>
        <p style={{ fontSize:'0.7rem', color:'#475569', marginTop:2 }}>
          Real-time insights from aggregated community data
        </p>
      </div>

      {/* Stats cards row */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total Needs',      value:stats.total_needs,       icon:'📋', color:'#818cf8' },
            { label:'Total Volunteers', value:stats.total_volunteers,  icon:'👥', color:'#38bdf8' },
            { label:'Total Matches',    value:stats.total_matches,     icon:'🤝', color:'#fbbf24' },
            { label:'Coverage',         value:`${stats.coverage_pct}%`,icon:'🎯', color:'#4ade80' },
          ].map(c => (
            <div key={c.label} style={{
              background:'rgba(21,29,53,0.8)', border:'1px solid rgba(99,102,241,0.2)',
              borderRadius:10, padding:'14px 18px',
            }}>
              <div style={{ fontSize:'1.4rem' }}>{c.icon}</div>
              <div style={{ fontSize:'1.6rem', fontWeight:800, color:c.color, marginTop:4 }}>{c.value}</div>
              <div style={{ fontSize:'0.65rem', color:'#475569', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

        {/* Bar: Needs by Category */}
        <div style={{
          background:'rgba(21,29,53,0.8)', border:'1px solid rgba(99,102,241,0.2)',
          borderRadius:10, padding:'16px',
        }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#c7d2fe', marginBottom:12 }}>
            📋 Needs by Category
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={catData} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:'#64748b', fontSize:11 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="value" radius={[4,4,0,0]}>
                {catData.map((e,i) => <Cell key={i} fill={e.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie: Volunteer skill distribution */}
        <div style={{
          background:'rgba(21,29,53,0.8)', border:'1px solid rgba(99,102,241,0.2)',
          borderRadius:10, padding:'16px',
        }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#c7d2fe', marginBottom:12 }}>
            👥 Volunteer Skills Distribution
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={skillData}
                dataKey="count"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={65}
                innerRadius={30}
                stroke="none"
              >
                {skillData.map((e,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip content={<CustomTooltip/>}/>
              <Legend
                formatter={(v) => <span style={{color:'#94a3b8', fontSize:11}}>{v}</span>}
                iconSize={10}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        background:'rgba(21,29,53,0.8)', border:'1px solid rgba(99,102,241,0.2)',
        borderRadius:10, padding:'16px', marginBottom:16,
      }}>
        <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#c7d2fe', marginBottom:12 }}>
          📈 Needs Over Time (Open vs Resolved)
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={timelineData}>
            <defs>
              <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)"/>
            <XAxis dataKey="week" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
            <YAxis tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Legend formatter={(v) => <span style={{color:'#94a3b8', fontSize:11}}>{v}</span>}/>
            <Area type="monotone" dataKey="open"     name="Open"     stroke="#6366f1" fill="url(#openGrad)"     strokeWidth={2}/>
            <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#22c55e" fill="url(#resolvedGrad)" strokeWidth={2}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Skill bar chart */}
      <div style={{
        background:'rgba(21,29,53,0.8)', border:'1px solid rgba(99,102,241,0.2)',
        borderRadius:10, padding:'16px',
      }}>
        <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#c7d2fe', marginBottom:12 }}>
          🔧 Top 10 Volunteer Skills
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={skillData} layout="vertical" barCategoryGap="20%">
            <XAxis type="number" tick={{ fill:'#64748b', fontSize:10 }} axisLine={false} tickLine={false}/>
            <YAxis type="category" dataKey="name" tick={{ fill:'#94a3b8', fontSize:10 }}
              axisLine={false} tickLine={false} width={110}/>
            <Tooltip content={<CustomTooltip/>}/>
            <Bar dataKey="count" fill="#6366f1" radius={[0,4,4,0]}>
              {skillData.map((e,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
