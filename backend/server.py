import os
import sys
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import mimetypes

# Add local directory to path for imports
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
APP_DIR = os.path.join(BASE_DIR, "app")
sys.path.append(os.path.join(BASE_DIR, "backend"))

from scraper import scrape_property_url, extract_property_from_text
from ai_advisor import calculate_property_scores, compare_properties_ai, ai_chat_response

PROPERTIES_FILE = os.path.join(DATA_DIR, "properties.json")
FINANCES_FILE = os.path.join(DATA_DIR, "finances.json")


def load_json(filepath, default):
    try:
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
    return default


def save_json(filepath, data):
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving {filepath}: {e}")
        return False


class PropertyAppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=APP_DIR, **kwargs)

    def end_headers(self):
        # Enable CORS for local testing
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def read_body_json(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length > 0:
            body = self.rfile.read(content_length).decode("utf-8")
            try:
                return json.loads(body)
            except Exception:
                return {}
        return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/properties":
            props = load_json(PROPERTIES_FILE, [])
            finances = load_json(FINANCES_FILE, {})
            # Enrich each with AI scores
            enriched = []
            for p in props:
                scores = calculate_property_scores(p, finances)
                enriched.append({**p, "aiScores": scores})
            self.send_json(200, enriched)
            return

        elif path == "/api/finances":
            finances = load_json(FINANCES_FILE, {})
            self.send_json(200, finances)
            return

        elif path == "/api/status":
            self.send_json(200, {"status": "ok", "app": "NestQuest AI - Property Hunter"})
            return

        # Serve static files from APP_DIR
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/properties":
            body = self.read_body_json()
            props = load_json(PROPERTIES_FILE, [])
            prop_id = body.get("id")
            if not prop_id:
                prop_id = "prop-" + str(int(os.times().system * 1000) if hasattr(os, 'times') else len(props) + 1)
                body["id"] = prop_id

            # Update or append
            idx = next((i for i, p in enumerate(props) if p.get("id") == prop_id), -1)
            if idx >= 0:
                props[idx] = body
            else:
                props.append(body)

            save_json(PROPERTIES_FILE, props)
            finances = load_json(FINANCES_FILE, {})
            scores = calculate_property_scores(body, finances)
            self.send_json(200, {"success": True, "property": {**body, "aiScores": scores}})
            return

        elif path == "/api/finances":
            body = self.read_body_json()
            save_json(FINANCES_FILE, body)
            self.send_json(200, {"success": True, "finances": body})
            return

        elif path == "/api/scrape":
            body = self.read_body_json()
            url = body.get("url", "")
            result = scrape_property_url(url)
            self.send_json(200, result)
            return

        elif path == "/api/parse-text":
            body = self.read_body_json()
            text = body.get("text", "")
            extracted = extract_property_from_text(text)
            self.send_json(200, {"success": True, "data": extracted})
            return

        elif path == "/api/ai/compare":
            body = self.read_body_json()
            prop_ids = body.get("propertyIds", [])
            props = load_json(PROPERTIES_FILE, [])
            finances = load_json(FINANCES_FILE, {})
            result = compare_properties_ai(prop_ids, props, finances)
            self.send_json(200, result)
            return

        elif path == "/api/ai/chat":
            body = self.read_body_json()
            message = body.get("message", "")
            props = load_json(PROPERTIES_FILE, [])
            finances = load_json(FINANCES_FILE, {})
            response = ai_chat_response(message, props, finances)
            self.send_json(200, {"reply": response})
            return

        self.send_json(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/properties/"):
            prop_id = path.replace("/api/properties/", "").strip()
            props = load_json(PROPERTIES_FILE, [])
            filtered = [p for p in props if p.get("id") != prop_id]
            save_json(PROPERTIES_FILE, filtered)
            self.send_json(200, {"success": True, "deleted": prop_id, "remaining": len(filtered)})
            return

        self.send_json(404, {"error": "Endpoint not found"})


def run_server(port=8550):
    mimetypes.init()
    for try_port in range(port, port + 10):
        try:
            server_address = ("", try_port)
            httpd = HTTPServer(server_address, PropertyAppHandler)
            print(f"✨ Property Hunter Server running at: http://localhost:{try_port}")
            import subprocess
            try:
                lip = subprocess.run(["ipconfig", "getifaddr", "en0"], capture_output=True, text=True).stdout.strip()
                if lip:
                    print(f"📱 Connect Jordan & Emma's phones at: http://{lip}:{try_port}")
            except Exception:
                pass
            print(f"📂 Serving app from: {APP_DIR}")
            print("Press Ctrl+C to stop.")
            httpd.serve_forever()
            break
        except OSError as e:
            if "Address already in use" in str(e):
                continue
            else:
                raise e

if __name__ == "__main__":
    port = 8550
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
