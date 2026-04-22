import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Analytics  from './pages/Analytics.jsx';
import './index.css';

const NAV_ITEMS = [
  { to:'/',          icon:'🗺',  label:'Dashboard'  },
  { to:'/analytics', icon:'📊', label:'Analytics'  },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div style={{ fontSize:'1.4rem', marginBottom:4 }}>🌐</div>
            <h2>SmartAlloc</h2>
            <p>Resource Coordination</p>
          </div>

          <nav style={{ flex:1 }}>
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `sidebar-nav-item${isActive ? ' active' : ''}`
                }
              >
                <span style={{ fontSize:'1rem' }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Footer */}
          <div style={{
            padding:'16px 20px',
            borderTop:'1px solid rgba(99,102,241,0.15)',
            fontSize:'0.6rem', color:'#334155',
          }}>
            <div style={{ color:'#4f46e5', fontWeight:700, marginBottom:2 }}>v1.0.0</div>
            <div>Hackathon Demo</div>
            <div style={{ marginTop:4 }}>
              FastAPI · React · SQLite<br/>
              Leaflet · Recharts
            </div>
          </div>
        </aside>

        {/* Page content */}
        <Routes>
          <Route path="/"          element={<Dashboard />}  />
          <Route path="/analytics" element={
            <div className="main-content" style={{ overflow:'auto' }}>
              <Analytics />
            </div>
          }/>
        </Routes>
      </div>
    </BrowserRouter>
  );
}
