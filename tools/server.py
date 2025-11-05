import http.server
import socketserver

PORT = 8001

class PNAEnabledHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add the necessary headers to every response
        # self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')

        # Call the parent class's end_headers
        http.server.SimpleHTTPRequestHandler.end_headers(self)

# --- This is the part that runs the server ---
with socketserver.TCPServer(("", PORT), PNAEnabledHandler) as httpd:
    print(f"Serving at http://localhost:{PORT} with PNA headers enabled")
    httpd.serve_forever()
