const SIDEBAR_ITEMS = [
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
      <div className="sidebar-logo">
        <div className="sidebar-logo-brand">
          <button
            type="button"
            className="sidebar-logo-icon"
            onClick={collapsed ? onToggleCollapse : undefined}
            title={collapsed ? 'Expand menu' : 'SmartAlloc'}
          >
            <span className="icon-content">{collapsed ? '🌐' : '🌐'}</span>
          </button>
          {!collapsed && (
            <div>
              <h2>SmartAlloc</h2>
              <p>Resource Coordination</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            type="button"
            className="btn btn-ghost sidebar-logo-toggle"
            onClick={onToggleCollapse}
            title="Collapse menu"
          >
            ☰
          </button>
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
