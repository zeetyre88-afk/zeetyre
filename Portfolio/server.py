from email import policy
from email.parser import BytesParser
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, unquote
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(ROOT, 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

class PortfolioHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != '/upload':
            self.send_error(404)
            return

        content_type = self.headers.get('Content-Type', '')
        if 'multipart/form-data' not in content_type:
            self.send_error(400, 'Expected multipart/form-data upload')
            return

        content_length = int(self.headers.get('Content-Length', '0'))
        body = self.rfile.read(content_length)
        message = BytesParser(policy=policy.default).parsebytes(
            f'Content-Type: {content_type}\r\n\r\n'.encode('utf-8') + body
        )

        saved = []
        for part in message.iter_parts():
            disposition = part.get_content_disposition()
            if disposition != 'form-data':
                continue

            filename = part.get_filename()
            if not filename:
                continue

            filename = os.path.basename(unquote(filename))
            stem, ext = os.path.splitext(filename)
            candidate = filename
            counter = 1
            while os.path.exists(os.path.join(UPLOAD_DIR, candidate)):
                candidate = f'{stem}_{counter}{ext}'
                counter += 1

            filepath = os.path.join(UPLOAD_DIR, candidate)
            payload = part.get_payload(decode=True)
            if payload is None:
                continue
            with open(filepath, 'wb') as image_file:
                image_file.write(payload)

            saved.append({'name': candidate, 'path': f'/uploads/{candidate}'})

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(saved).encode('utf-8'))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == '/gallery-assets':
            images = []
            for filename in sorted(os.listdir(UPLOAD_DIR)):
                if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg')):
                    images.append({'name': filename, 'path': f'/uploads/{filename}'})
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(images).encode('utf-8'))
            return

        if parsed.path.startswith('/uploads/'):
            self.path = parsed.path
            return SimpleHTTPRequestHandler.do_GET(self)
        return super().do_GET()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    httpd = ThreadingHTTPServer(('0.0.0.0', port), PortfolioHandler)
    print(f'Serving on http://0.0.0.0:{port}')
    httpd.serve_forever()
