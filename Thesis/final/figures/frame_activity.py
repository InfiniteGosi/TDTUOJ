# Adds a Visual-Paradigm-style outer frame + title bar + lane-header separator
# line to a PlantUML-rendered swimlane activity PNG.
import sys
from PIL import Image, ImageDraw, ImageFont

# Defaults (overridable via argv: python frame_activity.py <SRC> <DST> "<TITLE>")
SRC   = r"D:\OJ\Thesis\final\figures\activity-submit.png"
DST   = r"D:\OJ\Thesis\final\figures\activity-submit.png"
TITLE = "act Submit solution"
if len(sys.argv) >= 4:
    SRC, DST, TITLE = sys.argv[1], sys.argv[2], sys.argv[3]

img = Image.open(SRC).convert("RGB")
W, H = img.size
px = img.load()

def is_dark(rgb, thr=200):
    return rgb[0] < thr and rgb[1] < thr and rgb[2] < thr

# --- Detect the vertical lane divider: the column with the longest run of dark px ---
best_x, best_run = None, 0
for x in range(int(W * 0.30), int(W * 0.70)):
    run = 0
    for y in range(0, H):
        if is_dark(px[x, y]):
            run += 1
    if run > best_run:
        best_run, best_x = run, x
divider_x = best_x if best_x is not None else W // 2

# --- Top y of that divider = bottom of the lane-header row ---
divider_top = 0
for y in range(0, H):
    if is_dark(px[divider_x, y]):
        divider_top = y
        break

# --- Fonts ---
def load_font(size, bold=False):
    names = (["arialbd.ttf", "Arialbd.ttf"] if bold else ["arial.ttf", "Arial.ttf"])
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except Exception:
            pass
    return ImageFont.load_default()

title_font  = load_font(16, bold=True)
header_font = load_font(13, bold=True)

# --- Compose: title bar on top of the body ---
TITLE_H = 34
PAD = 1
new_W = W + 2 * PAD
new_H = H + TITLE_H + 2 * PAD
canvas = Image.new("RGB", (new_W, new_H), "white")
canvas.paste(img, (PAD, TITLE_H + PAD))
d = ImageDraw.Draw(canvas)

OX, OY = PAD, PAD                       # body origin within canvas
body_divider_x = OX + divider_x
header_line_y  = TITLE_H + OY + divider_top

# Outer frame
d.rectangle([0, 0, new_W - 1, new_H - 1], outline="black", width=2)
# Line under title bar (separates title from lane-header row)
d.line([0, TITLE_H, new_W - 1, TITLE_H], fill="black", width=1)
# Line under lane-header row (separates headers from activity body)
d.line([OX, header_line_y, OX + W - 1, header_line_y], fill="black", width=1)
# Extend the lane divider up through the header row to the title-bar line
d.line([body_divider_x, TITLE_H, body_divider_x, header_line_y], fill="black", width=1)

# Title text — centered in the title bar
tb = d.textbbox((0, 0), TITLE, font=title_font)
tw, th = tb[2] - tb[0], tb[3] - tb[1]
d.text(((new_W - tw) / 2, (TITLE_H - th) / 2 - tb[1]), TITLE, fill="black", font=title_font)

canvas.save(DST)
print(f"divider_x={divider_x} run={best_run} divider_top={divider_top} -> {new_W}x{new_H}")
