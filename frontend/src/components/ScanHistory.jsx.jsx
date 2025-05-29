import React, { useState, useEffect } from 'react';
import { exportToCSV } from '../utils/exportCSV';

export function ScanHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const storedHistory = JSON.parse(localStorage.getItem('scanHistory')) || [];
    setHistory(storedHistory);
  }, []);

  const handleDownload = (entry, index) => {
    const data = {
      Tool: entry.tool || detectTool(entry),
      Domain: entry.domain || 'N/A',
      Engine: entry.engine || 'N/A',
      'Harvester Output': (entry.harvester_output || '').replace(/\n/g, ' '),
      'Harvester Error': (entry.harvester_error || '').replace(/\n/g, ' '),
      'Amass Output': (entry.amass_output || entry.output || '').replace(/\n/g, ' '),
      'Amass Error': (entry.amass_error || entry.error || '').replace(/\n/g, ' ')
    };

    exportToCSV([data], `scan_result_${index}.csv`);
  };

  const detectTool = (entry) => {
    if (entry.harvester_output && entry.amass_output) return 'combined';
    if (entry.harvester_output) return 'theHarvester';
    if (entry.amass_output || entry.output) return 'amass';
    return 'unknown';
  };

  const handleClearHistory = () => {
    localStorage.removeItem('scanHistory');
    setHistory([]);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Scan History</h2>

      {history.length === 0 ? (
        <p>No previous scans.</p>
      ) : (
        <>
          <button
            onClick={handleClearHistory}
            className="mb-4 bg-red-500 text-white px-3 py-1 rounded"
          >
            Clear History
          </button>
          {history.map((entry, index) => (
            <div key={index} className="border rounded p-3 mb-3 shadow-md bg-white dark:bg-gray-800">
              <p><strong>Tool:</strong> {entry.tool || detectTool(entry)}</p>
              <p><strong>Domain:</strong> {entry.domain || 'N/A'}</p>
              {entry.engine && <p><strong>Engine:</strong> {entry.engine}</p>}
              {entry.harvester_output && (
                <>
                  <p><strong>Harvester Output:</strong></p>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-2 overflow-x-auto">{entry.harvester_output}</pre>
                </>
              )}
              {entry.harvester_error && (
                <>
                  <p><strong>Harvester Error:</strong></p>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-2 overflow-x-auto">{entry.harvester_error}</pre>
                </>
              )}
              {entry.amass_output || entry.output ? (
                <>
                  <p><strong>Amass Output:</strong></p>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-2 overflow-x-auto">{entry.amass_output || entry.output}</pre>
                </>
              ) : null}
              {entry.amass_error || entry.error ? (
                <>
                  <p><strong>Amass Error:</strong></p>
                  <pre className="bg-gray-100 dark:bg-gray-700 p-2 overflow-x-auto">{entry.amass_error || entry.error}</pre>
                </>
              ) : null}
              <button
                className="mt-2 bg-blue-500 text-white px-3 py-1 rounded"
                onClick={() => handleDownload(entry, index)}
              >
                Download CSV
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
