#!/usr/bin/env python3
"""inference.cpp WebUI server - serves dashboard + proxies /v1 to gateway."""
import http.server
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

PORT = int(os.environ.get("WEBUI_PORT", 8090))
GATEWAY = os.environ.get("GATEWAY_URL", "http://127.0.0.1:8080")
STATIC = Path(__file__).parent / "static"


class DashboardHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def do_GET(self):
        if self.path.startswith("/v1/"):
            return self._proxy("GET")
        if self.path == "/":
            self.path = "/index.html"
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/v1/"):
            return self._proxy("POST")
        self.send_error(404)

    def _proxy(self, method):
        url = GATEWAY + self.path
        try:
            body = None
            if method == "POST":
                n = int(self.headers.get("Content-Length", 0))
                body = self.rfile.read(n) if n else None
            req = urllib.request.Request(url, data=body, method=method)
            req.add_header("Content-Type", "application/json")
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Gateway unreachable: {e}"}).encode())

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    print(f"inference.cpp WebUI  http://0.0.0.0:{PORT}")
    print(f"Gateway proxy       {GATEWAY}")
    server = http.server.HTTPServer(("0.0.0.0", PORT), DashboardHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down.")
        server.shutdown()
