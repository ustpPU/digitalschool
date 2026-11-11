"""Prepare new PU Insight reports from a local file."""
import csv
import json
import re
from datetime import date
from pathlib import Path

DATA = Path(__file__).resolve().parents[1] / "public/data"
DISTRICT = {"PETALING UTAMA", "PPD PETALING UTAMA"}
SHEETS = {"Murid": "students", "Guru": "teachers", "AI Tools (Guru)": "ai"}
ROSTERS = {
    "students": ("nama", "kod sekolah", "ppd"),
    "teachers": ("name", "kodsekolah", "ppd"),
}


def normalize(value):
    return " ".join(str(value or "").strip().upper().split())


def period_for(start, end):
    first, last = date.fromisoformat(start), date.fromisoformat(end)
    if first.isoformat() != start or last.isoformat() != end or last < first:
        raise ValueError("Semak tarikh mula dan tamat.")
    label = first.strftime("%d/%m/%Y")
    if first != last:
        label += " – " + last.strftime("%d/%m/%Y")
    return {"start": start, "end": end, "label": label, "basis": "Tempoh dipilih semasa import"}


def csv_rows(path):
    stream = path.open(encoding="utf-8-sig", newline="")
    try:
        sample = stream.read(8192)
        stream.seek(0)
        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        except csv.Error:
            dialect = csv.excel
        reader = csv.reader(stream, dialect)
        yield from reader
    finally:
        stream.close()


def records(rows, required):
    header = [normalize(cell).lower() for cell in next(rows, [])]
    if not set(required) <= set(header):
        raise ValueError("Lajur diperlukan: " + ", ".join(required))
    named = [key for key in header if key]
    if len(set(named)) != len(named):
        raise ValueError("Tajuk lajur berulang.")
    for number, row in enumerate(rows, 2):
        if any(cell is not None and str(cell).strip() for cell in row):
            yield number, dict(zip(header, row))


def build_roster(path, kind, period, known):
    name_key, code_key, district_key = ROSTERS[kind]
    groups, seen = {}, {}
    counts = dict(accepted=0, excluded=0, duplicates=0)
    for number, row in records(iter(csv_rows(path)), [name_key, code_key, district_key, "email"]):
        if normalize(row.get(district_key)) not in DISTRICT:
            counts["excluded"] += 1
            continue
        code = normalize(row.get(code_key))
        name = " ".join(str(row.get(name_key) or "").split())
        email = normalize(row.get("email"))
        if code not in known or not name:
            raise ValueError(f"Baris {number}: kod sekolah atau nama perlu disemak.")
        if email and email in seen:
            if seen[email] != (code, normalize(name)):
                raise ValueError(f"Baris {number}: akaun sama mempunyai nama atau sekolah berbeza.")
            counts["duplicates"] += 1
            continue
        if email:
            seen[email] = (code, normalize(name))
        groups.setdefault(code, []).append(name)
        counts["accepted"] += 1
    if not groups and counts["excluded"]:
        raise ValueError("Fail tidak mengandungi rekod Petaling Utama.")
    for names in groups.values():
        names.sort(key=str.casefold)
    return {"kind": kind, "period": period, "schools": groups}, {**counts, "schools": len(groups)}


def number_of(value, line):
    try:
        count = int(value)
    except (ValueError, TypeError, OverflowError):
        raise ValueError(f"Baris {line}: bilangan mesti integer.") from None
    if count < 0 or (isinstance(value, float) and count != value):
        raise ValueError(f"Baris {line}: bilangan mesti integer positif atau sifar.")
    return count


def build_summary(path, filename, period):
    schools, seen = {}, set()
    counts = dict(accepted=0, excluded=0, duplicates=0)
    applications = []
    fields = ["ppd", "kodsekolah", "namasekolah", "pengguna aktif", "total pengguna"]

    def add(rows, sheet, fixed_measure=None):
        required = fields if fixed_measure else fields + ["ukuran"]
        for line, row in records(iter(rows), required):
            if normalize(row.get("ppd")) not in DISTRICT:
                counts["excluded"] += 1
                continue
            code, name = normalize(row.get("kodsekolah")), str(row.get("namasekolah") or "").strip()
            key = fixed_measure or str(row.get("ukuran") or "").strip().lower()
            if not re.fullmatch(r"[A-Z]{3}[0-9]{4}", code) or not name or key not in SHEETS.values():
                raise ValueError(f"Baris {line}: kod, nama atau ukuran tidak sah.")
            if (code, key) in seen:
                raise ValueError(f"Baris {line}: sekolah dan ukuran berulang.")
            seen.add((code, key))
            active = number_of(row.get("pengguna aktif"), line)
            total = number_of(row.get("total pengguna"), line)
            if active > total:
                raise ValueError(f"Baris {line}: aktif melebihi jumlah.")
            school = schools.setdefault(code, {"code": code, "name": name, "type": "", **dict.fromkeys(SHEETS.values())})
            if normalize(school["name"]) != normalize(name):
                raise ValueError(f"Baris {line}: nama sekolah bercanggah bagi kod {code}.")
            rate = active / total if total else None
            source_rate = row.get("peratus")
            school[key] = {"active": active, "total": total, "rate": rate,
                           "sourceRate": source_rate if isinstance(source_rate, (int, float)) else rate,
                           "sheet": sheet, "row": line}
            counts["accepted"] += 1

    if filename.lower().endswith(".xlsx"):
        try:
            import openpyxl
        except ImportError:
            raise ValueError("Pasang openpyxl dalam persekitaran Python untuk import Excel.") from None
        with path.open("rb") as workbook_file:
            workbook = openpyxl.load_workbook(workbook_file, read_only=True, data_only=True)
            try:
                for sheet, key in SHEETS.items():
                    if sheet not in workbook.sheetnames:
                        raise ValueError(f"Helaian {sheet} diperlukan.")
                    add(workbook[sheet].values, sheet, key)
                if "Aplikasi (Murid dan Guru)" in workbook.sheetnames:
                    for line, row in enumerate(workbook["Aplikasi (Murid dan Guru)"].values, 1):
                        if line > 1 and row[0] and row[1] is not None:
                            applications.append({"name": str(row[0]), "active": number_of(row[1], line)})
            finally:
                workbook.close()
    else:
        add(csv_rows(path), "CSV")
    if not schools:
        raise ValueError("Tiada rekod Petaling Utama dijumpai.")
    summary = {}
    for key in SHEETS.values():
        rows = [school[key] for school in schools.values() if school[key] is not None]
        active, total = sum(row["active"] for row in rows), sum(row["total"] for row in rows)
        summary[key] = {"active": active, "total": total, "rate": active / total if total else None, "schools": len(rows)}
    identifier = period["start"] + "_" + period["end"]
    counts["schools"] = len(schools)
    return {"id": identifier, "period": period, "district": "PETALING UTAMA", "source": filename,
            "schools": sorted(schools.values(), key=lambda school: school["code"]), "summary": summary,
            "applicationContext": {"scope": "Selangor", "items": applications},
            "audit": {"filter": "PPD PETALING UTAMA", **counts},
            "limitations": ["Set ini ialah ringkasan mengikut sekolah.", "Ukuran guru dan AI dilapor berasingan.",
                            "Data aplikasi hanya tersedia jika disertakan dalam laporan.",
                            "Kadar aktif berdasarkan jumlah pengguna dalam laporan."]}, counts


def known_codes():
    manifest = json.loads((DATA / "manifest.json").read_text())
    return {school["code"] for report in manifest["snapshots"]
            for school in json.loads((DATA / report["file"]).read_text())["schools"]}
