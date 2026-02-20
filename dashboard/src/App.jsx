import React, { useState } from 'react';
import './Dashboard.css';

function App() {
  const [activeTab, setActiveTab] = useState('Overview');

  const readinessData = [
    { integration: 'FedEx (SOAP)', status: 'Action Required', impact: 'Breaking Change', action: 'Migrate to REST' },
    { integration: 'Amazon SP-API', status: 'Needs Review', impact: 'Breaking Change', action: 'Verify Billing' },
    { integration: 'NetSuite', status: 'Ready', impact: 'New Capability', action: 'Review AI Features' },
    { integration: 'Shopify', status: 'Needs Review', impact: 'Maintenance', action: 'Plan GraphQL Migration' },
    { integration: 'Walmart', status: 'Ready', impact: 'New Capability', action: 'Evaluate Inventory API' },
  ];

  const renderOverview = () => (
    <>
      <section className="grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">CRITICAL ALERT</span>
            <span className="badge badge-red">Breaking</span>
          </div>
          <div className="card-body">
            <h2>FedEx SOAP Retirement</h2>
            <p style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>Deadline: June 1, 2026</p>
          </div>
          <div className="card-footer">
            <p>112 days remaining for migration.</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">ACTIVE WORKFLOWS</span>
            <span className="badge badge-green">Healthy</span>
          </div>
          <div className="card-body">
            <h2>Integration Monitor</h2>
            <p>Last run: 14 mins ago</p>
          </div>
          <div className="card-footer">
            <p>GitHub Actions Status: \u2705 Success</p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">NEW CAPABILITY</span>
            <span className="badge badge-yellow">Review</span>
          </div>
          <div className="card-body">
            <h2>NetSuite 2026.1</h2>
            <p>AI-Powered Close Manager</p>
          </div>
          <div className="card-footer">
            <p>Deployment in progress (Phased).</p>
          </div>
        </div>
      </section>

      <section className="data-table-container">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Readiness Matrix</h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Updated: Feb 20, 2026</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Integration Name</th>
              <th>Status</th>
              <th>Impact Area</th>
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {readinessData.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight: '500' }}>{row.integration}</td>
                <td>
                  <span className={`status-dot ${row.status === 'Ready' ? 'status-ready' :
                    row.status === 'Action Required' ? 'status-action' : 'status-review'
                    }`}></span>
                  {row.status}
                </td>
                <td>{row.impact}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );

  const renderMonitoredURLs = () => (
    <section className="data-table-container">
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.125rem' }}>Active Monitoring Sources</h3>
      </div>
      <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
        <p>Currently watching 12 documentation and release note endpoints.</p>
        <ul style={{ marginTop: '1rem', listStyle: 'none' }}>
          <li>\u2022 NetSuite Release Notes</li>
          <li>\u2022 FedEx API Announcements</li>
          <li>\u2022 Amazon SP-API Blog</li>
          <li>\u2022 Shopify Changelog</li>
        </ul>
      </div>
    </section>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return renderOverview();
      case 'Monitored URLs':
        return renderMonitoredURLs();
      default:
        return (
          <div style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
            <p>{activeTab} module is initializing...</p>
          </div>
        );
    }
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="logo">
          <span>\u1F4E6</span>
          <span>Logiwa Intelligence</span>
        </div>
        <ul className="nav-links">
          {['Overview', 'Monitored URLs', 'Topics', 'Reports', 'Workflows'].map(tab => (
            <li key={tab} className="nav-item">
              <a
                href="#"
                className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(tab);
                }}
              >
                {tab}
              </a>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>v1.0.0-beta</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="title-area">
            <h1>{activeTab}</h1>
            <p>Intelligence summary for the Logiwa Integration Team.</p>
          </div>
          <div className="actions">
            <button className="btn">Settings</button>
            <button className="btn btn-primary">Run Intelligence Cycle</button>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}


export default App;
