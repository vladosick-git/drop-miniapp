// node tools/record.js -> kwork/ДРОП - видео-демо.mp4 (1920x1080, до 75 сек)
// Сценарий: каталог -> товар -> корзина -> промокод -> оплата -> заказ в админке -> правка цены -> веб-админка
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FFMPEG = process.env.FFMPEG || 'C:/Users/1/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg.exe';
const ROOT = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  page.on('dialog', (d) => d.accept());
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('file:///' + path.join(__dirname, 'video.html').replace(/\\/g, '/'), { waitUntil: 'load', timeout: 60000 });
  const app = page.frames().find((f) => f.url().includes('index.html'));
  await app.evaluate(() => document.fonts.ready);
  // начинаем с пустой корзиной без промокода
  await app.evaluate(() => { Store.set((s) => { s.cart.items = []; s.cart.promo = ''; }); location.hash = '#/'; });
  await sleep(600);

  const tap = async (sel, pause = 700) => {
    const el = await app.waitForSelector(sel, { visible: true });
    await el.evaluate((e) => e.scrollIntoView({ block: 'nearest', behavior: 'instant' }));
    const b = await el.boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.evaluate((x, y) => tapAt(x, y), x, y);
    await sleep(180);
    await page.mouse.click(x, y);
    await sleep(pause);
  };
  const scroll = async (top, pause = 900) => { await app.evaluate((t) => document.getElementById('screen').scrollTo({ top: t, behavior: 'smooth' }), top); await sleep(pause); };
  const step = async (i, t, d) => { await page.evaluate((i, t, d) => setStep(i, t, d), i, t, d); };

  const outWebm = path.join(ROOT, 'tmp', 'demo.webm');
  const rec = await page.screencast({ path: outWebm, ffmpegPath: FFMPEG });
  const t0 = Date.now();

  await step(0, 'Магазин прямо в Telegram', 'Каталог, коллекция дропа с таймером, категории и избранное');
  await sleep(2200);
  await scroll(430, 1300); await scroll(0, 1000);

  await step(1, 'Карточка товара', 'Галерея, цвет, размер. Распроданный размер недоступен');
  await tap('.pcard[href="#/product/runner"]', 900);
  await app.evaluate(() => { const g = document.getElementById('gal'); g.scrollTo({ left: g.clientWidth, behavior: 'smooth' }); }); await sleep(800);
  await app.evaluate(() => { const g = document.getElementById('gal'); g.scrollTo({ left: g.clientWidth * 2, behavior: 'smooth' }); }); await sleep(800);
  await app.evaluate(() => { const g = document.getElementById('gal'); g.scrollTo({ left: 0, behavior: 'smooth' }); }); await sleep(700);
  await tap('[data-act=color][data-id="чёрный"]', 500); await tap('[data-act=color][data-id="белый"]', 500);
  await tap('[data-act=size][data-id="44"]', 450); await tap('[data-act=size][data-id="42"]', 500);
  await tap('#mainbtn', 1100);
  await tap('.rbtn--back', 700);
  await tap('.pcard[href="#/product/hoodie"]', 800);
  await tap('#mainbtn', 1000);
  await tap('#mainbtn', 900);

  await step(2, 'Корзина считает всё сама', 'Количество, промокод, доставка и баллы. Итог и кнопка оплаты обновляются сразу');
  await sleep(900);
  await tap('[data-act=qty][data-id="1"][data-d="1"]', 900);
  await tap('[data-act=qty][data-id="1"][data-d="-1"]', 800);
  await tap('#promo', 300);
  for (const ch of 'DROP14') { await page.keyboard.type(ch); await sleep(140); }
  await sleep(1100);
  await tap('[data-act=dlv][data-id=cdek]', 1000);
  await tap('[data-act=dlv][data-id=courier]', 700);
  await scroll(400, 900);
  await tap('[data-act=pay][data-id=tgpay]', 600);
  await tap('[data-act=pay][data-id=sbp]', 900);

  await step(3, 'Оплата в один тап', 'В Telegram это нативная кнопка MainButton. СБП, карта или Telegram Pay');
  await sleep(600);
  await tap('#mainbtn', 2200);

  await step(4, 'Продавец сразу видит заказ', 'Мобильная админка в том же Mini App: статусы, клиент, оплата, промокод');
  await tap('a[href="#/admin/orders"]', 2000);
  await tap('[data-act=accept]', 1600);
  await tap('.tabbar a[href="#/admin"]', 2000);

  await step(5, 'Правка товара с телефона', 'Цена со скидкой, остатки по размерам, бейджи. Скидка считается сама');
  await tap('.tabbar a[href="#/admin/products"]', 700);
  await tap('.list a[href="#/admin/product/runner"]', 900);
  const price = await app.$('#e-price');
  await tap('#e-price', 200);
  await price.click({ clickCount: 3 });
  for (const ch of '11990') { await page.keyboard.type(ch); await sleep(110); }
  await page.keyboard.press('Tab'); await sleep(900);
  await scroll(500, 900);
  await tap('[data-act=save]', 1300);
  await scroll(0, 500);
  await tap('a.lnk', 1800);

  await step(6, 'И веб-админка', 'Дашборд для компьютера на тех же данных');
  await sleep(1200);
  await page.evaluate(() => showWeb());
  await sleep(5200);
  await page.evaluate(() => showEnd());
  await sleep(3000);

  await rec.stop();
  console.log('recorded', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await browser.close();

  const out = path.join(ROOT, 'kwork', 'ДРОП - видео-демо.mp4');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', outWebm, '-vf', 'fps=30,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', '-an', out]);
  console.log('saved', path.relative(ROOT, out), (fs.statSync(out).size / 1048576).toFixed(1), 'MB');
})();
