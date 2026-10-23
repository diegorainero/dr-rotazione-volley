#!/usr/bin/env python3
"""Generate the rotazioni launcher icon at every Android density.

Design: a volleyball — white disc with the classic blue/yellow panel curves —
over a green court field with a rotation arrow around it. Geometric, legible
down to 48 px, rounded-square silhouette.

Run from the repo root: python3 scripts/gen-icon.py
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

MASTER = 1024
SIZES = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}
GREEN = (46, 125, 50)      # field green
BLUE = (0x34, 0x98, 0xDB)  # home blue
YELLOW = (0xF1, 0xC4, 0x0F)
WHITE = (255, 255, 255)
OUT = Path(__file__).resolve().parent.parent / "res"


def render(master: int) -> Image.Image:
    im = Image.new("RGBA", (master, master), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    radius = master * 0.20

    # Rounded-square field background.
    d.rounded_rectangle([0, 0, master - 1, master - 1], radius=radius, fill=GREEN)

    cx = cy = master / 2
    ball_r = master * 0.28

    # Volleyball: white disc with curved panels.
    d.ellipse([cx - ball_r, cy - ball_r, cx + ball_r, cy + ball_r], fill=WHITE,
              outline=(0, 0, 0), width=int(master * 0.012))
    # Three curved panel seams (arcs through the ball).
    seam_w = int(master * 0.018)
    d.arc([cx - ball_r * 1.6, cy - ball_r * 0.9, cx + ball_r * 0.4, cy + ball_r * 1.1],
          start=300, end=60, fill=BLUE, width=seam_w)
    d.arc([cx - ball_r * 0.4, cy - ball_r * 1.4, cx + ball_r * 1.6, cy + ball_r * 0.6],
          start=90, end=230, fill=BLUE, width=seam_w)
    d.arc([cx - ball_r * 1.0, cy - ball_r * 1.6, cx + ball_r * 1.0, cy + ball_r * 0.4],
          start=0, end=120, fill=YELLOW, width=seam_w)

    # Rotation arrow: circular arrow around the ball.
    arrow_r = ball_r * 1.35
    bbox = [cx - arrow_r, cy - arrow_r, cx + arrow_r, cy + arrow_r]
    arrow_w = int(master * 0.035)
    d.arc(bbox, start=-30, end=260, fill=WHITE, width=arrow_w)
    # Arrowhead at the end of the arc (260 deg).
    ang = math.radians(260)
    tip = (cx + arrow_r * math.cos(ang), cy + arrow_r * math.sin(ang))
    tangent = ang + math.pi / 2
    head_len = master * 0.07
    head_w = master * 0.045
    p1 = (tip[0] + head_len * math.cos(tangent) + head_w * math.cos(ang),
          tip[1] + head_len * math.sin(tangent) + head_w * math.sin(ang))
    p2 = (tip[0] + head_len * math.cos(tangent) - head_w * math.cos(ang),
          tip[1] + head_len * math.sin(tangent) - head_w * math.sin(ang))
    d.polygon([tip, p1, p2], fill=WHITE)
    return im


def main():
    im = render(MASTER)
    for density, size in SIZES.items():
        folder = OUT / ("mipmap-" + density)
        folder.mkdir(parents=True, exist_ok=True)
        resized = im.resize((size, size), Image.LANCZOS)
        resized.save(folder / "ic_launcher.png")
        print(f"res/mipmap-{density}/ic_launcher.png ({size}x{size})")


if __name__ == "__main__":
    main()
