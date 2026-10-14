# Нарезка фото GPT (incoming_gpt/) под все слоты вёрстки -> assets/img/*.jpg
# Предметка: находим вещь по отличию от фона и кадрируем вокруг неё
# с нужным соотношением сторон и заполнением; не хватает фона - достраиваем краем.
import cv2, numpy as np, os
SRC, OUT = 'incoming_gpt', 'assets/img'
os.makedirs(OUT, exist_ok=True)
cache = {}
def load(n):
    if n not in cache: cache[n] = cv2.imread(f'{SRC}/{n}.png')
    return cache[n]

def bbox(img):
    h, w = img.shape[:2]
    corners = np.concatenate([img[:20, :20].reshape(-1, 3), img[:20, -20:].reshape(-1, 3), img[-20:, :20].reshape(-1, 3), img[-20:, -20:].reshape(-1, 3)])
    bg = np.median(corners, 0)
    d = np.abs(img.astype(int) - bg).max(2)
    m = (d > 28).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 0.002 * w * h]
    ys, xs = np.where(np.isin(lab, keep))
    return xs.min(), ys.min(), xs.max(), ys.max()

def obj(name, out, aspect, fill, by='auto', cx=0.5, cy=0.5, width=900, shadow=0.04):
    """fill - доля кадра, которую занимает вещь (по ширине или высоте);
    cx, cy - где в кадре центр вещи; shadow - запас вниз под тень (доля высоты вещи)."""
    img = load(name)
    x0, y0, x1, y1 = bbox(img)
    ow, oh = x1 - x0, (y1 - y0) * (1 + shadow)
    if by == 'auto': by = 'w' if ow / oh > aspect else 'h'
    cw = ow / fill if by == 'w' else oh / fill * aspect
    ch = cw / aspect
    ox, oy = (x0 + x1) / 2, y0 + oh / 2
    left, top = ox - cw * cx, oy - ch * cy
    pad = int(max(0, -left, -top, left + cw - img.shape[1], top + ch - img.shape[0])) + 2
    big = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    if pad > 2: big = soften(big, pad)
    crop = big[int(top + pad):int(top + pad + ch), int(left + pad):int(left + pad + cw)]
    save(crop, out, width, aspect)

def soften(big, pad):
    # достроенный край размываем, чтобы не было полос от BORDER_REPLICATE
    blur = cv2.GaussianBlur(big, (0, 0), 25)
    m = np.zeros(big.shape[:2], np.float32); m[pad:-pad, pad:-pad] = 1
    m = cv2.GaussianBlur(m, (0, 0), 12)[..., None]
    return (big * m + blur * (1 - m)).astype(np.uint8)

def rect(name, out, aspect, x0, y0, x1=None, width=900):
    """кадр по координатам исходника; высота от соотношения сторон"""
    img = load(name)
    x1 = x1 or img.shape[1]
    ch = (x1 - x0) / aspect
    save(img[int(y0):int(y0 + ch), int(x0):int(x1)], out, width, aspect)

def square(name, out, cx, cy, size, width=300):
    img = load(name)
    save(img[int(cy - size / 2):int(cy + size / 2), int(cx - size / 2):int(cx + size / 2)], out, width, 1)

def save(crop, out, width, aspect):
    crop = cv2.resize(crop, (width, round(width / aspect)), interpolation=cv2.INTER_AREA)
    cv2.imwrite(f'{OUT}/{out}', crop, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print(out, crop.shape[1], crop.shape[0])

CARD = 197 / 117      # карточка каталога
BIG = 428 / 266       # галерея товара
# каталог
obj('01_runner_side', 'card_runner.jpg', CARD, 0.84, 'w', cy=0.48, width=600)
obj('06_hoodie', 'card_hoodie.jpg', CARD, 0.93, 'h', cy=0.5, width=600)
obj('07_cargo', 'card_cargo.jpg', CARD, 0.95, 'h', cy=0.5, width=600)
obj('08_cap', 'card_cap.jpg', CARD, 0.66, 'w', cy=0.5, width=600)
# галерея в карточке товара (сверху кнопки - вещь чуть ниже центра)
obj('01_runner_side', 'runner_big.jpg', BIG, 0.8, 'w', cy=0.56, width=1300)
obj('02_runner_side2', 'big_runner_2.jpg', BIG, 0.78, 'w', cy=0.56, width=1300)
obj('03_runner_back', 'big_runner_3.jpg', BIG, 0.72, 'h', cy=0.55, width=1300)
obj('04_runner_top', 'big_runner_4.jpg', BIG, 0.8, 'h', cy=0.53, width=1300)
obj('05_runner_sole', 'big_runner_5.jpg', BIG, 0.78, 'w', cy=0.55, width=1300)
obj('06_hoodie', 'big_hoodie.jpg', BIG, 0.78, 'h', cy=0.56, width=1300)
obj('07_cargo', 'big_cargo.jpg', BIG, 0.84, 'h', cy=0.55, width=1300)
obj('08_cap', 'big_cap.jpg', BIG, 0.6, 'w', cy=0.56, width=1300)
# галерея в админке (плитки 63x72)
for i, n in enumerate(['01_runner_side', '02_runner_side2', '03_runner_back', '04_runner_top', '05_runner_sole']):
    obj(n, f'gal_runner_{i + 1}.jpg', 63 / 72, 0.88, 'auto', width=200)
# корзина и заказы
obj('01_runner_side', 'thumb_runner.jpg', 84 / 78, 0.92, 'w', width=260)
obj('06_hoodie', 'thumb_hoodie.jpg', 84 / 78, 0.9, 'h', width=260)
obj('01_runner_side', 'order_runner.jpg', 78.5 / 59, 0.9, 'w', width=240)
obj('06_hoodie', 'order_hoodie.jpg', 78.5 / 56, 0.92, 'h', width=240)
obj('08_cap', 'order_cap.jpg', 73.5 / 52.5, 0.86, 'w', width=240)
# кружки категорий: Новинки = худи нового дропа, Кроссовки = Runner
obj('06_hoodie', 'cat_new.jpg', 1, 0.86, 'h', width=200)
obj('01_runner_side', 'cat_sneakers.jpg', 1, 0.92, 'w', width=200)
obj('09_black_hoodie', 'cat_hoodies.jpg', 1, 0.86, 'h', width=200)
obj('10_black_bag', 'cat_acc.jpg', 1, 0.92, 'w', width=200)
# плитки каталога в веб-админке
WEB = 149 / 73
obj('01_runner_side', 'web_runner.jpg', WEB, 0.78, 'w', width=450)
obj('06_hoodie', 'web_hoodie.jpg', WEB, 0.96, 'h', width=450)
obj('07_cargo', 'web_cargo.jpg', WEB, 1.0, 'h', width=450, shadow=0)
obj('08_cap', 'web_cap.jpg', WEB, 0.6, 'w', width=450)
# люди
rect('11_drop_banner', 'banner_drop14.jpg', 404 / 146, 0, 0, width=1212)
rect('12_drop_collection', 'web_collection.jpg', 199 / 114, 330, 20, 1200, width=600)
square('13_avatar_artem', 'avatar_artem.jpg', 470, 560, 720)
square('14_avatar_nikita', 'avatar_nikita.jpg', 470, 450, 680)
