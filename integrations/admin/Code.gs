const ADMIN = 'ppd-b110-cm4@moe-dl.edu.my';
const MAX_CSV_CHARS = 8 * 1024 * 1024;
// School codes are taken from the current public district snapshot.
const SCHOOLS = new Set('BBA8101 BBA8102 BBA8103 BBA8106 BBA8201 BBA8206 BBA8208 BBA8209 BBA8210 BBA8211 BBA8214 BBA8215 BBA8220 BBA8221 BBA8236 BBA8241 BBA8244 BBA8248 BBA8250 BBA8253 BBA8259 BBA8260 BBA8263 BBA8265 BBA8270 BBA8271 BBA8276 BBA8277 BBA8285 BBB8302 BBB8303 BBB8305 BBB8306 BBB8307 BBB8308 BBB8309 BBB8310 BBB8311 BBB8312 BBB8313 BBB8314 BBB8316 BBC8401 BBC8402 BBC8408 BBC8409 BBC8411 BBC8412 BBC8413 BBC8415 BBC8418 BBC8420 BBD8452 BBD8456 BBD8458 BBD8467 BBD8471 BEA8602 BEA8607 BEA8608 BEA8611 BEA8613 BEA8615 BEA8624 BEA8631 BEA8638 BEA8640 BEA8641 BEA8643 BEA8644 BEA8652 BEA8655 BEA8658 BEA8659 BEA8661 BEA8666 BEA8669 BEB8651 BEB8652 BEB8653 BEB8654 BEB8655 BEB8656 BEB8657 BEB8658'.split(' '));

function requireAdmin_() {
  if (Session.getActiveUser().getEmail().toLowerCase() !== ADMIN) {
    throw new Error('Akses terhad kepada akaun Google CM4 PPD Petaling Utama.');
  }
}

function doGet() {
  requireAdmin_();
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Ruang Admin · PU Insight')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function previewRoster(kind, start, end, csv) {
  requireAdmin_();
  return prepareRoster_(kind, start, end, csv).counts;
}

function publishRoster(kind, start, end, csv) {
  requireAdmin_();
  const {report, counts} = prepareRoster_(kind, start, end, csv);
  const folderId = PropertiesService.getScriptProperties().getProperty('ROSTER_FOLDER_ID');
  if (!folderId) throw new Error('Folder penerbitan belum ditetapkan.');
  const name = kind + '-' + end + '_' + start + '.json';
  const payload = JSON.stringify(report);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const folder = DriveApp.getFolderById(folderId);
    const matches = folder.getFilesByName(name);
    const prior = matches.hasNext() ? matches.next() : null;
    if (prior && !matches.hasNext() && Utilities.newBlob(payload).getBytes().length <= 10 * 1024 * 1024) {
      prior.setContent(payload);
    } else {
      folder.createFile(Utilities.newBlob(payload, 'application/json', name));
    }
  } finally {
    lock.releaseLock();
  }
  return {message: 'Diterbitkan ke Google Drive.', counts};
}

function prepareRoster_(kind, start, end, csv) {
  if (kind !== 'students' && kind !== 'teachers') throw new Error('Pilih set laporan.');
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  if (!validDate(start) || !validDate(end) || end < start) throw new Error('Semak tarikh laporan.');
  if (typeof csv !== 'string' || !csv.trim() || csv.length > MAX_CSV_CHARS) {
    throw new Error('Data Petaling Utama selepas tapisan masih terlalu besar untuk dihantar.');
  }
  const clean = csv.replace(/^\uFEFF/, '');
  const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
  const required = ['EMAIL', 'PPD', kind === 'students' ? 'NAMA' : 'NAME',
    kind === 'students' ? 'KOD SEKOLAH' : 'KODSEKOLAH'];
  const headerLine = clean.split(/\r?\n/, 1)[0];
  const delimiter = [',', ';', '\t'].find(candidate => {
    try {
      const columns = Utilities.parseCsv(headerLine, candidate)[0].map(normalize);
      return required.every(key => columns.includes(key));
    } catch (_) {
      return false;
    }
  });
  if (!delimiter) throw new Error('Semak lajur CSV untuk set yang dipilih.');
  const rows = Utilities.parseCsv(clean, delimiter);
  const header = rows[0].map(normalize);
  const named = header.filter(Boolean);
  if (new Set(named).size !== named.length) throw new Error('Tajuk lajur berulang.');
  const [emailIndex, districtIndex, nameIndex, codeIndex] = required.map(key => header.indexOf(key));
  const schools = {};
  const seen = new Map();
  const counts = {accepted: 0, excluded: 0, duplicates: 0, schools: 0};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(value => value.trim())) continue;
    const district = normalize(row[districtIndex]);
    if (district !== 'PETALING UTAMA' && district !== 'PPD PETALING UTAMA') {
      counts.excluded++;
      continue;
    }
    const name = String(row[nameIndex] || '').trim().replace(/\s+/g, ' ');
    const code = normalize(row[codeIndex]);
    const email = normalize(row[emailIndex]);
    if (!name || !SCHOOLS.has(code)) throw new Error('Semak nama atau kod sekolah pada rekod ' + (i + 1) + '.');
    const identity = code + ':' + normalize(name);
    if (email && seen.has(email)) {
      if (seen.get(email) !== identity) throw new Error('Akaun bercanggah pada rekod ' + (i + 1) + '.');
      counts.duplicates++;
      continue;
    }
    if (email) seen.set(email, identity);
    if (!schools[code]) schools[code] = [];
    schools[code].push(name);
    counts.accepted++;
  }
  if (!counts.accepted && counts.excluded) throw new Error('Tiada rekod Petaling Utama dalam fail.');
  for (const names of Object.values(schools)) names.sort((a, b) => a.localeCompare(b, 'ms'));
  counts.schools = Object.keys(schools).length;
  const display = value => value.split('-').reverse().join('/');
  const label = start === end ? display(start) : display(start) + ' – ' + display(end);
  return {report: {kind, period: {start, end, label, basis: 'Tempoh dipilih semasa import'}, schools}, counts};
}
