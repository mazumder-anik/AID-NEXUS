import React, { useState } from 'react';
import '../index.css';

export default function Home({ onNavigate }) {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    
    // Tilt angle multiplier (max 20 degrees)
    setTilt({ x: -y * 40, y: x * 40 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 }); // reset on leave
  };

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-content">
          <h1 className="hero-title">
            <span className="text-yellow">AID NEXUS</span> <br />
            Resource Coordination
          </h1>
          <p className="hero-subtitle">
            An intelligent platform designed for NGOs to optimize aid distribution, 
            match volunteers efficiently, and address urgent community needs in real-time.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => onNavigate('dashboard')}>
              Go to Dashboard
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => setIsPopupOpen(true)}>
              Learn More
            </button>
          </div>
        </div>
        <div 
          className="home-hero-visual" 
          onMouseMove={handleMouseMove} 
          onMouseLeave={handleMouseLeave}
          style={{ perspective: '1000px' }}
        >
          {/* Abstract visual representation of the project */}
          <div 
            className="abstract-globe"
            style={{ 
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
          >
            <div className="orbit orbit-1">
              <div className="node node-a"></div>
              <div className="node node-e"></div>
            </div>
            <div className="orbit orbit-2">
              <div className="node node-b"></div>
              <div className="node node-d"></div>
              <div className="node node-f"></div>
            </div>
            <div className="orbit orbit-3">
              <div className="node node-c"></div>
              <div className="node node-g"></div>
            </div>
            <div className="node center-node"></div>
          </div>
        </div>
      </section>

      {/* Learn More Popup */}
      {isPopupOpen && (
        <div className="popup-overlay" onClick={() => setIsPopupOpen(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <button className="popup-close-left" onClick={() => setIsPopupOpen(false)}>×</button>
            <h2>About AID NEXUS</h2>
            <p>AID NEXUS is a comprehensive, AI-powered system designed to streamline the operations of NGOs and crisis response teams.</p>
            <ul>
              <li><strong>Data Aggregation:</strong> We pull real-time data from field operatives, social channels, and official reports.</li>
              <li><strong>AI Analysis:</strong> Our advanced generative AI analyzes context to automatically suggest the most effective distribution strategies.</li>
              <li><strong>Smart Volunteer Matching:</strong> Ensures the right person is assigned to the right task based on skill, location, and urgency.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Professional Data / Features Section */}
      <section className="home-features">
        <div className="feature-header">
          <h2>Why AID NEXUS?</h2>
          <p>Our platform leverages data aggregation and smart matching algorithms to maximize impact.</p>
        </div>
        
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">📡</div>
            <h3>Real-Time Aggregation</h3>
            <p>We seamlessly combine field surveys, NGO reports, and paper forms into a single, unified data stream.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>Urgency Scoring</h3>
            <p>Our proprietary scoring algorithm prioritizes needs based on severity, population density, and time decay.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>Smart Matching</h3>
            <p>Volunteers are matched to tasks using skill overlaps, geofencing, and availability to ensure rapid response.</p>
          </div>
        </div>
      </section>

      {/* Global Impact Stats (Static/Mock Professional Data) */}
      <section className="home-impact">
        <h2>Global Impact Potential</h2>
        <div className="impact-stats">
          <div className="impact-stat">
            <span className="stat-number">98%</span>
            <span className="stat-label">Faster Response Times</span>
          </div>
          <div className="impact-stat">
            <span className="stat-number">10k+</span>
            <span className="stat-label">Communities Served</span>
          </div>
          <div className="impact-stat">
            <span className="stat-number">24/7</span>
            <span className="stat-label">AI Coordination</span>
          </div>
          <div className="impact-stat">
            <span className="stat-number">Zero</span>
            <span className="stat-label">Data Privacy Breaches</span>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; 2026 AID NEXUS Resource Coordination. All rights reserved.</p>
        <div className="footer-links">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Contact Support</span>
        </div>
      </footer>
    </div>
  );
}
