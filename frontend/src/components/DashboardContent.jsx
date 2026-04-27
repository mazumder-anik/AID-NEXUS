import { useState } from 'react';
import Header from './Header.jsx';
import NeedsMap from './NeedsMap.jsx';

export default function DashboardContent() {
  const [mapRefresh, setMapRefresh] = useState(0);
  const [headerRefresh, setHeaderRefresh] = useState(0);
  const [demoSteps, setDemoSteps] = useState([]);

  const triggerRefresh = () => {
    setMapRefresh((value) => value + 1);
    setHeaderRefresh((value) => value + 1);
  };

  const handleDemoRun = async (data) => {
    setDemoSteps(data.demo_steps || []);
    setTimeout(() => setDemoSteps([]), 8000);
    triggerRefresh();
  };

  return (
    <div className="dashboard-page">
      <Header onDemoRun={handleDemoRun} onRefresh={headerRefresh} />

      <div className="dashboard-grid dashboard-grid-fullmap">
        <section className="dashboard-main-panel dashboard-main-panel-full">
          <div className="panel-header dashboard-map-header">
            <div>
              <span className="panel-title">🗺 Field Map</span>
              <div className="panel-subtitle">
                Full map view for a clearer, larger field overview.
              </div>
            </div>
          </div>
          <div className="dashboard-map-body">
            <NeedsMap refresh={mapRefresh} />
          </div>
        </section>
      </div>

      {demoSteps.length > 0 && (
        <div className="dashboard-footer">
          <div className="dashboard-footer-copy">
            <div>
              <div className="footer-title">⚡ Demo Flow Complete</div>
              <div className="footer-chip-row">
                {demoSteps.map((step, index) => (
                  <span key={index} className="footer-chip">{step}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
