from __future__ import annotations

import http.client
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
DIST_DIR = ROOT / "frontend" / "dist"
API_HOST = "127.0.0.1"
API_PORT = 8021


class DemoHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path.startswith("/api/"):
            self._proxy()
            return
        self._serve_static()

    def do_POST(self) -> None:
        if self.path.startswith("/api/"):
            self._proxy()
            return
        self.send_error(405)

    def _proxy(self) -> None:
        parsed = urlsplit(self.path)
        connection = http.client.HTTPConnection(API_HOST, API_PORT, timeout=15)
        body = None
        length = int(self.headers.get("Content-Length", "0"))
        if length:
            body = self.rfile.read(length)
        headers = {k: v for k, v in self.headers.items() if k.lower() != "host"}
        connection.request(self.command, self.path, body=body, headers=headers)
        response = connection.getresponse()
        payload = response.read()

        self.send_response(response.status)
        for key, value in response.getheaders():
            lower = key.lower()
            if lower in {"transfer-encoding", "connection", "server", "date"}:
                continue
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(payload)

    def _serve_static(self) -> None:
        request_path = urlsplit(self.path).path
        relative = request_path.lstrip("/") or "index.html"
        file_path = (DIST_DIR / relative).resolve()
        if not str(file_path).startswith(str(DIST_DIR.resolve())) or not file_path.exists() or file_path.is_dir():
            file_path = DIST_DIR / "index.html"

        content = file_path.read_bytes()
        content_type, _ = mimetypes.guess_type(str(file_path))
        self.send_response(200)
        self.send_header("Content-Type", content_type or "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 5180), DemoHandler)
    server.serve_forever()
