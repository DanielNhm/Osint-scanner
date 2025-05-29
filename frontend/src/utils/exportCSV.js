export function exportToCSV(dataArray, filename = 'results.csv') {
  if (!Array.isArray(dataArray)) {
    console.error("Data must be an array");
    return;
  }

  if (dataArray.length === 0) {
    console.error("Empty data array");
    return;
  }

  const headers = Object.keys(dataArray[0]);
  const csvRows = [];

  csvRows.push(headers.join(',')); // Header row

  for (const row of dataArray) {
    const values = headers.map(header => {
      const val = row[header];
      return `"${typeof val === 'object' ? JSON.stringify(val) : String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
