import React, { useEffect, useState } from 'react';
import { utils, writeFile } from 'xlsx';

export function ScanHistory() {
  const [history, setHistory] = useState([]);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    fetch('http://127.0.0.1:8000/history')
      .then(res => res.json())
      .then(setHistory)
      .catch(err => console.error('Failed to load history', err));
  }, []);

  function extractArtifacts(scan) {
    const output = scan.output || scan.harvester_output || scan.amass_output || '';
    const rows = [];

    const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
    const subdomainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
    const ipRegex = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
    const socialRegex = /https?:\/\/(?:www\.)?(linkedin|facebook|twitter|instagram)\.com\/[^\s]+/gi;

    const unique = (arr) => [...new Set(arr || [])];

    unique(output.match(emailRegex)).forEach(email =>
      rows.push({ Type: 'Email', Value: email })
    );
    unique(output.match(subdomainRegex)).forEach(domain =>
      rows.push({ Type: 'Subdomain', Value: domain })
    );
    unique(output.match(ipRegex)).forEach(ip =>
      rows.push({ Type: 'IP', Value: ip })
    );
    unique(output.match(socialRegex)).forEach(profile =>
      rows.push({ Type: 'Social', Value: profile })
    );

    return rows;
  }

  function handleExport(scan) {
    const rows = extractArtifacts(scan);
    if (rows.length === 0) {
      alert('No artifacts found to export.');
      return;
    }

    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Artifacts');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `scan_${scan.domain}_${timestamp}.xlsx`;

    writeFile(wb, filename);
  }

  function handleClear() {
    if (!window.confirm("Are you sure you want to clear all history?")) return;

    fetch('http://127.0.0.1:8000/history', { method: 'DELETE' })
      .then(() => setHistory([]))
      .catch(err => console.error('Failed to clear history', err));
  }

  function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="scan-history">
      <h2>Scan History</h2>

      {history.length > 0 && (
        <button onClick={handleClear} style={{ marginBottom: '1rem' }}>
          Clear History
        </button>
      )}

      {history.length === 0 ? (
        <p>No scans yet.</p>
      ) : (
        history.map((scan, idx) => (
          <div key={idx} className="scan-card">
            <p><strong>Type:</strong> {scan.type}</p>
            <p><strong>Domain:</strong> {scan.domain}</p>
            {scan.engine && <p><strong>Engine:</strong> {scan.engine}</p>}
            <p><strong>Start:</strong> {formatDate(scan.start_time)}</p>
            <p><strong>End:</strong> {formatDate(scan.end_time)}</p>
            <p><strong>Summary:</strong> {getSummary(scan)}</p>
            <button onClick={() => setModalData(scan)}>
              View Details
            </button>
            <button onClick={() => handleExport(scan)} style={{ marginTop: '1em' }}>
              Export to Excel
            </button>
          </div>
        ))
      )}

      {modalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: '#1e1e1e', padding: '2rem', borderRadius: '8px',
            maxWidth: '800px', maxHeight: '80%', overflowY: 'auto'
          }}>
            <h3>Scan Details</h3>
            <p><strong>Domain:</strong> {modalData.domain}</p>
            {modalData.engine && <p><strong>Engine:</strong> {modalData.engine}</p>}
            <pre>{modalData.output || modalData.harvester_output || ''}</pre>
            {modalData.amass_output && (
              <>
                <h4>Amass Output:</h4>
                <pre>{modalData.amass_output}</pre>
              </>
            )}
            <button onClick={() => setModalData(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function getSummary(scan) {
  const output = scan.output || scan.harvester_output || scan.amass_output || '';
  const emails = (output.match(/\b[A-Z0-9._%+]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi) || []).length;
  const subdomains = (output.match(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi) || []).length;
  const ips = (output.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || []).length;
  return `${subdomains} subdomains, ${emails} emails, ${ips} IPs`;
}
