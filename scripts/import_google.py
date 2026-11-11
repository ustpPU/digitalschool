"""Google sign-in and publishing for the loopback importer."""
import base64
import hashlib
import json
import os
import secrets
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ADMIN = "ppd-b110-cm4@moe-dl.edu.my"
DRIVE = "https://www.googleapis.com/auth/drive"
CALLBACK = "http://127.0.0.1:4174/oauth/callback"


def client():
    config = os.environ.get("PU_GOOGLE_CLIENT_FILE")
    return json.loads(Path(config).expanduser().read_text())["installed"] if config and os.environ.get("PU_ROSTER_FOLDER_ID") else None


def google_json(url, data=None, token=None, content_type=None):
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    if content_type:
        headers["Content-Type"] = content_type
    with urlopen(Request(url, data=data, headers=headers), timeout=20) as response:
        return json.load(response)


def login_url(config, state, verifier):
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
        "client_id": config["client_id"], "redirect_uri": CALLBACK, "response_type": "code",
        "scope": "openid email " + DRIVE, "state": state, "login_hint": ADMIN,
        "code_challenge": challenge, "code_challenge_method": "S256",
    })


def verify_login(config, code, verifier):
    result = google_json("https://oauth2.googleapis.com/token", urlencode({
        "client_id": config["client_id"], "client_secret": config["client_secret"],
        "code": code, "code_verifier": verifier, "redirect_uri": CALLBACK,
        "grant_type": "authorization_code",
    }).encode(), content_type="application/x-www-form-urlencoded")
    access = result["access_token"]
    identity = google_json("https://openidconnect.googleapis.com/v1/userinfo", token=access)
    if identity.get("email_verified") is not True or identity.get("email", "").lower() != ADMIN:
        raise ValueError("Gunakan akaun Google CM4 PPD Petaling Utama.")
    if DRIVE not in result.get("scope", "").split():
        raise ValueError("Kebenaran tulis Google Drive diperlukan untuk penerbitan.")
    return access, int(result["expires_in"])


def publish(report, access):
    period = report["period"]
    name = f'{report["kind"]}-{period["end"]}_{period["start"]}.json'
    boundary = secrets.token_hex(24)
    metadata = json.dumps({"name": name, "parents": [os.environ["PU_ROSTER_FOLDER_ID"]], "mimeType": "application/json"})
    payload = json.dumps(report, ensure_ascii=False)
    body = (
        f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{metadata}\r\n"
        f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{payload}\r\n"
        f"--{boundary}--\r\n"
    ).encode()
    google_json("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id",
                body, access, "multipart/related; boundary=" + boundary)
    return name
