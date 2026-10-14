# Вырезает фото товаров из макетов GPT (ref/*.png) в assets/img/.
# Значки/сердечки/текст поверх фото затираются inpaint'ом - в вёрстке они живые.
# Это временные картинки; чистые фото - по ТЗ_фото_для_GPT.md
import cv2, numpy as np, os
os.makedirs('assets/img', exist_ok=True)
def load(n): return cv2.imread(f'ref/{n}.png')
R={n:load(n) for n in ['shop','admin','web']}
def cut(src, box, out, holes=(), scale=1):
    x0,y0,x1,y1=box
    im=R[src][y0:y1,x0:x1].copy()
    if holes:
        m=np.zeros(im.shape[:2],np.uint8)
        for hx0,hy0,hx1,hy1 in holes: m[hy0-y0:hy1-y0, hx0-x0:hx1-x0]=255
        im=cv2.inpaint(im,m,7,cv2.INPAINT_TELEA)
    if scale!=1: im=cv2.resize(im,None,fx=scale,fy=scale,interpolation=cv2.INTER_LANCZOS4)
    cv2.imwrite(f'assets/img/{out}', im, [cv2.IMWRITE_JPEG_QUALITY, 92] if out.endswith('jpg') else [])
    print(out, im.shape[1], im.shape[0])
# каталог (карточки)
cut('shop',(83,565,279,682),'card_hoodie.jpg',[(244,570,271,597)],2)
cut('shop',(289,565,487,682),'card_runner.jpg',[(452,570,479,597),(422,653,487,682)],2)
cut('shop',(83,739,279,855),'card_cargo.jpg',[(244,744,271,771)],2)
cut('shop',(289,739,487,855),'card_cap.jpg',[(452,744,479,771),(394,826,487,855)],2)
# карточка товара, большое фото
cut('shop',(544,173,992,439),'runner_big.jpg',[(554,183,598,227),(808,183,856,227),(858,183,984,226),(712,410,808,432),(942,410,980,434)],2)
# корзина
cut('shop',(1055,232,1139,310),'thumb_runner.jpg',scale=2)
cut('shop',(1055,323,1139,402),'thumb_hoodie.jpg',scale=2)
# кружки категорий
for i,(cx,name) in enumerate([(118,'cat_new'),(202,'cat_sneakers'),(284,'cat_hoodies'),(367,'cat_acc')]):
    cut("shop",(cx-24,309-24,cx+24,309+24),name+'.jpg',scale=2)
cut('shop',(446,179,486,219),'avatar_artem.jpg',scale=2)
# баннер дропа: текст и таймер затираем
cut('shop',(83,367,487,513),'banner_drop14.jpg',[(94,438,378,479),(94,476,276,507)],2)
# админка: галерея товара, превью в заказах
for i,(x0,x1) in enumerate([(1052,1117),(1123,1187),(1190,1255),(1258,1323),(1327,1391)]):
    cut("admin",(x0+3,233,x1-3,300),f'gal_runner_{i+1}.jpg',[(1055,282,1114,300)] if i==0 else (),2)
cut('admin',(571,396,650,455),'order_runner.jpg',scale=2)
cut('admin',(571,461,650,517),'order_hoodie.jpg',scale=2)
cut('admin',(572,770,645,818),'order_cap.jpg',scale=2)
# веб-админка
cut('web',(1106,533,1255,606),'web_runner.jpg',scale=2)
cut('web',(1259,533,1411,606),'web_hoodie.jpg',scale=2)
cut('web',(1106,611,1255,683),'web_cargo.jpg',scale=2)
cut('web',(1259,610,1411,682),'web_cap.jpg',scale=2)
cut('web',(227,763,426,877),'web_collection.jpg',scale=2)
cut('web',(16,836,62,878),'avatar_nikita.jpg',scale=2)
