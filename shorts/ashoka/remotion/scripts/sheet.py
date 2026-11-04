# usage: python scripts/sheet.py out.jpg a.jpg b.jpg ... : side-by-side contact sheet (row), labels burned in for review only
import sys
from PIL import Image, ImageDraw
out, ims = sys.argv[1], [Image.open(p) for p in sys.argv[2:]]
w, h = ims[0].size
s = Image.new("RGB", (w * len(ims), h), "white")
for i, (im, p) in enumerate(zip(ims, sys.argv[2:])):
    s.paste(im.resize((w, h)), (i * w, 0)); ImageDraw.Draw(s).text((i * w + 6, 6), p.split("/")[-1], fill="red")
s.save(out, quality=88)
