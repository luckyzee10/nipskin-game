#!/usr/bin/env python3
import http.server
import socketserver
import os

class CacheBustingHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add cache-busting headers
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == "__main__":
    PORT = 8000
    
    with socketserver.TCPServer(("", PORT), CacheBustingHTTPRequestHandler) as httpd:
        print(f"Server running at http://localhost:{PORT}")
        print(f"Mobile access: http://192.168.1.46:{PORT}")
        print("Cache-busting enabled - no caching!")
        httpd.serve_forever()
