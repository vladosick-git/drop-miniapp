// node tools/shot.js <mode>
//   compare - рендер showcase с ширинами телефонов как в макетах (tmp/cmp_*.png, 1536x1024 и 1440x900)
//   kwork   - скрины для Кворка 1920x1280 (screens/01..03 + отдельные экраны)
//   mobile  - отдельные экраны телефона 428x971 @3x (screens/mobile/)
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const ROOT = path.resolve(__dirname, '..');
const url = (f, q) => 'file:///' + path.join(ROOT, f).replace(/\\/g, '/') + q;
const mode = process.argv[2] || 'compare';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--hide-scrollbars', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  const open = async (u, w, h, dsf) => {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: dsf });
    await page.goto(u, { waitUntil: 'load', timeout: 60000 });
    // ждём шрифты и картинки во всех iframe
    for (const f of page.frames()) {
      await f.evaluate(() => document.fonts.ready).catch(() => {});
      await f.evaluate(() => Promise.all([...document.images].map((i) => i.complete || new Promise((r) => (i.onload = i.onerror = r))))).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 400));
  };
  const save = async (file, w, h) => { fs.mkdirSync(path.dirname(file), { recursive: true }); await page.screenshot({ path: file, clip: { x: 0, y: 0, width: w, height: h } }); console.log('saved', path.relative(ROOT, file)); };

  if (mode === 'compare') {
    for (const set of ['shop', 'admin']) { await open(url('showcase.html', `?set=${set}&shot=1&ref=1`), 1536, 1024, 1); await save(path.join(ROOT, 'tmp', `cmp_${set}.png`), 1536, 1024); }
    await open(url('showcase.html', '?set=web&shot=1&ref=1'), 1440, 900, 1); await save(path.join(ROOT, 'tmp', 'cmp_web.png'), 1440, 900);
  }
  if (mode === 'kwork') {
    // холст 1536x1024 css @1.25 = 1920x1280
    const out = path.join(ROOT, 'screens');
    const names = { shop: '01 - Магазин ДРОП', admin: '02 - Мобильная админка', web: '03 - Веб-админка', flow: '05 - Сценарий покупки' };
    for (const set of ['shop', 'admin', 'web', 'flow']) { await open(url('showcase.html', `?set=${set}&shot=1`), 1536, 1024, 1.25); await save(path.join(out, names[set] + '.png'), 1536, 1024); }
    // веб-админка без рамки браузера: 1440x960 css @4/3 = 1920x1280
    await open(url('admin.html', '?shot=1'), 1440, 960, 4 / 3); await save(path.join(out, '04 - Веб-админка крупно.png'), 1440, 960);
  }
  if (mode === 'mobile') {
    const out = path.join(ROOT, 'screens', 'mobile');
    const list = [['01_catalog', '#/'], ['02_product', '#/product/runner'], ['03_cart', '#/cart'], ['04_admin_summary', '#/admin'], ['05_admin_orders', '#/admin/orders'], ['06_admin_product', '#/admin/product/runner']];
    for (const [n, h] of list) { await open(url('index.html', '?frame=1&shot=1' + h), 428, 971, 3); await save(path.join(out, n + '.png'), 428, 971); }
  }
  await browser.close();
})();
