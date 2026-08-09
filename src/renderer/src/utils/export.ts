export function downloadCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert('No data to export.');
    return;
  }

  // Get headers
  const headers = Object.keys(data[0]);
  
  // Format rows
  const csvRows: string[] = [];
  csvRows.push(headers.join(',')); // Add headers row
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      // Escape quotes and wrap in quotes if contains comma
      const escaped = ('' + (val === null || val === undefined ? '' : val)).replace(/"/g, '""');
      if (escaped.search(/("|,|\n)/g) >= 0) {
        return `"${escaped}"`;
      }
      return escaped;
    });
    csvRows.push(values.join(','));
  }

  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
