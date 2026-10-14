# python tools/compare.py <set> [x0 y0 x1 y1] [zoom]
# Склеивает макет (сверху) и рендер (снизу) одной области - tmp/side_<set>.png
# и считает среднюю разницу по пикселям.
import sys
from PIL import Image, ImageChops, ImageStat
s = sys.argv[1]
ref = Image.open(f'ref/{s}.png').convert('RGB')
ren = Image.open(f'tmp/cmp_{s}.png').convert('RGB')
box = tuple(map(int, sys.argv[2:6])) if len(sys.argv) >= 6 else (0, 0, ref.width, ref.height)
z = float(sys.argv[6]) if len(sys.argv) >= 7 else 1
a, b = ref.crop(box), ren.crop(box)
if z != 1:
    a = a.resize((int(a.width * z), int(a.height * z)), Image.LANCZOS)
    b = b.resize((int(b.width * z), int(b.height * z)), Image.LANCZOS)
horiz = a.width < a.height
out = Image.new('RGB', (a.width * 2 + 6, a.height) if horiz else (a.width, a.height * 2 + 6), 'red')
out.paste(a, (0, 0)); out.paste(b, (a.width + 6, 0) if horiz else (0, a.height + 6))
out.save(f'tmp/side_{s}.png')
d = ImageStat.Stat(ImageChops.difference(ref.crop(box), ren.crop(box))).mean
print('mean abs diff', round(sum(d) / 3, 2))
