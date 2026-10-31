#!/usr/bin/env python3
"""Compare two same-sized PNGs; never treat a nonzero result as exact."""
import sys
from PIL import Image, ImageChops, ImageStat
if len(sys.argv) != 3:
    raise SystemExit('usage: compare-png.py reference.png candidate.png')
a,b=(Image.open(p).convert('RGBA') for p in sys.argv[1:])
if a.size != b.size:
    raise SystemExit(f'dimensions differ: {a.size} vs {b.size}')
d=ImageChops.difference(a,b)
print({'dimensions':a.size,'differentPixels':sum(pixel != (0,0,0,0) for pixel in d.getdata()),'bbox':d.convert('RGB').getbbox(),'max':tuple(c[1] for c in d.getextrema()),'mean':ImageStat.Stat(d).mean})
