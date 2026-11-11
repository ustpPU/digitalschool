"""Start with python3 scripts/import_admin.py, then open the printed address."""
import json
import secrets
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from import_reports import DATA, build_roster, build_summary, known_codes, period_for

HOST = "127.0.0.1:4174"
TOKEN = secrets.token_urlsafe(24)
pending_summary = None


class Admin(BaseHTTPRequestHandler):
    def reply(self, body, mime="application/json; charset=utf-8", status=200, filename=None):
        payload = body.encode() if isinstance(body, str) else json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(payload)))
        if filename:
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path != "/" or self.headers.get("Host") != HOST:
            self.reply({"error": "Halaman tidak tersedia."}, status=404)
            return
        html = Path(__file__).with_name("import-admin.html").read_text()
        self.reply(html.replace("__TOKEN__", TOKEN), "text/html; charset=utf-8")

    def do_POST(self):
        global pending_summary
        if self.headers.get("Host") != HOST or self.headers.get("Origin") != "http://" + HOST or self.headers.get("X-Import-Token") != TOKEN:
            self.reply({"error": "Permintaan tidak sah."}, status=403)
            return
        route = urlparse(self.path)
        options = {key: values[0] for key, values in parse_qs(route.query).items()}
        try:
            if route.path == "/periods":
                self.reply(json.loads((DATA / "manifest.json").read_text()))
                return
            if route.path == "/save-summary":
                if not pending_summary or options.get("token") != pending_summary[0]:
                    raise ValueError("Pratonton ringkasan semula sebelum simpan.")
                snapshot = pending_summary[1]
                filename = "snapshot-" + snapshot["id"] + ".json"
                manifest_path = DATA / "manifest.json"
                manifest = json.loads(manifest_path.read_text())
                reports = [report for report in manifest["snapshots"] if report["id"] != snapshot["id"]]
                reports.append({"id": snapshot["id"], "label": snapshot["period"]["label"], "file": filename})
                manifest["snapshots"] = sorted(reports, key=lambda r: r["id"].split("_")[::-1], reverse=True)
                for path, data in [(DATA / filename, snapshot), (manifest_path, manifest)]:
                    temporary = path.with_suffix(".tmp")
                    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2))
                    temporary.replace(path)
                pending_summary = None
                self.reply({"message": "Ringkasan disimpan dalam checkout tempatan. Terbitkan perubahan snapshot dan manifest ke GitHub untuk kemas kini laman awam."})
                return
            if route.path != "/preview" or options.get("kind") not in {"summary", "students", "teachers"}:
                raise ValueError("Pilih jenis import.")
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 512 * 1024 * 1024:
                raise ValueError("Pilih fail sehingga 512 MB.")
            kind = options["kind"]
            period = period_for(options.get("start", ""), options.get("end", ""))
            filename = Path(options.get("filename", "laporan.csv")).name
            if kind == "summary" and not filename.lower().endswith((".csv", ".xlsx")):
                raise ValueError("Gunakan CSV atau XLSX.")
            if kind != "summary" and not filename.lower().endswith(".csv"):
                raise ValueError("Gunakan fail CSV.")
            with tempfile.TemporaryDirectory(prefix="pu-insight-") as folder:
                path = Path(folder) / "input"
                remaining = size
                with path.open("wb") as output:
                    while remaining:
                        block = self.rfile.read(min(remaining, 1024 * 1024))
                        if not block:
                            raise ValueError("Fail tidak lengkap.")
                        output.write(block)
                        remaining -= len(block)
                if kind == "summary":
                    snapshot, counts = build_summary(path, filename, period)
                    token = secrets.token_urlsafe(16)
                    pending_summary = token, snapshot
                    self.reply({"counts": counts, "token": token, "period": period})
                else:
                    report, counts = build_roster(path, kind, period, known_codes())
                    self.reply({"counts": counts, "report": report})
        except (ValueError, UnicodeError) as error:
            self.reply({"error": str(error)}, status=400)
        except Exception:
            self.reply({"error": "Fail gagal dibaca. Semak format dan cuba semula."}, status=400)


if __name__ == "__main__":
    print("PU Insight Import: http://" + HOST, flush=True)
    HTTPServer(("127.0.0.1", 4174), Admin).serve_forever()
