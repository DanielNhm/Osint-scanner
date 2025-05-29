
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

  function handleExport() {
    const wsData = [[ 'Domain', 'Output', 'Error' ],
      [ domain, output?.replace(/\n/g, ' '), error?.replace(/\n/g, ' ') ]
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
          <button onClick={handleExport}>Export to Excel</button>
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
