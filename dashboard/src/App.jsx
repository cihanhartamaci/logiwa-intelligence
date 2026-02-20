import React, { useState } from 'react';
import './Dashboard.css';

function App() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [monitoredUrls, setMonitoredUrls] = useState([
    { name: 'NetSuite Release Notes', url: 'https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/latest-release.html', category: 'ERPs' },
    { name: 'FedEx API Announcements', url: 'https://developer.fedex.com/api/en-us/announcements.html', category: 'Carriers' },
    { name: 'Amazon SP-API Blog', url: 'https://developer-docs.amazon.com/sp-api/blog', category: 'Marketplaces' },
    { name: 'Shopify Changelog', url: 'https://shopify.dev/changelog', category: 'Marketplaces' },
  ]);
  const [newUrl, setNewUrl] = useState({ name: '', url: '', category: 'ERPs' });
  const [showSettings, setShowSettings] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [githubPat, setGithubPat] = useState(localStorage.getItem('gh_pat') || '');
  const [frequency, setFrequency] = useState('Daily');
  const [isPaused, setIsPaused] = useState(false);

  const readinessData = [
    { integration: 'FedEx (SOAP)', status: 'Action Required', impact: 'Breaking Change', action: 'Migrate to REST' },
    { integration: 'Amazon SP-API', status: 'Needs Review', impact: 'Breaking Change', action: 'Verify Billing' },
    { integration: 'NetSuite', status: 'Ready', impact: 'New Capability', action: 'Review AI Features' },
    { integration: 'Shopify', status: 'Needs Review', impact: 'Maintenance', action: 'Plan GraphQL Migration' },
    { integration: 'Walmart', status: 'Ready', impact: 'New Capability', action: 'Evaluate Inventory API' },
  ];

  const categories = ['ERPs', 'Carriers', 'Marketplaces', 'General'];

  const handleAddUrl = (e) => {
    e.preventDefault();
    if (newUrl.name && newUrl.url) {
      setMonitoredUrls([...monitoredUrls, newUrl]);
      setNewUrl({ name: '', url: '', category: 'ERPs' });
      alert(`Source "${newUrl.name}" added successfully to category ${newUrl.category}.`);
    }
  };

  const runCycle = async () => {
    if (!githubPat) {
      alert("Please set your GitHub Personal Access Token in Settings first!\n\nRequirement: Token with 'repo' and 'workflow' scopes.");
      setShowSettings(true);
      return;
    }

    alert("Triggering GitHub Action via API...\nThis will analyze last release notes and send notifications for important changes.");
    // Real implementation: Octokit or Fetch to /repos/:owner/:repo/actions/workflows/:id/dispatches
  };

  const saveSettings = () => {
    localStorage.setItem('gh_pat', githubPat);
    setShowSettings(false);
    alert("Settings saved!");
  };

  const openReport = (report) => {
    setSelectedReport(report);
    setShowPdfViewer(true);
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
        <form onSubmit={handleAddUrl} style={{ padding: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Source Name</label>
            <input
              className="input-field"
              type="text"
              placeholder="e.g. UPS API Blog"
              value={newUrl.name}
              onChange={e => setNewUrl({ ...newUrl, name: e.target.value })}
            />
          </div>
          <div style={{ flex: 2, minWidth: '300px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>URL</label>
            <input
              className="input-field"
              type="url"
              placeholder="https://..."
              value={newUrl.url}
              onChange={e => setNewUrl({ ...newUrl, url: e.target.value })}
            />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Category</label>
            <select
              className="input-field"
              value={newUrl.category}
              onChange={e => setNewUrl({ ...newUrl, category: e.target.value })}
            >
              {categories.map(cat => <option key={cat}>{cat}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>Add Source</button>
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
                <th>Category</th>
                <th>Endpoint URL</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {monitoredUrls.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: '500' }}>{s.name}</td>
                  <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-cyan)' }}>{s.category}</span></td>
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
      {categories.map(cat => (
        <div className="card" key={cat}>
          <div className="card-header"><span className="card-title">{cat.toUpperCase()}</span></div>
          <div className="card-body">
            <ul style={{ listStyle: 'none' }}>
              {monitoredUrls.filter(u => u.category === cat).map((u, i) => (
                <li key={i} style={{ marginBottom: '0.5rem' }}>✅ {u.name} (Active)</li>
              ))}
              {monitoredUrls.filter(u => u.category === cat).length === 0 && (
                <li style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No active sources in this category.</li>
              )}
            </ul>
          </div>
        </div>
      ))}
    </section>
  );

  const renderReports = () => {
    const reports = [
      { id: 1, name: 'Weekly Intel Report - Feb 20', date: '2026-02-20', status: 'Sent', content: '# Weekly Intel Report - Feb 20\n\n## Summary\nCritical updates detected in FedEx and Amazon SP-API...\n\n### NetSuite 2026.1\n- AI-Powered Close Manager features announced.\n- Phased deployment started globally.\n\n### FedEx SOAP Retirement\n- Migration mandate reinforced for June 2026.\n- REST API documentation updated with new OAuth flow.' },
      { id: 2, name: 'Weekly Intel Report - Feb 13', date: '2026-02-13', status: 'Sent', content: '# Weekly Intel Report - Feb 13\n\n## Summary\nMaintenance updates for Shopify and Walmart...' },
    ];

    return (
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
              {reports.map(report => (
                <tr key={report.id}>
                  <td>{report.name}</td>
                  <td>{report.date}</td>
                  <td><span className="badge badge-green">{report.status}</span></td>
                  <td><button className="btn" onClick={() => openReport(report)}>View PDF</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  };

  const renderWorkflows = () => (
    <section className="grid">
      <div className="card">
        <div className="card-header"><span className="card-title">DAILY MONITOR</span></div>
        <div className="card-body">
          <p style={{ fontSize: '1.25rem' }}>Scheduled: 00:00 UTC</p>
          <p style={{ color: isPaused ? 'var(--accent-yellow)' : 'var(--accent-emerald)', marginTop: '0.5rem', fontWeight: 'bold' }}>
            Status: {isPaused ? 'Paused' : 'Enabled'}
          </p>
        </div>
        <div className="card-footer">
          <button className="btn" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? 'Resume Workflow' : 'Pause Workflow'}
          </button>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">DASHBOARD DEPLOY</span></div>
        <div className="card-body">
          <p style={{ fontSize: '1.25rem' }}>Trigger: Push to main</p>
          <p style={{ color: 'var(--accent-emerald)', marginTop: '0.5rem', fontWeight: 'bold' }}>Status: Enabled</p>
        </div>
        <div className="card-footer">
          <a href="https://github.com/cihanhartamaci/logiwa-intelligence/actions" target="_blank" rel="noopener noreferrer">
            <button className="btn">View Logs</button>
          </a>
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
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>GitHub Personal Access Token (PAT)</label>
              <input
                type="password"
                className="input-field"
                placeholder="ghp_xxxxxxxxxxxx"
                value={githubPat}
                onChange={e => setGithubPat(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                💡 <strong>Required:</strong> Needs <code>repo</code> and <code>workflow</code> scopes to update sources and trigger manual runs.
              </p>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Monitoring Frequency</label>
              <select className="input-field" value={frequency} onChange={e => setFrequency(e.target.value)}>
                <option>Hourly</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn" onClick={() => setShowSettings(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {showPdfViewer && selectedReport && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflowY: 'auto', background: '#fff', color: '#333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
              <img src="https://logiwa.com.tr/wp-content/uploads/2018/11/logo-web-site-300x138.png" alt="Logiwa" style={{ height: '30px' }} />
              <button className="btn" style={{ color: '#666' }} onClick={() => setShowPdfViewer(false)}>Close Viewer</button>
            </div>
            <div className="pdf-page">
              <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.6' }}>
                {selectedReport.content}
              </pre>
            </div>
            <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</button>
            </div>
          </div>
        </div>
      )}

      <aside className="sidebar">
        <div className="logo">
          <img
            src="https://logiwa.com.tr/wp-content/uploads/2018/11/logo-web-site-300x138.png"
            alt="Logiwa"
            style={{ width: '120px', marginBottom: '0.5rem' }}
          />
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
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>v1.1.0-beta</p>
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
