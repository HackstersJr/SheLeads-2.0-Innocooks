"""
Generate a WhatsApp-style chat screenshot matching the attached image,
then POST it to /ai/analyze-screenshot and print the full response.
"""
import json
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# ── Layout constants ────────────────────────────────────────────────────────
W, H = 540, 900
BG = (225, 215, 196)        # WhatsApp beige background
SENT_BG = (220, 248, 198)   # Green outgoing bubble
RECV_BG = (255, 255, 255)   # White incoming bubble
HEADER_BG = (18, 83, 80)    # Dark teal header

# ── Fonts (fall back to default bitmap if TrueType unavailable) ─────────────
def _font(size: int, bold: bool = False):
    try:
        name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(name, size)
    except OSError:
        return ImageFont.load_default()

# ── Helpers ──────────────────────────────────────────────────────────────────
def draw_bubble(draw: ImageDraw.ImageDraw, text: str, x: int, y: int,
                max_w: int, bg: tuple, timestamp: str, bold: bool = False):
    font = _font(15, bold=bold)
    ts_font = _font(11)
    padding = 10
    line_h = 20

    # Word-wrap
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_w - 2 * padding:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)

    ts_bbox = draw.textbbox((0, 0), timestamp, font=ts_font)
    ts_w = ts_bbox[2] - ts_bbox[0]
    bubble_w = min(max_w, max(max(draw.textbbox((0,0), l, font=font)[2] for l in lines) + 2*padding, ts_w + 2*padding + 10))
    bubble_h = line_h * len(lines) + ts_bbox[3] + 2 * padding + 4

    draw.rounded_rectangle([x, y, x + bubble_w, y + bubble_h], radius=8, fill=bg)
    ty = y + padding
    for line in lines:
        draw.text((x + padding, ty), line, fill=(0, 0, 0), font=font)
        ty += line_h
    draw.text((x + bubble_w - ts_w - padding, y + bubble_h - ts_bbox[3] - padding + 2),
              timestamp, fill=(100, 100, 100), font=ts_font)
    return bubble_h + 10


# ── Build image ──────────────────────────────────────────────────────────────
img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

# Header
draw.rectangle([0, 0, W, 60], fill=HEADER_BG)
hfont = _font(16, bold=True)
draw.text((70, 18), "Unknown Number", fill=(255, 255, 255), font=hfont)
draw.ellipse([12, 12, 52, 52], fill=(150, 150, 150))  # avatar circle

# Chat messages: (text, is_sent, timestamp, bold)
messages = [
    ("You better pay me back soon.", True, "10:23 AM ✓✓", False),
    ("I'm sorry, I just need a little more time.\nPlease, give me a few more days.", False, "10:25 AM", False),
    ("No more excuses!", True, "10:27 AM ✓✓", False),
    ("Please, I'm trying my best...", False, "10:28 AM", False),
    (
        "If you don't pay up by tomorrow, I'll make your life a living hell. "
        "I'll come after your family. This is your last warning!",
        False,
        "10:29 AM",
        True,
    ),
]

y = 75
for text, is_sent, ts, bold in messages:
    max_bw = 340
    if is_sent:
        bh = draw_bubble(draw, text, W - max_bw - 12, y, max_bw, SENT_BG, ts, bold)
    else:
        bh = draw_bubble(draw, text, 12, y, max_bw, RECV_BG, ts, bold)
    y += bh + 8

out_path = Path(r"C:\Users\abiji\OneDrive\Documents\SheLeads\Backend\whatsapp_threat.png")
img.save(out_path)
print(f"Image saved → {out_path}")

# ── Upload to OCR endpoint ───────────────────────────────────────────────────
BOUNDARY = "----SheVestWABoundary"
img_bytes = out_path.read_bytes()

header = (
    f"--{BOUNDARY}\r\n"
    f'Content-Disposition: form-data; name="file"; filename="whatsapp_threat.png"\r\n'
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

print("\nSubmitting to /ai/analyze-screenshot …\n")
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        result = json.loads(r.read())
        print(json.dumps(result, indent=2))
except urllib.error.HTTPError as e:
    print("HTTPError", e.code, e.read().decode())
