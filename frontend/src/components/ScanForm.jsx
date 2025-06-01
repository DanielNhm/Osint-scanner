
import React, { useState } from 'react';
import axios from 'axios';
import { utils, writeFile } from 'xlsx';

export function ScanForm() {
  const [domain, setDomain] = useState('');
  const [engine, setEngine] = useState('bing');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setLoading(true);
    setOutput('');
    setError('');

    try {
      const res = await fetch('http://127.0.0.1:8000/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, engine })
      });

      const data = await res.json();
      setOutput(data.output || '');
      setError(data.error || '');
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }

function handleExport() {
  const emailRegex = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  const subdomainRegex = /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi;
  const ipRegex = /\b\d{1,3}(?:\.\d{1,3}){3}\b/g;
  const socialRegex = /https?:\/\/(?:www\.)?(linkedin|facebook|twitter|instagram)\.com\/[^\s]+/gi;

  const unique = (arr) => [...new Set(arr || [])];

  const emails = unique(output.match(emailRegex));
  const subdomains = unique(output.match(subdomainRegex));
  const ips = unique(output.match(ipRegex));
  const socials = unique(output.match(socialRegex));

  const rows = [];

  emails.forEach(val => rows.push({ Type: 'Email', Value: val }));
  subdomains.forEach(val => rows.push({ Type: 'Subdomain', Value: val }));
  ips.forEach(val => rows.push({ Type: 'IP', Value: val }));
  socials.forEach(val => rows.push({ Type: 'Social', Value: val }));

  if (rows.length === 0) {
    alert('No artifacts found to export.');
    return;
  }

  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Artifacts');
  writeFile(wb, `harvester_results_${domain}.xlsx`);
}


  return (
    <div>
      <h2>theHarvester Scanner</h2>
      <form onSubmit={handleSubmit}>
        <label>Domain:
          <input value={domain} onChange={e => setDomain(e.target.value)} required />
        </label>
        <label>Engine:
          <select value={engine} onChange={e => setEngine(e.target.value)}>
            <option value="bing">Bing</option>
            <option value="google">Google</option>
            <option value="duckduckgo">DuckDuckGo</option>
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </form>

      {output && (
        <div>
          <h4>Output:</h4>
          <pre>{output}</pre>
          <button onClick={handleExport}>Export to Excel</button>
        </div>
      )}
      {error && (
        <div>
          <h4 style={{ color: 'red' }}>Error:</h4>
          <pre>{error}</pre>
        </div>
      )}
    </div>
  );
}
