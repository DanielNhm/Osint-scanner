import React, { useState } from 'react';
import axios from 'axios';
import { utils, writeFile } from 'xlsx';

export function AmassForm() {
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('Starting...');
    setOutput('');
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/amass', { domain });
      const taskId = response.data.task_id;
      setStatus('Running...');

      const interval = setInterval(async () => {
        try {
          const res = await axios.get(`http://127.0.0.1:8000/amass/status/${taskId}`);
          if (res.data.status === 'completed') {
            clearInterval(interval);
            setStatus('Completed');
            setOutput(res.data.output);
            setError(res.data.error);
          } else if (res.data.status === 'failed') {
            clearInterval(interval);
            setStatus('Failed');
            setError(res.data.error);
          }
        } catch (err) {
          clearInterval(interval);
          setStatus('Error');
          setError('Polling failed: ' + err.message);
        }
      }, 5000);
    } catch (err) {
      setStatus('Error');
      setError('Failed to start scan: ' + (err.response?.data?.detail || err.message));
    }
  }

  function extractArtifacts(text) {
    const emails = [...new Set((text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []))];
    const ips = [...new Set((text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []))];
    const subdomains = [...new Set((text.match(/\b([a-z0-9]+(?:[-.][a-z0-9]+)*\.[a-z]{2,})\b/g) || []))];
    const socials = [...new Set((text.match(/(?:https?:\/\/)?(?:www\.)?(linkedin|twitter|facebook|instagram)\.com\/[a-zA-Z0-9._-]+/g) || []))];

    return { emails, ips, subdomains, socials };
  }

  function handleExport() {
    const artifacts = extractArtifacts(output);

    const wsData = [
      ['Domain', domain],
      [],
      ['Emails', ...artifacts.emails],
      [],
      ['IPs', ...artifacts.ips],
      [],
      ['Subdomains', ...artifacts.subdomains],
      [],
      ['Social Profiles', ...artifacts.socials],
      [],
      ['Error', error]
    ];

    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Amass');
    writeFile(wb, `amass_results_${domain}.xlsx`);
  }

  return (
    <div>
      <h2>Amass Scanner</h2>
      <form onSubmit={handleSubmit}>
        <label>Domain:
          <input value={domain} onChange={e => setDomain(e.target.value)} required />
        </label>
        <button type="submit">Scan</button>
      </form>

      <h3>Status: {status}</h3>

      {output && (
        <div>
          <h4>Output:</h4>
          <pre>{output}</pre>
          <button onClick={handleExport}>Export Artifacts to Excel</button>
        </div>
      )}
      {error && (
        <div style={{ color: 'red' }}>
          <h4>Error:</h4>
          <pre>{error}</pre>
        </div>
      )}
    </div>
  );
}
