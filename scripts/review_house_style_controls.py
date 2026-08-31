from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BUTTONS = ROOT / 'src/assets/sprites/buttons'
OUT = ROOT / 'design/review/style-reset/house-style-controls-70px.png'
items = [
    ('MAP', 'btn-nav-map-idle.png'),
    ('RIDE', 'btn-track-ride-idle.png'),
    ('CLEAR', 'btn-track-clear-idle.png'),
    ('LOOP', 'btn-transport-loop-idle.png'),
    ('TARP', 'btn-track-tarp-idle.png'),
    ('STOP', 'btn-transport-stop-idle.png'),
    ('SEND', 'btn-send-song-idle.png'),
    ('SLOW', 'btn-transport-slow-idle.png'),
    ('FAST', 'btn-transport-fast-idle.png'),
]
cell_w, cell_h, margin = 160, 125, 16
sheet = Image.new('RGBA', (margin * 2 + cell_w * 3, margin * 2 + cell_h * 3), (31, 29, 34, 255))
d = ImageDraw.Draw(sheet)
for i, (name, file) in enumerate(items):
    card = Image.open(BUTTONS / file).convert('RGBA').resize((70, 70), Image.Resampling.NEAREST)
    x = margin + (i % 3) * cell_w + 45
    y = margin + (i // 3) * cell_h + 20
    sheet.alpha_composite(card, (x, y))
    d.text((x, y + 78), name, fill=(251, 243, 217, 255))
OUT.parent.mkdir(parents=True, exist_ok=True)
sheet.convert('RGB').save(OUT)
print(OUT)
