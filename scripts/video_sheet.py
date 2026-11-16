"""Planche-contact 2x2 (960x540 par image) pour contrôle visuel : video_sheet.py out.png a.png b.png c.png d.png"""
import sys
from PIL import Image
out, ims = sys.argv[1], sys.argv[2:]
S = Image.new("RGB", (1920, 540 * ((len(ims) + 1) // 2)), "white")
for i, f in enumerate(ims):
    S.paste(Image.open(f).convert("RGB").resize((960, 540), Image.LANCZOS), ((i % 2) * 960, (i // 2) * 540))
S.save(out)
