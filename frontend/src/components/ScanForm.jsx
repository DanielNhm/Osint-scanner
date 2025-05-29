
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
    const wsData = [[ 'Domain', 'Engine', 'Output', 'Error' ],
      [ domain, engine, output?.replace(/\n/g, ' '), error?.replace(/\n/g, ' ') ]
    ];
    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Harvester');
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
