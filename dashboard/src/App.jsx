import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import html2pdf from 'html2pdf.js';
import { LOGIWA_LOGO_BASE64 } from './logo_base64';
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
  deleteDoc,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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
  const [githubPat, setGithubPat] = useState('');
  const [githubRepo, setGithubRepo] = useState('cihanhartamaci/logiwa-intelligence');
  const [frequency, setFrequency] = useState('Daily');
  const [isPaused, setIsPaused] = useState(false);
  const [cycleStatus, setCycleStatus] = useState(null);
  const [editingUrl, setEditingUrl] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', url: '', category: '' });
  const [intelligenceFreshness, setIntelligenceFreshness] = useState('1 Month');
  const [syncStatus, setSyncStatus] = useState('Initializing...');

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

    // Sync System Config (Pause/Frequency/GitHub)
    setSyncStatus('Connecting...');
    const unsubConfig = onSnapshot(doc(db, "config", "system"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.is_paused !== undefined) setIsPaused(data.is_paused);
        if (data.frequency) setFrequency(data.frequency);
        if (data.gh_pat) setGithubPat(data.gh_pat);
        if (data.gh_repo) setGithubRepo(data.gh_repo);
        if (data.intelligence_freshness) setIntelligenceFreshness(data.intelligence_freshness);
        setSyncStatus('Synced');
      } else {
        setSyncStatus('No remote config found');
      }
    }, (error) => {
      console.error("Firestore Sync Error:", error);
      setSyncStatus(`Sync Error: ${error.code}`);
    });

    return () => {
      unsubUrls();
      unsubReports();
      unsubConfig();
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
    action: url.next_action || 'Monitoring',
    last_date: url.last_date && url.last_date !== 'N/A' ? url.last_date : 'Pending Analysis'
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

  const handleEditUrl = (item) => {
    setEditingUrl(item.id);
    setEditForm({ name: item.name, url: item.url, category: item.category || 'API Documentation' });
  };

  const handleUpdateUrl = async (e) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "monitored_urls", editingUrl), {
        name: editForm.name,
        url: editForm.url,
        category: editForm.category
      });
      setEditingUrl(null);
    } catch (e) {
      console.error("Error updating document: ", e);
      alert("Error updating URL. Check console.");
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
      alert("Please set your GitHub Personal Access Token in Settings first!");
      setShowSettings(true);
      return;
    }
    if (!githubRepo) {
      alert("Please set your GitHub Repository (e.g. username/repo) in Settings.");
      setShowSettings(true);
      return;
    }

    const [owner, repo] = githubRepo.split('/');
    const workflowFile = 'monitor_intelligence.yml';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;

    setCycleStatus('running');
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubPat}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: 'main' })
      });

      if (response.status === 204) {
        setCycleStatus('success');
        alert('Intelligence Cycle triggered successfully!\n\nGitHub Action is now running. Check GitHub Actions tab for live logs.');
      } else {
        const err = await response.json().catch(() => ({}));
        setCycleStatus('error');
        alert(`Failed to trigger action.\nStatus: ${response.status}\n${err.message || ''}\n\nCheck that your PAT has "repo" and "workflow" scopes.`);
      }
    } catch (e) {
      setCycleStatus('error');
      alert('Network error: ' + e.message);
    }
    setTimeout(() => setCycleStatus(null), 5000);
  };

  const toggleWorkflow = async (pause) => {
    if (!githubPat || !githubRepo) {
      alert("GitHub PAT and Repo must be set to pause/resume workflows.");
      return;
    }

    const [owner, repo] = githubRepo.split('/');
    const workflowFile = 'monitor_intelligence.yml';
    const action = pause ? 'disable' : 'enable';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/${action}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubPat}`,
          'Accept': 'application/vnd.github+json',
        }
      });

      if (response.status === 204) {
        // Update Firestore
        await setDoc(doc(db, "config", "system"), { is_paused: pause }, { merge: true });
        setIsPaused(pause);
        alert(`Workflow ${pause ? 'paused' : 'resumed'} successfully!`);
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`Failed to ${action} workflow. Status: ${response.status}. ${err.message || ''}`);
      }
    } catch (e) {
      alert('Error toggling workflow: ' + e.message);
    }
  };

  const saveSettings = async () => {
    // Sync to Firestore for all users (Global Config)
    try {
      await setDoc(doc(db, "config", "system"), {
        frequency,
        gh_pat: githubPat,
        gh_repo: githubRepo,
        intelligence_freshness: intelligenceFreshness
      }, { merge: true });
      setShowSettings(false);
      alert("Settings saved and synced globally!");
    } catch (e) {
      console.error("Failed to sync settings to Firestore", e);
      alert("Failed to save settings. Check permissions.");
    }
  };

  const openReport = (report) => {
    setSelectedReport(report);
    setShowPdfViewer(true);
  };

  const parseReportMarkdown = (markdown) => {
    if (!markdown) return [];
    try {
      const sections = markdown.split('## ').slice(1);
      return sections.map(section => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        const infoLine = lines.find(l => l.startsWith('**Release Date:**')) || '';
        const releaseDate = infoLine.split('**Release Date:**')[1]?.split('|')[0]?.trim() || 'N/A';
        const type = infoLine.split('**Type:**')[1]?.split('|')[0]?.trim() || 'N/A';
        const impact = infoLine.split('**Impact:**')[1]?.trim() || 'Low';

        const summaryIndex = lines.findIndex(l => l.includes('### Summary'));
        const detailsIndex = lines.findIndex(l => l.includes('### Technical Details'));
        const logiwaImpactIndex = lines.findIndex(l => l.includes('### Logiwa Impact'));
        const actionRequiredIndex = lines.findIndex(l => (l.includes('### Action Required') || l.includes('### ✅ Recommended Action')));

        return {
          title,
          type,
          impact,
          releaseDate,
          summary: lines.slice(summaryIndex + 1, detailsIndex).join('\n').trim(),
          details: lines.slice(detailsIndex + 1, logiwaImpactIndex).join('\n').trim().split('\n')
            .filter(l => l.trim().startsWith('- '))
            .map(l => l.replace('- ', '').trim()),
          logiwaImpact: lines.slice(logiwaImpactIndex + 1, actionRequiredIndex).join('\n').trim(),
          actionRequired: lines.slice(actionRequiredIndex + 1).join('\n').split('---')[0].replace('> ', '').trim()
        };
      });
    } catch (e) {
      console.error("Failed to parse markdown", e);
      return [];
    }
  };

  const getLogo = (name) => {
    const LOGO_MAP = {
      'Shopify': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Shopify_logo_2018.svg/512px-Shopify_logo_2018.svg.png',
      'NetSuite': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Oracle_NetSuite_logo.svg/512px-Oracle_NetSuite_logo.svg.png',
      'FedEx': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRccXb1NQDWasHL7N6Ibb3sYUs4vRYu0JIvvA&s',
      'Amazon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/512px-Amazon_logo.svg.png',
      'Walmart': 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Walmart_logo_%282008%29.svg',
      'TikTok': 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a9/TikTok_logo.svg/512px-TikTok_logo.svg.png',
      'Etsy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Etsy_logo.svg/512px-Etsy_logo.svg.png',
      'Shippo': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRm1OBTShEIiV0VfOHKJB-NnKtb48RU-X98Dg&s'
    };
    const searchName = name.toLowerCase();
    for (const key in LOGO_MAP) {
      if (searchName.includes(key.toLowerCase())) return LOGO_MAP[key];
    }
    return null;
  };

  const downloadPdf = async (report) => {
    const element = document.getElementById('report-pdf-template');
    if (!element) return;

    try {
      setCycleStatus('running');

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${report.name || 'Logiwa_Intel_Report'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 800 // Anchor at 800px for consistent scaling
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // html2pdf returns a promise
      await html2pdf().set(opt).from(element).save();

      setCycleStatus('success');
    } catch (e) {
      console.error("PDF Export failed", e);
      setCycleStatus('error');
    }
    setTimeout(() => setCycleStatus(null), 3000);
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
              <th>Release Date</th>
              <th>Status</th>
              <th>Impact Area</th>
              <th>Recommended Action</th>
            </tr>
          </thead>
          <tbody>
            {readinessData.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight: '500', verticalAlign: 'top', paddingTop: '1.5rem' }}>{row.integration}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', verticalAlign: 'top', paddingTop: '1.5rem' }}>{row.last_date}</td>
                <td style={{ verticalAlign: 'top', paddingTop: '1.5rem' }}>
                  <span className={`status-dot ${row.status === 'Ready' ? 'status-ready' :
                    row.status === 'Action Required' ? 'status-action' : 'status-review'
                    }`}></span>
                  {row.status}
                </td>
                <td style={{ verticalAlign: 'top', paddingTop: '1.5rem' }}>{row.impact}</td>
                <td style={{ verticalAlign: 'top', paddingTop: '1.25rem' }}>
                  <div style={{
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5',
                    maxWidth: '450px'
                  }}>
                    {row.action}
                  </div>
                </td>
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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}
                        onClick={() => handleEditUrl(s)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: 'var(--accent-red)' }}
                        onClick={() => handleDeleteUrl(s.id)}
                      >
                        Remove
                      </button>
                    </div>
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

      {/* Edit URL Modal */}
      {editingUrl && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '1.5rem' }}>Edit Source</h2>
            <form onSubmit={handleUpdateUrl}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Source Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>URL</label>
                <input
                  type="url"
                  className="input-field"
                  value={editForm.url}
                  onChange={e => setEditForm({ ...editForm, url: e.target.value })}
                  required
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Category</label>
                <select
                  className="input-field"
                  value={editForm.category}
                  onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                >
                  {categories.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ color: '#aaa' }} onClick={() => setEditingUrl(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update Source</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
          <button className="btn" onClick={() => toggleWorkflow(!isPaused)}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Dashboard Settings</h2>
              <span style={{ fontSize: '0.7rem', color: syncStatus === 'Synced' ? 'var(--accent-emerald)' : 'var(--accent-yellow)' }}>
                ● {syncStatus}
              </span>
            </div>
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
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>GitHub Repository</label>
              <input
                type="text"
                className="input-field"
                placeholder="username/repo-name"
                value={githubRepo}
                onChange={e => setGithubRepo(e.target.value)}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                Format: <code>owner/repository</code> (e.g. cihanhartamaci/logiwa-intelligence)
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
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Intelligence Freshness</label>
              <select className="input-field" value={intelligenceFreshness} onChange={e => setIntelligenceFreshness(e.target.value)}>
                <option>1 Week</option>
                <option>1 Month</option>
                <option>3 Months</option>
                <option>6 Months</option>
                <option>1 Year</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                💡 Ignore updates older than this period.
              </p>
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
          <div className="modal-content" style={{ maxWidth: '900px', width: '95%', maxHeight: '95vh', overflowY: 'auto', background: '#f4f7f9', color: '#1a1a1a', padding: 0 }}>
            {/* Action Bar */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', padding: '1rem 2rem', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img src="https://logiwa.com.tr/wp-content/uploads/2018/11/logo-web-site-300x138.png" alt="Logiwa" style={{ height: '24px' }} />
                <span style={{ fontWeight: '600', color: '#666' }}>Intelligence Report Preview</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => downloadPdf(selectedReport)} disabled={cycleStatus === 'running'}>
                  {cycleStatus === 'running' ? 'Generating...' : 'Download Professional PDF'}
                </button>
                <button className="btn" style={{ color: '#666' }} onClick={() => setShowPdfViewer(false)}>Close</button>
              </div>
            </div>

            {/* PDF Viewport (A4 Ratio) */}
            <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}>
              <div id="report-pdf-template" style={{
                width: '750px', // Optimized for A4 output @ windowWidth 800
                background: '#fff',
                padding: '40px',
                fontFamily: '"Inter", "Segoe UI", sans-serif',
                position: 'relative',
                color: '#1a1a1a',
                boxSizing: 'border-box'
              }}>
                {/* Decorative Watermark */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', opacity: 0.03, fontSize: '120px', fontWeight: '900', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                  LOGIWA INTELLIGENCE
                </div>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #3b82f6', paddingBottom: '30px', marginBottom: '40px', position: 'relative', zIndex: 1 }}>
                  <div>
                    <h1 style={{ fontSize: '22px', margin: 0, fontWeight: '800', letterSpacing: '-0.5px', color: '#111' }}>INTELLIGENCE DISCOVERY</h1>
                    <p style={{ color: '#3b82f6', marginTop: '4px', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Integration Audit | {new Date(selectedReport.timestamp?.seconds * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <img src={LOGIWA_LOGO_BASE64} alt="Logiwa" style={{ height: '45px' }} />
                    <p style={{ fontSize: '10px', color: '#999', marginTop: '5px' }}>Automated Assessment v1.2</p>
                  </div>
                </div>

                {/* Subheader Info Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '50px', position: 'relative', zIndex: 1 }}>
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Report Signature</p>
                    <p style={{ fontWeight: '700', fontSize: '14px' }}>#{selectedReport.id?.substring(0, 12).toUpperCase()}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Critical Discoveries</p>
                    <p style={{ fontWeight: '700', fontSize: '14px', color: '#ef4444' }}>{selectedReport.alert_count || 0} Priority Alerts</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '5px' }}>Verified At</p>
                    <p style={{ fontWeight: '700', fontSize: '14px' }}>{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>

                {/* Content Sections */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {parseReportMarkdown(selectedReport.content).map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '50px', pageBreakInside: 'avoid' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
                        <div style={{ width: '60px', height: '60px', background: '#fff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee', flexShrink: 0 }}>
                          {getLogo(item.title) ? (
                            <img src={getLogo(item.title)} alt={item.title} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
                          ) : (
                            <div style={{ fontSize: '20px' }}>📦</div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h2 style={{ fontSize: '16px', margin: 0, color: '#000', fontWeight: '700' }}>{item.title}</h2>
                            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>REL: {item.releaseDate}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                            <span style={{ fontSize: '12px', background: '#eee', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>{item.type}</span>
                            <span style={{
                              padding: '2px 10px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '800',
                              background: item.impact.startsWith('High') ? '#ef4444' : item.impact.startsWith('Medium') ? '#f59e0b' : '#10b981',
                              color: '#fff',
                            }}>
                              {item.impact.toUpperCase()} IMPACT
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '20px' }}>
                        <p style={{ fontWeight: '800', marginBottom: '8px', fontSize: '11px', textTransform: 'uppercase', color: '#64748b' }}>Technical Assessment</p>
                        <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#334155' }}>{item.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Section */}
                <div style={{ marginTop: '60px', borderTop: '2px solid #3b82f6', paddingTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#64748b', maxWidth: '400px' }}>
                    © 2026 Logiwa WMS Integration Services. All rights reserved.
                    This report is strictly confidential and intended for intended recipients only.
                  </div>
                  <img src={LOGIWA_LOGO_BASE64} alt="Logiwa" style={{ height: '25px', opacity: 0.5 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )
      }

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
            <button
              className="btn btn-primary"
              onClick={runCycle}
              disabled={cycleStatus === 'running'}
              style={{
                background: cycleStatus === 'success' ? 'var(--accent-emerald)' :
                  cycleStatus === 'error' ? 'var(--accent-red)' :
                    cycleStatus === 'running' ? '#555' : '',
                opacity: cycleStatus === 'running' ? 0.7 : 1
              }}
            >
              {cycleStatus === 'running' ? 'Triggering...' :
                cycleStatus === 'success' ? 'Triggered!' :
                  cycleStatus === 'error' ? 'Failed - Check PAT' :
                    'Run Intelligence Cycle'}
            </button>
          </div>
        </header>

        {renderContent()}
      </main>
    </div >
  );
}



export default App;
