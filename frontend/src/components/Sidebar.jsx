const SIDEBAR_ITEMS = [
  { key: 'home', label: 'Home', icon: '🏠', description: 'Welcome to AID-NEXUS' },
  { key: 'dashboard', label: 'Dashboard', icon: '🗺', description: 'Overview and active needs' },
  { key: 'analytics', label: 'Analytics', icon: '📊', description: 'Charts and trend analysis' },
  { key: 'needs', label: 'Urgent Needs', icon: '🚨', description: 'Open urgent requests' },
  { key: 'matches', label: 'Matches', icon: '🤝', description: 'Volunteer match results' },
  { key: 'uploads', label: 'Uploads', icon: '📂', description: 'Import survey data' },
  { key: 'ai', label: 'AI Assistant', icon: '✨', description: 'Ask the AI for insights' },
];

export default function Sidebar({ activeView, collapsed, onSelect, onToggleCollapse }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Hamburger — always top-right, never overlaps logo */}
      <button
        type="button"
        className="btn btn-ghost sidebar-logo-toggle"
        onClick={onToggleCollapse}
        title={collapsed ? 'Expand menu' : 'Collapse menu'}
        style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}
      >
        ☰
      </button>

      <div className="sidebar-logo" style={{ flexDirection: 'column', alignItems: 'center', padding: collapsed ? '52px 8px 12px' : '40px 8px 12px' }}>
        {/* Logo centered, below the hamburger */}
        <button
          type="button"
          className="sidebar-logo-icon"
          onClick={collapsed ? onToggleCollapse : undefined}
          title={collapsed ? 'Expand menu' : 'AID NEXUS'}
          style={{ background: 'none', border: 'none', cursor: collapsed ? 'pointer' : 'default', padding: 0, display: 'flex', justifyContent: 'center' }}
        >
          <img
            src="/logo.png"
            alt="AID NEXUS Logo"
            style={{
              height: collapsed ? '58px' : '78px',
              width: 'auto',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </button>

        {/* Brand text — only when expanded */}
        {!collapsed && (
          <div style={{ textAlign: 'center', marginTop: '1px', width: '100%' }}>
            <h2 style={{ margin: 0 }}>AID NEXUS</h2>
            <p style={{ margin: 0 }}>Resource Coordination</p>
          </div>
        )}
      </div>


      <nav className="sidebar-nav">
        {SIDEBAR_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`sidebar-nav-item ${activeView === item.key ? 'active' : ''}`}
            onClick={() => onSelect(item.key)}
            title={item.label}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!collapsed && (
              <span className="sidebar-label">{item.label}</span>
            )}
          </button>
        ))}
      </nav>

    </aside>
  );
}
