import http.server
import socket
import sys

PORT = 8001

class RobustHandler(http.server.SimpleHTTPRequestHandler):
    # 1. FORCE HTTP/1.0
    # Disables Keep-Alive to prevent race conditions (ERR_CONNECTION_RESET)
    protocol_version = "HTTP/1.0"

    def end_headers(self):
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        
        # Explicitly close to stop Chrome from reusing the socket
        self.send_header('Connection', 'close')
        
        # Prevent caching so you see changes immediately
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        
        super().end_headers()

class DualStackServer(http.server.ThreadingHTTPServer):
    # 2. ENABLE IPv6 (and IPv4 via Dual Stack)
    # This tells Python to use the IPv6 socket layer. 
    # On most OSs, binding to "::" allows access from both IPv4 and IPv6.
    address_family = socket.AF_INET6
    
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    try:
        # We bind to "::", which is the IPv6 equivalent of "0.0.0.0"
        server_address = ("::", PORT)
        
        with DualStackServer(server_address, RobustHandler) as httpd:
            print(f"✅ Serving on http://localhost:{PORT} (IPv6 + IPv4)")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
        sys.exit(0)
