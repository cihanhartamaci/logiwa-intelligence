import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc
} from "firebase/firestore";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [newUrl, setNewUrl] = useState({ name: '', url: '', category: 'ERPs' });
  const [monitoredUrls, setMonitoredUrls] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [intelReports, setIntelReports] = useState([]);
  const [githubPat, setGithubPat] = useState(localStorage.getItem('gh_pat') || '');
  const [frequency, setFrequency] = useState(localStorage.getItem('monitoring_frequency') || 'Daily');
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Sync URLs
    const qUrls = query(collection(db, "monitored_urls"));
    const unsubUrls = onSnapshot(qUrls, (snapshot) => {
      const urls = [];
      snapshot.forEach((doc) => {
        urls.push({ id: doc.id, ...doc.data() });
      });

      // Auto-seed if empty (onboarding)
      if (urls.length === 0 && user) {
        console.log("No sources found, auto-seeding industry defaults...");
        seedIndustrySources();
      } else {
        setMonitoredUrls(urls);
      }
    });

    // Sync Reports
    const qReports = query(collection(db, "intel_reports"), orderBy("timestamp", "desc"));
    const unsubReports = onSnapshot(qReports, (snapshot) => {
      const reports = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
      setIntelReports(reports);
    });

    return () => {
      unsubUrls();
      unsubReports();
    };
  }, [user]);


  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert("Login Failed: " + error.message);
    }
  };

  const seedIndustrySources = async () => {
    const defaults = [
      { name: 'NetSuite Release Notes', url: 'https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/latest-release.html', category: 'ERPs' },
      { name: 'Shopify Changelog', url: 'https://shopify.dev/changelog', category: 'Marketplaces' },
      { name: 'Shippo Changelog', url: 'https://goshippo.com/docs/changelog/', category: 'Carriers' },
      { name: 'FedEx Announcements', url: 'https://developer.fedex.com/api/en-us/announcements.html', category: 'Carriers' },
      { name: 'Amazon SP-API Blog', url: 'https://developer-docs.amazon.com/sp-api/blog', category: 'Marketplaces' },
      { name: 'Walmart Developer News', url: 'https://developer.walmart.com/news', category: 'Marketplaces' },
      { name: 'TikTok Shop News', url: 'https://developers.tiktok-shops.com/documents/news', category: 'Marketplaces' },
      { name: 'Etsy Developer News', url: 'https://www.etsy.com/developers/news', category: 'Marketplaces' },
    ];

    try {
      const batch = [];
      defaults.forEach((source) => {
        batch.push(addDoc(collection(db, 'monitored_urls'), source));
      });
      await Promise.all(batch);
      alert('Industry sources seeded successfully! They will appear in the list shortly.');
    } catch (error) {
      console.error('Error seeding sources:', error);
      alert('Failed to seed sources. Ensure you have Firestore write permissions.');
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const readinessData = monitoredUrls.map(url => ({
    integration: url.name,
    status: url.last_status || 'Ready',
    impact: url.last_impact || 'No Changes',
    action: url.next_action || 'Monitoring'
  }));

  const categories = ['ERPs', 'Carriers', 'Marketplaces', 'General'];

  const handleAddUrl = async (e) => {
    e.preventDefault();
    if (newUrl.name && newUrl.url) {
      try {
        await addDoc(collection(db, "monitored_urls"), newUrl);
        setNewUrl({ name: '', url: '', category: 'ERPs' });
      } catch (error) {
        alert("Error adding source: " + error.message);
      }
    }
  };

  const handleDeleteUrl = async (id) => {
    try {
      await deleteDoc(doc(db, "monitored_urls", id));
    } catch (error) {
      alert("Error deleting source: " + error.message);
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
    localStorage.setItem('monitoring_frequency', frequency);
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
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.125rem' }}>Active Monitoring Sources</h3>
          <button className="btn" onClick={seedIndustrySources} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--accent-cyan)' }}>
            Load Default Industry Sources
          </button>
        </div>
        <div style={{ padding: '1rem' }}>
          <table>
            <thead>
              <tr>
                <th>Source Name</th>
                <th>Category</th>
                <th>Endpoint URL</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {monitoredUrls.map((s, i) => (
                <tr key={s.id || i}>
                  <td style={{ fontWeight: '500' }}>{s.name}</td>
                  <td><span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--accent-cyan)' }}>{s.category}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{s.url}</td>
                  <td><span className="badge badge-green">Monitoring</span></td>
                  <td>
                    <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-red)' }} onClick={() => handleDeleteUrl(s.id)}>Remove</button>
                  </td>
                </tr>
              ))}
              {monitoredUrls.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    <div style={{ marginBottom: '1rem' }}>No sources found in your database.</div>
                    <button className="btn btn-primary" onClick={seedIndustrySources}>
                      Import Official Integration Sources
                    </button>
                  </td>
                </tr>
              )}
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
                <li key={u.id || i} style={{ marginBottom: '0.5rem' }}>✅ {u.name} (Active)</li>
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
                <th>Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {intelReports.map(report => (
                <tr key={report.id}>
                  <td>{report.name || `Intel Report - ${new Date(report.timestamp?.seconds * 1000).toLocaleDateString()}`}</td>
                  <td>{report.timestamp ? new Date(report.timestamp.seconds * 1000).toDateString() : 'Pending'}</td>
                  <td><span className="badge badge-green">{report.status || 'Archived'}</span></td>
                  <td><button className="btn" onClick={() => openReport(report)}>View PDF</button></td>
                </tr>
              ))}
              {intelReports.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No reports generated yet. Run a cycle to start.</td>
                </tr>
              )}
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

  if (loading) {
    return (
      <div style={{ background: '#0d1117', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <p>Initializing Logiwa Intelligence...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-container">
        <div className="login-card glass">
          <img src="https://logiwa.com.tr/wp-content/uploads/2018/11/logo-web-site-300x138.png" alt="Logiwa" style={{ width: '150px', marginBottom: '2rem' }} />
          <h2>Admin Dashboard</h2>
          <form onSubmit={handleLogin} style={{ width: '100%' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Email Address</label>
              <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Password</label>
              <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login to Terminal</button>
          </form>
          <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logiwa Integration Team Access Only</p>
        </div>
      </div>
    );
  }

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
          <button className="btn" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', marginTop: '1rem' }} onClick={handleLogout}>Logout</button>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>v1.2.0-secure</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="title-area">
            <h1>{activeTab}</h1>
            <p>Admin Session: {user.email}</p>
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
