// Roster labels are reporting dates or date ranges supplied during import.
export function rosterDateLabel(label) {
  const dates=String(label).trim().split(/\s+[–—]\s+/);
  return 'Data setakat '+dates[dates.length-1];
}
