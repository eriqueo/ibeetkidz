"""
Workshop sprite generator — produces transparent-background PNG sprites for:
  - toolbar-frame.png     (top nav panel bezel)
  - transport-frame.png   (bottom transport panel bezel)
  - inst-drum.png
  - inst-mic.png
  - inst-guitar.png
  - inst-keyboard.png

All sprites use the same warm-golden 16-bit pixel art palette as the base plate.
Output: src/assets/scenes-v2-sliced/
"""

from PIL import Image, ImageDraw
import os

PIXEL = 4

# ── Palette ───────────────────────────────────────────────────────────────────
METAL_LIGHT   = (200, 195, 180)
METAL_MID     = (160, 155, 140)
METAL_DARK    = (100,  95,  85)
METAL_SHADOW  = ( 60,  58,  50)
RIVET         = (120, 115, 105)
RIVET_SHINE   = (220, 215, 200)
LCD_BG        = ( 20,  35,  15)
LCD_GLOW      = ( 80, 200,  80)

WOOD_LIGHT    = (190, 150,  90)
WOOD_MID      = (155, 115,  60)
WOOD_DARK     = (110,  75,  35)

# Instrument colours
DRUM_SHELL    = (200,  60,  40)   # red drum
DRUM_HEAD     = (230, 220, 200)
DRUM_HOOP     = ( 60,  55,  50)
DRUM_STAND    = ( 80,  75,  70)
CYMBAL        = (210, 175,  50)

MIC_BODY      = (180, 180, 185)
MIC_GRILLE    = (130, 130, 135)
MIC_STAND     = (100, 100, 105)
MIC_BASE      = ( 80,  80,  85)

GUITAR_BODY   = (190,  80,  30)
GUITAR_NECK   = (160, 120,  60)
GUITAR_FRET   = (200, 180, 140)
GUITAR_STRING = (210, 200, 160)
GUITAR_PICK   = (240, 220,  80)

KEY_WHITE     = (240, 238, 230)
KEY_BLACK     = ( 30,  28,  25)
KEY_BODY      = (160, 155, 145)
KEY_SHADOW    = ( 90,  85,  80)
KEY_KNOB      = (200,  60,  40)

def snap(n):
    return (int(n) // PIXEL) * PIXEL

def rect(draw, x, y, w, h, color):
    x, y = snap(x), snap(y)
    w, h = max(PIXEL, snap(w)), max(PIXEL, snap(h))
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=color)

def rivet(draw, cx, cy):
    """Single pixel-art rivet."""
    rect(draw, cx - PIXEL, cy - PIXEL, PIXEL * 2, PIXEL * 2, RIVET)
    rect(draw, cx - PIXEL // 2, cy - PIXEL, PIXEL, PIXEL, RIVET_SHINE)

# ── Toolbar frame ─────────────────────────────────────────────────────────────

def gen_toolbar_frame(out_dir):
    """Long horizontal metallic panel bezel, 960×96 px."""
    W, H = 960, 96
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Main body
    rect(draw, 0, 0, W, H, METAL_MID)
    # Top highlight edge
    rect(draw, 0, 0, W, PIXEL * 2, METAL_LIGHT)
    # Bottom shadow edge
    rect(draw, 0, H - PIXEL * 2, W, PIXEL * 2, METAL_SHADOW)
    # Left shadow edge
    rect(draw, 0, 0, PIXEL * 2, H, METAL_SHADOW)
    # Right shadow edge
    rect(draw, W - PIXEL * 2, 0, PIXEL * 2, H, METAL_SHADOW)
    # Inner bevel top
    rect(draw, PIXEL * 2, PIXEL * 2, W - PIXEL * 4, PIXEL, METAL_LIGHT)
    # Inner bevel bottom
    rect(draw, PIXEL * 2, H - PIXEL * 3, W - PIXEL * 4, PIXEL, METAL_DARK)
    # Horizontal centre groove
    cy = H // 2
    rect(draw, PIXEL * 4, cy - PIXEL, W - PIXEL * 8, PIXEL * 2, METAL_DARK)
    rect(draw, PIXEL * 4, cy - PIXEL, W - PIXEL * 8, PIXEL, METAL_LIGHT)

    # Rivets at corners and every 120px along top/bottom
    for rx in range(snap(16), W - snap(16), snap(120)):
        rivet(draw, rx, snap(16))
        rivet(draw, rx, H - snap(16))

    img.save(os.path.join(out_dir, "toolbar-frame.png"), "PNG")
    print(f"  toolbar-frame.png  {W}×{H}")

# ── Transport frame ───────────────────────────────────────────────────────────

def gen_transport_frame(out_dir):
    """Horizontal metallic control panel with LCD recess, 960×120 px."""
    W, H = 960, 120
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Main body
    rect(draw, 0, 0, W, H, METAL_MID)
    rect(draw, 0, 0, W, PIXEL * 2, METAL_LIGHT)
    rect(draw, 0, H - PIXEL * 2, W, PIXEL * 2, METAL_SHADOW)
    rect(draw, 0, 0, PIXEL * 2, H, METAL_SHADOW)
    rect(draw, W - PIXEL * 2, 0, PIXEL * 2, H, METAL_SHADOW)

    # LCD recess (left side)
    lcd_x, lcd_y = snap(16), snap(16)
    lcd_w, lcd_h = snap(200), snap(88)
    rect(draw, lcd_x, lcd_y, lcd_w, lcd_h, METAL_SHADOW)
    rect(draw, lcd_x + PIXEL * 2, lcd_y + PIXEL * 2, lcd_w - PIXEL * 4, lcd_h - PIXEL * 4, LCD_BG)
    # LCD glow lines
    for row in range(lcd_y + PIXEL * 4, lcd_y + lcd_h - PIXEL * 4, PIXEL * 6):
        rect(draw, lcd_x + PIXEL * 4, row, lcd_w - PIXEL * 8, PIXEL * 2, (30, 60, 30))

    # Horizontal groove across middle
    cy = H // 2
    rect(draw, snap(230), cy - PIXEL, W - snap(246), PIXEL * 2, METAL_DARK)
    rect(draw, snap(230), cy - PIXEL, W - snap(246), PIXEL, METAL_LIGHT)

    # Rivets
    for rx in range(snap(16), W - snap(16), snap(120)):
        rivet(draw, rx, snap(16))
        rivet(draw, rx, H - snap(16))

    img.save(os.path.join(out_dir, "transport-frame.png"), "PNG")
    print(f"  transport-frame.png  {W}×{H}")

# ── Drum kit ──────────────────────────────────────────────────────────────────

def gen_drum(out_dir):
    """Simple pixel-art drum kit, 192×192 px."""
    S = 192
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Stand legs
    rect(draw, snap(S*0.35), snap(S*0.72), PIXEL*2, snap(S*0.24), DRUM_STAND)
    rect(draw, snap(S*0.60), snap(S*0.72), PIXEL*2, snap(S*0.24), DRUM_STAND)
    # Base drum (large, bottom centre)
    rect(draw, snap(S*0.15), snap(S*0.55), snap(S*0.70), snap(S*0.35), DRUM_HOOP)
    rect(draw, snap(S*0.18), snap(S*0.58), snap(S*0.64), snap(S*0.28), DRUM_SHELL)
    rect(draw, snap(S*0.20), snap(S*0.60), snap(S*0.60), snap(S*0.24), DRUM_HEAD)
    # Snare drum (small, left)
    rect(draw, snap(S*0.05), snap(S*0.38), snap(S*0.32), snap(S*0.22), DRUM_HOOP)
    rect(draw, snap(S*0.07), snap(S*0.40), snap(S*0.28), snap(S*0.18), DRUM_SHELL)
    rect(draw, snap(S*0.08), snap(S*0.41), snap(S*0.26), snap(S*0.14), DRUM_HEAD)
    # Tom drum (right)
    rect(draw, snap(S*0.62), snap(S*0.30), snap(S*0.30), snap(S*0.22), DRUM_HOOP)
    rect(draw, snap(S*0.64), snap(S*0.32), snap(S*0.26), snap(S*0.18), DRUM_SHELL)
    rect(draw, snap(S*0.65), snap(S*0.33), snap(S*0.24), snap(S*0.14), DRUM_HEAD)
    # Cymbal
    rect(draw, snap(S*0.55), snap(S*0.18), snap(S*0.36), PIXEL*3, CYMBAL)
    rect(draw, snap(S*0.70), snap(S*0.14), PIXEL*2, snap(S*0.08), DRUM_STAND)
    # Highlight
    rect(draw, snap(S*0.22), snap(S*0.62), snap(S*0.12), PIXEL*2, (240,230,220))

    img.save(os.path.join(out_dir, "inst-drum.png"), "PNG")
    print(f"  inst-drum.png  {S}×{S}")

# ── Microphone ────────────────────────────────────────────────────────────────

def gen_mic(out_dir):
    """Vintage microphone on stand, 128×192 px."""
    W, H = 128, 192
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx = W // 2
    # Stand base
    rect(draw, snap(cx - 36), snap(H*0.85), snap(72), snap(H*0.12), MIC_BASE)
    rect(draw, snap(cx - 8), snap(H*0.30), PIXEL*4, snap(H*0.58), MIC_STAND)
    # Mic body
    rect(draw, snap(cx - 20), snap(H*0.08), snap(40), snap(H*0.26), MIC_BODY)
    # Grille
    rect(draw, snap(cx - 16), snap(H*0.10), snap(32), snap(H*0.20), MIC_GRILLE)
    for row in range(snap(int(H*0.11)), snap(int(H*0.29)), PIXEL*3):
        rect(draw, snap(cx - 14), row, snap(28), PIXEL, (100, 100, 105))
    # Highlight
    rect(draw, snap(cx - 16), snap(H*0.10), PIXEL*2, snap(H*0.18), (210, 210, 215))
    # Connector ring
    rect(draw, snap(cx - 20), snap(H*0.33), snap(40), PIXEL*3, MIC_BASE)

    img.save(os.path.join(out_dir, "inst-mic.png"), "PNG")
    print(f"  inst-mic.png  {W}×{H}")

# ── Guitar ────────────────────────────────────────────────────────────────────

def gen_guitar(out_dir):
    """Electric bass guitar, 128×192 px, angled slightly."""
    W, H = 128, 192
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Body (lower right)
    rect(draw, snap(W*0.35), snap(H*0.50), snap(W*0.55), snap(H*0.42), GUITAR_BODY)
    rect(draw, snap(W*0.38), snap(H*0.52), snap(W*0.48), snap(H*0.36), GUITAR_BODY)
    # Body highlight
    rect(draw, snap(W*0.38), snap(H*0.52), PIXEL*3, snap(H*0.30), (220, 110, 60))
    # Sound hole
    rect(draw, snap(W*0.52), snap(H*0.60), snap(W*0.20), snap(H*0.16), (80, 30, 10))
    # Neck (diagonal upper-left)
    rect(draw, snap(W*0.10), snap(H*0.08), PIXEL*5, snap(H*0.52), GUITAR_NECK)
    # Fret markers
    for fy in range(snap(int(H*0.14)), snap(int(H*0.54)), snap(int(H*0.08))):
        rect(draw, snap(W*0.10), fy, PIXEL*5, PIXEL*2, GUITAR_FRET)
    # Strings (3 thin lines)
    for sx in [snap(W*0.12), snap(W*0.15), snap(W*0.18)]:
        rect(draw, sx, snap(H*0.08), PIXEL, snap(H*0.84), GUITAR_STRING)
    # Headstock
    rect(draw, snap(W*0.06), snap(H*0.04), snap(W*0.20), snap(H*0.10), GUITAR_NECK)
    # Tuning pegs
    for px2 in [snap(W*0.06), snap(W*0.14), snap(W*0.22)]:
        rect(draw, px2, snap(H*0.04), PIXEL*3, PIXEL*3, GUITAR_FRET)

    img.save(os.path.join(out_dir, "inst-guitar.png"), "PNG")
    print(f"  inst-guitar.png  {W}×{H}")

# ── Keyboard ──────────────────────────────────────────────────────────────────

def gen_keyboard(out_dir):
    """Synthesizer keyboard, 256×128 px."""
    W, H = 256, 128
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Body
    rect(draw, 0, snap(H*0.20), W, snap(H*0.75), KEY_BODY)
    rect(draw, 0, snap(H*0.20), W, PIXEL*2, METAL_LIGHT)
    rect(draw, 0, snap(H*0.90), W, PIXEL*2, KEY_SHADOW)

    # White keys (8 visible)
    key_w = snap(W / 9)
    key_h = snap(H * 0.52)
    key_top = snap(H * 0.28)
    for i in range(8):
        kx = snap(PIXEL*4 + i * (key_w + PIXEL))
        rect(draw, kx, key_top, key_w, key_h, KEY_WHITE)
        rect(draw, kx + key_w - PIXEL, key_top, PIXEL, key_h, KEY_SHADOW)
        rect(draw, kx, key_top + key_h - PIXEL, key_w, PIXEL, KEY_SHADOW)

    # Black keys (5 visible, between white keys)
    bk_w = snap(key_w * 0.55)
    bk_h = snap(key_h * 0.60)
    black_positions = [0, 1, 3, 4, 5]  # gaps between white keys
    for i in black_positions:
        bx = snap(PIXEL*4 + i * (key_w + PIXEL) + key_w - bk_w // 2)
        rect(draw, bx, key_top, bk_w, bk_h, KEY_BLACK)
        rect(draw, bx, key_top, bk_w, PIXEL, (60, 58, 55))

    # Control knobs (top strip)
    for kx in range(snap(W*0.55), W - snap(20), snap(28)):
        rect(draw, kx, snap(H*0.24), snap(18), snap(18), KEY_KNOB)
        rect(draw, kx + PIXEL, snap(H*0.24), PIXEL*2, PIXEL*2, (230, 100, 60))

    # Pitch bend wheel
    rect(draw, PIXEL*4, snap(H*0.30), snap(20), snap(H*0.36), KEY_SHADOW)
    rect(draw, PIXEL*6, snap(H*0.36), snap(16), snap(H*0.18), METAL_MID)

    img.save(os.path.join(out_dir, "inst-keyboard.png"), "PNG")
    print(f"  inst-keyboard.png  {W}×{H}")

# ── Main ──────────────────────────────────────────────────────────────────────

def generate():
    out_dir = os.path.join(
        os.path.dirname(__file__), "..", "src", "assets", "scenes-v2-sliced"
    )
    os.makedirs(out_dir, exist_ok=True)
    print(f"Writing sprites to {out_dir}/")
    gen_toolbar_frame(out_dir)
    gen_transport_frame(out_dir)
    gen_drum(out_dir)
    gen_mic(out_dir)
    gen_guitar(out_dir)
    gen_keyboard(out_dir)
    print("Done.")

if __name__ == "__main__":
    generate()
