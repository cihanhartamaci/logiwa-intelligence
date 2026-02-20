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

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="logo">
          <span>📦</span>
          <span>Logiwa Intelligence</span>
        </div>
        <ul className="nav-links">
          {['Overview', 'Monitored URLs', 'Topics', 'Reports', 'Workflows'].map(tab => (
            <li key={tab} className="nav-item">
              <a
                href="#"
                className={`nav-link ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
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
              <p>GitHub Actions Status: ✅ Success</p>
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
      </main>
    </div>
  );
}

export default App;
