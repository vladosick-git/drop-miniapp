# python tools/crop.py name src x0 y0 x1 y1 [scale]  -> tmp/name.png (zoomed for looking)
import sys
from PIL import Image
n,src,*b=sys.argv[1:]
x0,y0,x1,y1=map(int,b[:4]); s=float(b[4]) if len(b)>4 else 2
im=Image.open(f'ref/{src}.png').convert('RGB').crop((x0,y0,x1,y1))
im=im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS); im.save(f'tmp/{n}.png')
