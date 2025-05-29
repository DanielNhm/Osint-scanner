import * as XLSX from "xlsx";

export function exportDetailedXLSX({ domain, engine, harvesterHosts, amassHosts }) {
  const rows = [];

  harvesterHosts.forEach((host) => {
    rows.push({ Tool: "theHarvester", Domain: domain, Engine: engine, Result: host });
  });

  amassHosts.forEach((host) => {
    rows.push({ Tool: "amass", Domain: domain, Engine: engine, Result: host });
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Scan Results");

  const fileName = `scan_result_detailed_${domain}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
