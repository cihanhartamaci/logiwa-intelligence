import React, { useState } from 'react';
import './Dashboard.css';

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [monitoredUrls, setMonitoredUrls] = useState([
    { name: 'NetSuite Release Notes', url: 'https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/latest-release.html' },
    { name: 'FedEx API Announcements', url: 'https://developer.fedex.com/api/en-us/announcements.html' },
    { name: 'Amazon SP-API Blog', url: 'https://developer-docs.amazon.com/sp-api/blog' },
    { name: 'Shopify Changelog', url: 'https://shopify.dev/changelog' },
  ]);
  const [newUrl, setNewUrl] = useState({ name: '', url: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [githubPat, setGithubPat] = useState(localStorage.getItem('gh_pat') || '');
  const [frequency, setFrequency] = useState('Daily');

  const readinessData = [
    { integration: 'FedEx (SOAP)', status: 'Action Required', impact: 'Breaking Change', action: 'Migrate to REST' },
    { integration: 'Amazon SP-API', status: 'Needs Review', impact: 'Breaking Change', action: 'Verify Billing' },
    { integration: 'NetSuite', status: 'Ready', impact: 'New Capability', action: 'Review AI Features' },
    { integration: 'Shopify', status: 'Needs Review', impact: 'Maintenance', action: 'Plan GraphQL Migration' },
    { integration: 'Walmart', status: 'Ready', impact: 'New Capability', action: 'Evaluate Inventory API' },
  ];

  const handleAddUrl = (e) => {
    e.preventDefault();
    if (newUrl.name && newUrl.url) {
      setMonitoredUrls([...monitoredUrls, newUrl]);
      setNewUrl({ name: '', url: '' });
      alert(`Source "${newUrl.name}" added locally. (API Integration pending)`);
    }
  };

  const runCycle = async () => {
    if (!githubPat) {
      alert("Please set your GitHub Personal Access Token in Settings first!");
      setShowSettings(true);
      return;
    }

    alert("Triggering GitHub Action via API... (Demo Mode)");
    // Real implementation would use fetch() to GitHub API
  };

  const saveSettings = () => {
    localStorage.setItem('gh_pat', githubPat);
    setShowSettings(false);
    alert("Settings saved!");
  };

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
    </>
  );

  const renderMonitoredURLs = () => (
    <>
      <section className="data-table-container" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Add New Source</h3>
        </div>
        <form onSubmit={handleAddUrl} style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Source Name (e.g. UPS API Blog)</label>
            <input
              className="input-field"
              type="text"
              placeholder="Name"
              value={newUrl.name}
              onChange={e => setNewUrl({ ...newUrl, name: e.target.value })}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>URL</label>
            <input
              className="input-field"
              type="url"
              placeholder="https://..."
              value={newUrl.url}
              onChange={e => setNewUrl({ ...newUrl, url: e.target.value })}
            />
          </div>
          <button type="submit" className="btn btn-primary">Add Source</button>
        </form>
      </section>

      <section className="data-table-container">
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Active Monitoring Sources</h3>
        </div>
        <div style={{ padding: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Source Name</th>
                <th>Endpoint URL</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {monitoredUrls.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '500' }}>{s.name}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{s.url}</td>
                  <td><span className="badge badge-green">Monitoring</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );

  const renderTopics = () => (
    <section className="grid">
      <div className="card">
        <div className="card-header"><span className="card-title">ERPs</span></div>
        <div className="card-body">
          <ul style={{ listStyle: 'none' }}>
            <li style={{ marginBottom: '0.5rem' }}>✅ NetSuite (Active)</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ SAP Business One (Active)</li>
            <li style={{ color: 'var(--text-secondary)' }}>⏳ Microsoft Dynamics (Planned)</li>
          </ul>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">CARRIERS</span></div>
        <div className="card-body">
          <ul style={{ listStyle: 'none' }}>
            <li style={{ marginBottom: '0.5rem' }}>✅ FedEx (Active)</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ UPS (Active)</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ USPS (Active)</li>
          </ul>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">MARKETPLACES</span></div>
        <div className="card-body">
          <ul style={{ listStyle: 'none' }}>
            <li style={{ marginBottom: '0.5rem' }}>✅ Amazon SP-API (Active)</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ Shopify (Active)</li>
            <li style={{ marginBottom: '0.5rem' }}>✅ Walmart (Active)</li>
          </ul>
        </div>
      </div>
    </section>
  );

  const renderReports = () => (
    <section className="data-table-container">
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.125rem' }}>Intelligence Reports Archive</h3>
      </div>
      <div style={{ padding: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Date Generated</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Weekly Intel Report - Feb 20</td>
              <td>2026-02-20</td>
              <td><span className="badge badge-green">Sent</span></td>
              <td><button className="btn">View PDF</button></td>
            </tr>
            <tr>
              <td>Weekly Intel Report - Feb 13</td>
              <td>2026-02-13</td>
              <td><span className="badge badge-green">Sent</span></td>
              <td><button className="btn">View PDF</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderWorkflows = () => (
    <section className="grid">
      <div className="card">
        <div className="card-header"><span className="card-title">DAILY MONITOR</span></div>
        <div className="card-body">
          <p style={{ fontSize: '1.25rem' }}>Scheduled: 00:00 UTC</p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Status: Enabled</p>
        </div>
        <div className="card-footer">
          <button className="btn">Pause Workflow</button>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">DASHBOARD DEPLOY</span></div>
        <div className="card-body">
          <p style={{ fontSize: '1.25rem' }}>Trigger: Push to main</p>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Status: Enabled</p>
        </div>
        <div className="card-footer">
          <button className="btn">View Logs</button>
        </div>
      </div>
    </section>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'Overview':
        return renderOverview();
      case 'Monitored URLs':
        return renderMonitoredURLs();
      case 'Topics':
        return renderTopics();
      case 'Reports':
        return renderReports();
      case 'Workflows':
        return renderWorkflows();
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
      {showSettings && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem' }}>Dashboard Settings</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>GitHub Personal Access Token</label>
              <input
                type="password"
                className="input-field"
                placeholder="ghp_xxxxxxxxxxxx"
                value={githubPat}
                onChange={e => setGithubPat(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Required to trigger manually workflows. Token is stored in browser localStorage.
              </p>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Monitoring Frequency</label>
              <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value)}>
                <option>Hourly</option>
                <option>Daily</option>
                <option>Weekly</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

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
            <button className="btn" onClick={() => setShowSettings(true)}>Settings</button>
            <button className="btn btn-primary" onClick={runCycle}>Run Intelligence Cycle</button>
          </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
}



export default App;
