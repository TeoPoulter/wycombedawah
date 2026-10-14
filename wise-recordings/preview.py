#!/usr/bin/env python3
"""Local-only player preview, optionally overlaying a private recording index."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit
from functools import partial
import argparse
parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=4173)
parser.add_argument('--media-directory', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if args.media_directory and urlsplit(self.path).path == '/wise-recordings/recordings.json':
            index = args.media_directory / 'preview-index.json'
            body = index.read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()
print(f'Local player: http://127.0.0.1:{args.port}/wise-recordings/', flush=True)
server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(PreviewHandler, directory=str(root)))
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
