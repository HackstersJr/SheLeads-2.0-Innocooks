"""One-shot OCR upload test for Phase 8 verification."""
import json
import urllib.request
from pathlib import Path

IMG_PATH = r"C:\Users\abiji\OneDrive\Documents\SheLeads\Backend\test_threat.png"
BOUNDARY = "----SheVestBoundary7e3f"

img_bytes = Path(IMG_PATH).read_bytes()

header = (
    f"--{BOUNDARY}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="test_threat.png"\r\n'
    f"Content-Type: image/png\r\n\r\n"
).encode()

footer = f"\r\n--{BOUNDARY}--\r\n".encode()
body = header + img_bytes + footer

req = urllib.request.Request(
    "http://localhost:8000/ai/analyze-screenshot",
    data=body,
    headers={"Content-Type": f"multipart/form-data; boundary={BOUNDARY}"},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=90) as r:
        print(json.dumps(json.loads(r.read()), indent=2))
except urllib.error.HTTPError as e:
    print("HTTPError", e.code, e.read().decode())
