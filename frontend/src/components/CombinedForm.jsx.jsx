
import React, { useState } from 'react';
import axios from 'axios';
import { utils, writeFile } from 'xlsx';

export function CombinedForm() {
  const [domain, setDomain] = useState('');
  const [engine, setEngine] = useState('bing');
  const [status, setStatus] = useState('');
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
      const res = await axios.post('http://127.0.0.1:8000/scan/all', { domain, engine });
      const taskId = res.data.task_id;
      setStatus('Running...');

      const interval = setInterval(async () => {
        try {
          const poll = await axios.get(`http://127.0.0.1:8000/scan/all/status/${taskId}`);
          if (poll.data.status === 'completed') {
            clearInterval(interval);
            setStatus('Completed');
            setHarvesterOutput(poll.data.harvester_output);
            setAmassOutput(poll.data.amass_output);
            setError(poll.data.error || '');
          } else if (poll.data.status === 'failed') {
            clearInterval(interval);
            setStatus('Failed');
            setError(poll.data.error);
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

  function handleExport() {
    const wsData = [[ 'Domain', 'Engine', 'Harvester Output', 'Amass Output', 'Error' ],
      [ domain, engine, harvesterOutput?.replace(/\n/g, ' '), amassOutput?.replace(/\n/g, ' '), error?.replace(/\n/g, ' ') ]
    ];
    const ws = utils.aoa_to_sheet(wsData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Combined');
    writeFile(wb, `combined_results_${domain}.xlsx`);
  }

  return (
    <div>
      <h2>Run Both Tools</h2>
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
        <button onClick={handleExport}>Export to Excel</button>
      )}
    </div>
  );
}
