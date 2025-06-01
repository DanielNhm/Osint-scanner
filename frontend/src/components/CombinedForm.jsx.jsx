import React, { useState } from 'react';
import axios from 'axios';
import { utils, writeFile } from 'xlsx';

export function CombinedForm() {
  const [domain, setDomain] = useState('');
  const [engine, setEngine] = useState('bing');
  const [status, setStatus] = useState('Idle');
  const [harvesterOutput, setHarvesterOutput] = useState('');
  const [amassOutput, setAmassOutput] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('Starting...');
    setError('');
    setHarvesterOutput('');
    setAmassOutput('');

    try {
      const res = await axios.post('http://127.0.0.1:8000/both', { domain, engine });
      const taskId = res.data.task_id;
      setStatus('Running...');

      const interval = setInterval(async () => {
        try {
          const poll = await axios.get(`http://127.0.0.1:8000/both/status/${taskId}`);
          const data = poll.data;

          if (data.harvester_output !== undefined) setHarvesterOutput(data.harvester_output);
          if (data.amass_output !== undefined) setAmassOutput(data.amass_output);

          if (data.status === 'failed') {
            clearInterval(interval);
            setStatus('Failed');
            setError(data.error || 'Unknown error');
          }

          if (data.status === 'completed') {
            clearInterval(interval);
            setStatus('Completed');
          }

        } catch (err) {
          clearInterval(interval);
          setStatus('Error');
          setError('Polling failed: ' + err.message);
        }
      }, 3000);
    } catch (err) {
      setStatus('Error');
      setError('Failed to start scan: ' + (err.response?.data?.detail || err.message));
    }
  }

  function extractArtifacts(text) {
    const emails = [...new Set((text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))];
    const ips = [...new Set((text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []))];
    const subdomains = [...new Set((text.match(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/g) || []))];
    const socials = [...new Set((text.match(/(?:https?:\/\/)?(?:www\.)?(linkedin|twitter|facebook|instagram)\.com\/[a-zA-Z0-9._-]+/g) || []))];
    return { emails, ips, subdomains, socials };
  }

  function handleExport() {
    const combinedText = `${harvesterOutput}\n${amassOutput}`;
    const artifacts = extractArtifacts(combinedText);

    const rows = [
      ...artifacts.emails.map(v => ({ Type: 'Email', Value: v })),
      ...artifacts.ips.map(v => ({ Type: 'IP', Value: v })),
      ...artifacts.subdomains.map(v => ({ Type: 'Subdomain', Value: v })),
      ...artifacts.socials.map(v => ({ Type: 'Social Profile', Value: v })),
    ];

    if (rows.length === 0) {
      alert("No artifacts found to export.");
      return;
    }

    const ws = utils.json_to_sheet(rows);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Artifacts');
    writeFile(wb, `combined_results_${domain}.xlsx`);
  }

  return (
    <div className="form-section">
      <h2 className="main-title">Run Both Tools</h2>
      <form onSubmit={handleSubmit}>
        <label>Domain:
          <input value={domain} onChange={e => setDomain(e.target.value)} required />
        </label>
        <label>Engine:
          <input value={engine} onChange={e => setEngine(e.target.value)} />
        </label>
        <button type="submit">Scan</button>
      </form>

      <h3>Status: {status}</h3>

      {harvesterOutput && (
        <div>
          <h4>Harvester Output:</h4>
          <pre>{harvesterOutput}</pre>
        </div>
      )}
      {amassOutput && (
        <div>
          <h4>Amass Output:</h4>
          <pre>{amassOutput}</pre>
        </div>
      )}
      {error && (
        <div style={{ color: 'red' }}>
          <h4>Error:</h4>
          <pre>{error}</pre>
        </div>
      )}

      {(harvesterOutput || amassOutput) && (
        <button onClick={handleExport}>Export Artifacts to Excel</button>
      )}
    </div>
  );
}
