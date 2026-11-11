"""Start with python3 scripts/import_admin.py, then open the printed address."""
import json
import secrets
import tempfile
from threading import Lock
from http.cookies import SimpleCookie
from time import monotonic
from urllib.error import URLError

import import_google
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from import_reports import DATA, build_roster, build_summary, known_codes, period_for

HOST = "127.0.0.1:4174"
sessions = {}
logins = {}
state_lock = Lock()
summary_lock = Lock()


class Admin(BaseHTTPRequestHandler):
    timeout = 20

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
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def log_request(self, code="-", size="-"):
        # OAuth callback query strings contain a one-time authorization code.
        self.log_message("%s %s %s", self.command, urlparse(self.path).path, code)

    def cookie(self, name):
        jar = SimpleCookie(self.headers.get("Cookie", ""))
        return jar[name].value if name in jar else ""

    def session(self):
        with state_lock:
            for key, value in list(sessions.items()):
                if value["expires"] <= monotonic():
                    del sessions[key]
            return sessions.get(self.cookie("pu_session"))

    def redirect(self, location, cookie=None):
        self.send_response(303)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Length", "0")
        if cookie:
            self.send_header("Set-Cookie", cookie + "; HttpOnly; SameSite=Lax; Path=/")
        self.end_headers()

    def do_GET(self):
        route = urlparse(self.path)
        if self.headers.get("Host") != HOST or route.path not in {"/", "/login", "/oauth/callback"}:
            self.reply({"error": "Halaman tidak tersedia."}, status=404)
            return
        try:
            config = import_google.client()
        except (OSError, ValueError, KeyError):
            config = None
        if route.path == "/login" and config:
            state = secrets.token_urlsafe(32)
            verifier = secrets.token_urlsafe(48)
            with state_lock:
                for key, (_, expires) in list(logins.items()):
                    if expires <= monotonic():
                        del logins[key]
                logins[state] = verifier, monotonic() + 300
            self.redirect(import_google.login_url(config, state, verifier), "pu_login=" + state + "; Max-Age=300")
            return
        if route.path == "/oauth/callback":
            query = parse_qs(route.query)
            state = query.get("state", [""])[0]
            with state_lock:
                pending = logins.pop(state, None) if secrets.compare_digest(state, self.cookie("pu_login")) else None
            if config and pending and pending[1] > monotonic() and query.get("code"):
                try:
                    access, lifetime = import_google.verify_login(config, query["code"][0], pending[0])
                except (ValueError, URLError, KeyError):
                    self.redirect("/?login=gagal", "pu_login=; Max-Age=0")
                    return
                session_id = secrets.token_urlsafe(32)
                with state_lock:
                    sessions[session_id] = {"access": access, "expires": monotonic() + lifetime,
                                            "csrf": secrets.token_urlsafe(24), "pending": {}}
                self.redirect("/", "pu_session=" + session_id + "; Max-Age=" + str(lifetime))
                return
            self.redirect("/?login=gagal", "pu_login=; Max-Age=0")
            return
        session = self.session()
        if not session:
            note = "Konfigurasi Google belum dipasang pada Mac ini."
            if config:
                note = 'Gunakan akaun Google CM4 PPD Petaling Utama. <a href="/login">Log masuk dengan Google</a>'
                if route.query == "login=gagal":
                    note = "Log masuk gagal atau akses Drive belum dibenarkan. " + note
            self.reply(f'<!doctype html><html lang="ms"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ruang Admin PU Insight</title><body style="max-width:35rem;margin:3rem auto;padding:0 1rem;font:16px system-ui;color:#172b46"><h1>Ruang Admin PU Insight</h1><p>{note}</p></body></html>', "text/html; charset=utf-8")
            return
        html = Path(__file__).with_name("import-admin.html").read_text()
        self.reply(html.replace("__TOKEN__", session["csrf"]), "text/html; charset=utf-8")

    def do_POST(self):
        session = self.session()
        if (self.headers.get("Host") != HOST or self.headers.get("Origin") != "http://" + HOST
                or not session or not secrets.compare_digest(self.headers.get("X-Import-Token", ""), session["csrf"])):
            self.reply({"error": "Permintaan tidak sah."}, status=403)
            return
        route = urlparse(self.path)
        options = {key: values[0] for key, values in parse_qs(route.query).items()}
        try:
            if route.path == "/periods":
                self.reply(json.loads((DATA / "manifest.json").read_text()))
                return
            if route.path == "/logout":
                with state_lock:
                    sessions.pop(self.cookie("pu_session"), None)
                self.reply({"message": "Log keluar berjaya."})
                return
            if route.path == "/publish-roster":
                if options.get("kind") not in {"students", "teachers"}:
                    raise ValueError("Pilih Set 2 atau Set 3.")
                with state_lock:
                    pending = session["pending"].get(options.get("kind"))
                    if not pending or options.get("token") != pending[0]:
                        raise ValueError("Semak pratonton semula sebelum terbitkan.")
                    del session["pending"][options["kind"]]
                try:
                    filename = import_google.publish(pending[1], session["access"])
                except URLError:
                    with state_lock:
                        session["pending"].setdefault(options["kind"], pending)
                    self.reply({"error": "Google Drive gagal menerima fail. Semak akses atau cuba semula."}, status=502)
                    return
                self.reply({"message": "Diterbitkan ke Google Drive · " + filename})
                return
            if route.path == "/save-summary":
                with summary_lock, state_lock:
                    pending_summary = session["pending"].get("summary")
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
                    session["pending"].pop("summary", None)
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
                    with summary_lock:
                        session["pending"]["summary"] = token, snapshot
                    self.reply({"counts": counts, "token": token, "period": period})
                else:
                    report, counts = build_roster(path, kind, period, known_codes())
                    token = secrets.token_urlsafe(16)
                    with state_lock:
                        session["pending"][kind] = token, report
                    self.reply({"counts": counts, "token": token})
        except TimeoutError:
            self.reply({"error": "Muat naik terhenti. Pilih fail dan cuba semula."}, status=408)
        except (ValueError, UnicodeError) as error:
            self.reply({"error": str(error)}, status=400)
        except Exception:
            self.reply({"error": "Fail gagal dibaca. Semak format dan cuba semula."}, status=400)


if __name__ == "__main__":
    print("PU Insight Import: http://" + HOST, flush=True)
    ThreadingHTTPServer(("127.0.0.1", 4174), Admin).serve_forever()
