import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import DashboardContent from './components/DashboardContent.jsx';
import UrgentNeedsPanel from './components/UrgentNeedsPanel.jsx';
import MatchPanel from './components/MatchPanel.jsx';
import UploadPanel from './components/UploadPanel.jsx';
import AIAssistant from './components/AIAssistant.jsx';
import Analytics from './pages/Analytics.jsx';
import './index.css';

const VIEW_TITLES = {
  needs: 'Urgent Needs',
  matches: 'Match Results',
  uploads: 'Upload Center',
  ai: 'AI Assistant',
};

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey((value) => value + 1);

  const renderFullScreenView = () => {
    switch (activeView) {
      case 'needs':
        return <UrgentNeedsPanel refresh={refreshKey} onMatchRun={triggerRefresh} />;
      case 'matches':
        return <MatchPanel refresh={refreshKey} />;
      case 'uploads':
        return <UploadPanel onUploadDone={triggerRefresh} />;
      case 'ai':
        return <AIAssistant />;
      default:
        return null;
    }
  };

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        activeView={activeView}
        collapsed={sidebarCollapsed}
        onSelect={setActiveView}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />

      <main className="main-content">
        {activeView === 'analytics' ? (
          <div className="page-panel full-screen-panel">
            <Analytics />
          </div>
        ) : activeView === 'dashboard' ? (
          <DashboardContent />
        ) : (
          <div className="page-panel full-screen-panel">
            <div className="fullview-header">
              <div>
                <h1>{VIEW_TITLES[activeView] || 'Panel'}</h1>
                <p className="panel-subtitle">
                  {activeView === 'needs' && 'Review and action urgent field requests.'}
                  {activeView === 'matches' && 'Manage volunteer assignments and match outcomes.'}
                  {activeView === 'uploads' && 'Import field survey data and refresh the model.'}
                  {activeView === 'ai' && 'Get AI-driven guidance on needs, matching, and priorities.'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost fullview-close"
                onClick={() => setActiveView('dashboard')}
                aria-label="Close panel"
              >
                ×
              </button>
            </div>
            <div className="fullview-body">{renderFullScreenView()}</div>
          </div>
        )}
      </main>
    </div>
  );
}
