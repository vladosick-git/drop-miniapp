// ДРОП Mini App: роутер, экраны магазина и мобильной админки, интеграция с Telegram.
(function () {
  const D = window.DROP_DATA, S = window.Store, rub = S.rub;
  const $ = (s, r = document) => r.querySelector(s);
  const screen = $('#screen'), sheet = $('#sheet'), tabbar = $('#tabbar');
  const html = document.documentElement;
  const P = S.params;

  // ---------- Telegram ----------
  const tg = window.Telegram && window.Telegram.WebApp;
  const inTG = !!(tg && tg.initData);
  if (inTG) {
    html.classList.add('tg');
    tg.ready(); tg.expand();
    try { tg.disableVerticalSwipes && tg.disableVerticalSwipes(); } catch (e) {}
    const applyTheme = () => {
      const t = tg.themeParams || {}, r = html.style;
      const map = { bg_color: '--bg', text_color: '--text', hint_color: '--hint', link_color: '--link', button_color: '--accent', button_text_color: '--accent-text', secondary_bg_color: '--field' };
      for (const k in map) if (t[k]) r.setProperty(map[k], t[k]);
      if (tg.colorScheme === 'dark') { r.setProperty('--surface', t.section_bg_color || '#1c1c1d'); r.setProperty('--line', 'rgba(255,255,255,.1)'); html.classList.add('dark'); }
      else html.classList.remove('dark');
      try { tg.setHeaderColor(t.bg_color || '#f7f7f7'); tg.setBackgroundColor(t.bg_color || '#f7f7f7'); } catch (e) {}
    };
    applyTheme(); tg.onEvent('themeChanged', applyTheme);
    tg.MainButton.onClick(() => mainAction && mainAction());
    tg.BackButton.onClick(() => history.length > 1 ? history.back() : go('#/'));
    // ?startapp=admin открывает админку
    const sp = tg.initDataUnsafe && tg.initDataUnsafe.start_param;
    if (sp === 'admin' && !location.hash.startsWith('#/')) location.hash = '#/admin';
    const u = tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (u && u.first_name) D.user.name = u.first_name;
  }
  const haptic = (t = 'light') => { try { inTG && tg.HapticFeedback.impactOccurred(t); } catch (e) {} };

  // ---------- режим iframe / скриншота / масштаб на десктопе ----------
  if (P.has('frame') || P.has('shot')) html.classList.add('framed');
  const device = $('#device');
  function fit() {
    if (inTG || html.classList.contains('framed') || innerWidth <= 560) { device.style.transform = ''; return; }
    const k = Math.min(1, (innerHeight - 32) / 971);
    device.style.transform = k < 1 ? `scale(${k})` : '';
    device.style.margin = k < 1 ? `${-(971 * (1 - k)) / 2}px ${-(428 * (1 - k)) / 2}px` : '';
  }
  addEventListener('resize', fit); fit();
  $('.status__icons').innerHTML = I.signal + I.wifi + I.battery;
  $('.chat__back').innerHTML = I.back;
  $('.chat__more').innerHTML = I.dots;
  document.querySelectorAll('.logo-c').forEach((e) => (e.innerHTML = I.logo));
  $('.sheet__more').innerHTML = I.dots;

  // ---------- утилиты ----------
  const go = (h) => { location.hash = h; };
  let toastT;
  function toast(t) {
    const el = $('#toast'); el.textContent = t; el.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1800);
  }
  const fmtTime = (sec) => [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60].map((n) => String(n).padStart(2, '0')).join(':');
  const dropLeft = () => (S.SHOT ? D.drop.left : Math.max(0, Math.round((S.s.dropEnd - Date.now()) / 1000)));
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- состояние UI ----------
  const ui = { chip: 'Все', cat: null, q: '', sel: {}, ptab: 'desc', slide: 0, period: 'all', ofilter: 'new', oq: '', edit: null, stockEdit: false, promoInput: null };
  let mainAction = null;

  // ---------- таббары ----------
  function shopTabs(active) {
    const n = S.totals().count;
    const t = [['#/', 'Главная', I.homeF, I.home, 'home'], ['#/search', 'Каталог', I.search, I.search, 'search'], ['#/fav', 'Избранное', I.heartF, I.heart, 'fav'], ['#/cart', 'Корзина', I.cartF, I.cart, 'cart'], ['#/profile', 'Профиль', I.user, I.user, 'profile']];
    return t.map(([h, l, on, off, k]) => `<a href="${h}" class="${k === active ? 'on' : ''}">${k === active ? on : off}${l}${k === 'cart' && n ? `<span class="badge">${n}</span>` : ''}</a>`).join('');
  }
  function adminTabs(active) {
    const n = S.s.orders.filter((o) => o.status === 'new').length;
    const t = [['#/admin', 'Сводка', I.homeF, I.home, 'sum'], ['#/admin/orders', 'Заказы', I.ordersF, I.orders, 'orders'], ['#/admin/products', 'Товары', I.boxF, I.box, 'products'], ['#/admin/clients', 'Клиенты', I.users, I.users, 'clients'], ['#/admin/more', 'Ещё', I.dots, I.dots, 'more']];
    return t.map(([h, l, on, off, k]) => `<a href="${h}" class="${k === active ? 'on' : ''}">${k === active ? on : off}${l}${k === 'orders' && n ? `<span class="badge">${n}</span>` : ''}</a>`).join('');
  }

  // ---------- экраны магазина ----------
  function vCatalog() {
    const favs = S.s.fav;
    let list = S.products();
    if (ui.chip !== 'Все') list = list.filter((p) => p.cat === ui.chip);
    if (ui.cat === 'sale') list = list.filter((p) => p.old);
    if (ui.cat === 'new') list = list.filter((p) => p.badgeNew !== false);
    if (ui.q) list = list.filter((p) => p.name.toLowerCase().includes(ui.q.toLowerCase()));
    return `
    <div class="greet"><h1>Привет, ${esc(D.user.name)} <span class="emoji">👋</span></h1><span class="pill pts num">${S.s.points.toLocaleString('ru-RU').replace(/ /g, ' ')} баллов</span><img class="ava" src="${D.user.avatar}" alt=""></div>
    <label class="search">${I.search}<input id="q" type="search" placeholder="Найти кроссовки, худи..." value="${esc(ui.q)}" autocomplete="off"></label>
    <div class="cats">${D.categories.map((c) => `<button class="cat ${c.id === 'sale' ? 'sale' : ''} ${ui.cat === c.id ? 'on' : ''}" data-act="cat" data-id="${c.id}"><span class="cat__img">${c.img ? `<img src="${c.img}" alt="">` : '<b>SALE</b>'}</span>${c.name}</button>`).join('')}</div>
    <a class="banner" href="#/drop"><img src="assets/img/banner_drop14.jpg" alt=""><span class="banner__title">${D.drop.title}</span><span class="pill banner__timer">до конца дропа <b class="num" id="timer">${fmtTime(dropLeft())}</b></span></a>
    <div class="chips">${D.chips.map((c) => `<button class="chip ${ui.chip === c ? 'on' : ''}" data-act="chip" data-id="${c}">${c}</button>`).join('')}</div>
    <div class="grid">${list.map((p) => pcard(p, favs)).join('') || '<div class="empty" style="grid-column:1/-1">Ничего не нашлось</div>'}</div>`;
  }
  function pcard(p, favs) {
    const badge = p.old ? `<span class="pill pcard__badge">−${Math.round((1 - p.price / p.old) * 100)}%</span>` : p.left ? `<span class="pill pcard__badge orange">Осталось ${p.left}</span>` : '';
    return `<a class="pcard" href="#/product/${p.id}"><div class="pcard__img"><img src="${p.img}" alt="">${badge}<button class="pcard__fav ${favs.includes(p.id) ? 'on' : ''}" data-act="fav" data-id="${p.id}">${favs.includes(p.id) ? I.heartF : I.heart}</button></div>
      <div class="pcard__body"><div class="pcard__name">${esc(p.name)}</div><div class="pcard__price"><span class="price">${rub(p.price)}</span>${p.old ? `<span class="old">${rub(p.old)}</span>` : ''}</div></div></a>`;
  }

  function vProduct(id) {
    const p = S.product(id); if (!p) return vCatalog();
    const sel = ui.sel[id] || (ui.sel[id] = { size: p.defSize, color: p.colors[0].name });
    const fav = S.s.fav.includes(id);
    const disc = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
    const imgs = p.gallery;
    const tabTxt = { desc: p.desc, comp: p.comp, rev: p.reviews ? `Средняя оценка ${p.rating} по ${p.reviews} ${plural(p.reviews, 'отзыву', 'отзывам', 'отзывам')}.` : 'Отзывов пока нет. Будьте первым!' };
    return `
    <div class="gal"><div class="gal__track" id="gal">${imgs.map((src, i) => `<img src="${src}" alt="">`).join('')}</div>
      <button class="rbtn rbtn--back" data-act="back">${I.back}</button>
      <button class="rbtn rbtn--fav ${fav ? 'on' : ''}" data-act="fav" data-id="${id}">${fav ? I.heartF : I.heart}</button>
      <button class="rbtn rbtn--share" data-act="share" data-id="${id}">${I.share}поделиться</button>
      <div class="dots">${imgs.map((_, i) => `<i class="${i === ui.slide ? 'on' : ''}"></i>`).join('')}</div><span class="gal__count" id="galc">${ui.slide + 1}/${imgs.length}</span></div>
    <div class="info">
      <h1>${esc(p.name)}</h1>
      ${p.rating ? `<div class="rating">${I.star}<b>${String(p.rating).replace('.', '.')}</b>· ${p.reviews} ${plural(p.reviews, 'отзыв', 'отзыва', 'отзывов')}</div>` : '<div class="rating">Новинка дропа</div>'}
      <div class="prow"><span class="price">${rub(p.price)}</span>${p.old ? `<span class="old">${rub(p.old)}</span><span class="pill">−${disc}%</span>` : ''}</div>
      <div class="split">или частями 4 × ${rub(Math.ceil(p.price / 4))}</div>
      <div class="lbl" style="margin-top:7px">Цвет</div>
      <div class="colors">${p.colors.map((c) => `<button class="sw ${c.hex === '#ffffff' ? 'sw--light' : ''} ${sel.color === c.name ? 'on' : ''}" style="background:${c.hex}" data-act="color" data-id="${c.name}" title="${c.name}"></button>`).join('')}</div>
      <div class="lbl" style="margin-top:12px">${p.sizeLabel}<a href="#" data-act="sizes">Таблица размеров</a></div>
      <div class="sizes" style="${Object.keys(p.sizes).length < 6 ? `grid-template-columns:repeat(${Math.max(4, Object.keys(p.sizes).length)},1fr)` : ''}">${Object.entries(p.sizes).map(([s, n]) => `<button class="size ${n ? '' : 'off'} ${sel.size === s && n ? 'on' : ''}" data-act="size" data-id="${s}" ${n ? '' : 'disabled'}>${s}</button>`).join('')}</div>
      <div style="margin-top:13px"><div class="feat">${I.truck}Доставим завтра, бесплатно</div><div class="feat">${I.ret}Возврат в течение 14 дней</div></div>
      <div class="ptabs">${[['desc', 'Описание'], ['comp', 'Состав'], ['rev', 'Отзывы']].map(([k, l]) => `<button class="${ui.ptab === k ? 'on' : ''}" data-act="ptab" data-id="${k}">${l}</button>`).join('')}</div>
      <p class="ptext">${tabTxt[ui.ptab]}</p>
    </div>`;
  }

  function vCart() {
    const c = S.s.cart, t = S.totals();
    if (!c.items.length) return `<div class="cart-head"><span class="h1">Корзина</span></div><div class="empty">${I.cart}Корзина пуста.<br>Загляните в новый дроп.<br><br><a class="btn" style="display:inline-grid;place-items:center;text-decoration:none" href="#/">В каталог</a></div>`;
    const promoVal = ui.promoInput !== null ? ui.promoInput : c.promo;
    const promoState = t.pct ? `<div class="promo__ok">−${t.pct}% применён</div>` : promoVal ? `<button class="promo__ok idle" data-act="promo-apply">Применить</button>` : `<button class="promo__ok idle" data-act="promo-apply">Применить</button>`;
    return `
    <div class="cart-head"><span class="h1">Корзина</span><span>${t.count} ${plural(t.count, 'товар', 'товара', 'товаров')}</span></div>
    ${c.items.map((it, i) => { const p = S.product(it.pid); return `
      <div class="citem"><img class="citem__img" src="${p.thumb || p.img}" alt="">
        <div class="citem__body"><div class="citem__name">${esc(p.name)}</div><div class="citem__var">${p.sizeLabel === 'Размер EU' ? 'EU ' : ''}${it.size}${it.color && p.colors.length > 1 ? ' · ' + it.color : ''}</div><div class="citem__price">${rub(p.price * it.qty)}</div></div>
        <button class="citem__del" data-act="del" data-id="${i}">${I.trash}</button>
        <div class="step"><button data-act="qty" data-id="${i}" data-d="-1">${I.minus}</button><span class="num">${it.qty}</span><button data-act="qty" data-id="${i}" data-d="1">${I.plus}</button></div></div>`; }).join('')}
    <div class="promo"><label class="promo__in"><input id="promo" value="${esc(promoVal)}" placeholder="Промокод" autocomplete="off">${promoVal ? `<button data-act="promo-clear">${I.x}</button>` : ''}</label>${ui.promoBad ? '<div class="promo__ok bad">Не найден</div>' : promoState}</div>
    <div class="sec" style="margin-top:13px">Доставка</div>
    <div class="dlv" style="margin-top:5px">${D.delivery.map((d) => `<label data-act="dlv" data-id="${d.id}"><span class="radio ${c.delivery === d.id ? 'on' : ''}"></span><span>${d.name} · ${d.price ? rub(d.price) : d.note ? d.note : '<b>бесплатно</b>'}</span></label>`).join('')}</div>
    <div class="addr">${I.pin}<span>${D.address}</span>${I.chevR}</div>
    <div class="sec" style="margin-top:13.5px">Оплата</div>
    <div class="pays">${D.payments.map((p) => `<button class="pay ${p.id === 'sbp' ? 'sbp' : ''} ${p.id === 'tgpay' ? 'pay--tg' : ''} ${c.pay === p.id ? 'on' : ''}" data-act="pay" data-id="${p.id}">${p.id === 'sbp' ? I.sbp : p.id === 'card' ? I.card : I.plane}${p.name}</button>`).join('')}</div>
    <div class="sum">
      <div><span>Товары</span><span class="num">${rub(t.goods)}</span></div>
      <div class="g"><span>Скидка по промокоду</span><span class="num">${t.promo ? rub(-t.promo) : '0 ₽'}</span></div>
      <div class="g"><span>Баллы</span><span class="num">${t.points ? rub(-t.points) : '0 ₽'}</span></div>
      <div><span>Доставка</span><span class="num">${rub(t.delivery)}</span></div>
    </div>
    <div class="total"><span>Итого</span><b class="num">${rub(t.total)}</b></div>`;
  }

  function vDone(id) {
    const o = S.s.orders.find((x) => String(x.id) === String(id));
    return `<div class="okscreen"><div class="big">${I.check}</div><h2>Заказ #${id} оплачен</h2><p>${o ? rub(o.total) + ' · ' + o.pay + '<br>' : ''}Мы пришлём статус доставки в чат с ботом.<br>Заказ уже появился в админке магазина.</p>
      <a class="btn" style="display:grid;place-items:center;text-decoration:none" href="#/admin/orders">Открыть в админке</a><a class="btn btn--gray" style="display:grid;place-items:center;text-decoration:none;margin-top:10px" href="#/">Вернуться в каталог</a></div>`;
  }
  function vFav() {
    const list = S.products().filter((p) => S.s.fav.includes(p.id));
    return `<div class="cart-head"><span class="h1">Избранное</span></div>${list.length ? `<div class="grid" style="margin-top:14px">${list.map((p) => pcard(p, S.s.fav)).join('')}</div>` : `<div class="empty">${I.heart}Нажмите на сердечко у товара,<br>чтобы сохранить его здесь</div>`}`;
  }
  function vSearch() {
    ui.chip = ui.chip || 'Все';
    return `<div class="cart-head" style="border:0"><span class="h1">Каталог</span></div><label class="search">${I.search}<input id="q" type="search" placeholder="Найти кроссовки, худи..." value="${esc(ui.q)}" autocomplete="off"></label>
      <div class="chips">${D.chips.map((c) => `<button class="chip ${ui.chip === c ? 'on' : ''}" data-act="chip" data-id="${c}">${c}</button>`).join('')}</div>
      <div class="grid">${S.products().filter((p) => (ui.chip === 'Все' || p.cat === ui.chip) && (!ui.q || p.name.toLowerCase().includes(ui.q.toLowerCase()))).map((p) => pcard(p, S.s.fav)).join('')}</div>`;
  }
  function vProfile() {
    const mine = S.s.orders.filter((o) => o.demo || o.id === 1002);
    return `<div class="cart-head"><span class="h1">Профиль</span></div>
      <div class="greet" style="margin-top:6px"><img class="ava" src="${D.user.avatar}" alt="" style="margin:0 12px 0 0;width:48px;height:48px"><h1 style="font-size:20px">${esc(D.user.name)} К.</h1><span class="pill pts">${S.s.points.toLocaleString('ru-RU').replace(/ /g, ' ')} баллов</span></div>
      <div class="sec" style="margin-top:14px">Мои заказы</div>
      <div class="list">${mine.map((o) => `<div class="row"><b>#${o.id}</b><span style="flex:1">${o.items.map((i) => S.product(i.pid).name).join(', ')}<small>${o.date} · ${rub(o.total)}</small></span></div>`).join('')}</div>
      <div class="list"><a href="#/admin">Админ-панель магазина <small>демо для владельца</small>${I.chevR}</a><a href="admin.html" target="_blank">Веб-админка${I.chevR}</a></div>`;
  }

  // ---------- мобильная админка ----------
  function vAdminSum() {
    const real = S.s.orders.filter((o) => o.status !== 'test');
    const revenue = real.reduce((s, o) => s + o.total, 0);
    const tests = S.s.orders.length - real.length;
    const first = S.s.orders.find((o) => o.first);
    const done = D.checklist.filter((c) => c[2]).length;
    return `
    <div class="ahead"><span class="h1">Сводка</span><span class="pill open-pill"><i></i>Магазин открыт</span></div>
    <div class="launch"><span class="emoji">🚀</span>Запуск ${D.launch.date} · ${D.launch.day}-й день работы</div>
    <div class="seg">${[['today', 'Сегодня'], ['week', 'Неделя'], ['all', 'Всё время']].map(([k, l]) => `<button class="${ui.period === k ? 'on' : ''}" data-act="period" data-id="${k}">${l}</button>`).join('')}</div>
    <div class="stats">
      <div class="stat"><div class="stat__l">Выручка</div><div class="stat__v num">${rub(revenue)}</div><div class="stat__s">без тестовых заказов</div></div>
      <div class="stat"><div class="stat__l">Заказы</div><div class="stat__v num">${real.length}</div><div class="stat__s">+${tests} ${plural(tests, 'тестовый', 'тестовых', 'тестовых')}</div></div>
      <div class="stat sm"><div class="stat__l">Открытий Mini App</div><div class="stat__v num">${D.stats.opens}</div></div>
      <div class="stat sm"><div class="stat__l">Подписчики бота</div><div class="stat__v num">${D.stats.subscribers}</div></div>
    </div>
    ${first ? `<div class="first"><span class="emoji">🎉</span><h3>Первый заказ!</h3><p>${first.client} · ${rub(first.total)} · 15 октября, ${first.time}</p><a href="#/admin/orders">Открыть заказ${I.chevR}</a></div>` : ''}
    <div class="check"><h3>Запуск магазина · <span>${done} из ${D.checklist.length}</span></h3><div class="bar"><i style="width:${(done / D.checklist.length) * 100}%"></i></div>
      <ul>${D.checklist.map((c, i) => `<li>${c[2] ? `<span class="ok">${I.check}</span>` : '<span class="no"></span>'}${c[0]}${i === done ? `<a class="linkr" href="#" data-act="mailing">Начать${I.chevR}</a>` : ''}</li>`).join('')}</ul></div>`;
  }

  const ST = { new: ['Новый', ''], work: ['Сборка', 'work'], ship: ['В доставке', 'work'], done: ['Выполнен', 'test'], test: ['Тест', 'test'] };
  function vAdminOrders() {
    const all = S.s.orders;
    const cnt = (k) => all.filter((o) => o.status === k).length;
    const f = [['all', 'Все', all.length], ['new', 'Новые', cnt('new')], ['work', 'Сборка', cnt('work')], ['ship', 'В доставке', cnt('ship')], ['done', 'Выполнены', cnt('done')], ['test', 'Тест', cnt('test')]];
    const q = ui.oq.trim().toLowerCase();
    // «Новые» в макете выбраны, но тестовый заказ всё равно показан ниже серой карточкой
    let list = all.filter((o) => ui.ofilter === 'all' || o.status === ui.ofilter || (ui.ofilter === 'new' && o.status === 'test'));
    if (q) list = all.filter((o) => (`#${o.id} ${o.client}`).toLowerCase().includes(q));
    return `
    <div class="ahead"><span class="h1">Заказы</span><span class="hint" style="font-size:16px;margin-top:6px">всего ${all.length}</span></div>
    <label class="osearch">${I.search}<input id="oq" type="search" placeholder="Номер, имя или телефон" value="${esc(ui.oq)}" autocomplete="off"></label>
    <div class="ochips">${f.map(([k, l, n], i) => `<button style="width:calc((100% - 17px) * ${[76, 95.5, 102, 127.5, 127, 80.5][i] / 401})" class="chip ${ui.ofilter === k ? 'on' : ''}" data-act="ofilter" data-id="${k}">${l}<i>${n}</i></button>`).join('')}</div>
    ${list.map((o) => o.status === 'test' ? `
      <div class="ocard ocard--sm"><div class="ohead"><b>#${o.id} · ${o.client}</b><span class="pill st test">Тест</span><time>${o.time}</time></div>
        ${o.items.map((i) => { const p = S.product(i.pid); return `<div class="oit"><img src="${p.thumb || p.img}" alt=""><div>${p.name}<small>${o.payNote}</small></div></div>`; }).join('')}</div>` : `
      <div class="ocard ${o.status === 'new' ? 'hl' : ''}"><div class="ohead"><b>#${o.id} · ${o.client}</b><span class="pill st ${ST[o.status][1]}">${ST[o.status][0]}</span><time>${o.time}</time></div>
        ${o.items.map((i) => { const p = S.product(i.pid); return `<div class="oit"><img src="${p.id === 'runner' ? 'assets/img/order_runner.jpg' : p.id === 'hoodie' ? 'assets/img/order_hoodie.jpg' : p.thumb || p.img}" alt="">${p.name}${i.size ? ` · <span>${[i.size, i.color].filter(Boolean).join(' · ')}</span>` : ''}${i.qty > 1 ? ` <span>× ${i.qty}</span>` : ''}</div>`; }).join('')}
        <div class="olines"><div>${I.truck}${o.delivery}</div><div>${I.pin}${o.address}</div><div>${I.card}${o.pay} · <span class="paid">${o.paid}${I.check}</span></div>${o.promo ? `<div class="muted">${I.tag}Промокод ${o.promo}</div>` : ''}</div>
        <div class="ototal num">${rub(o.total)}</div>
        <div class="obtns">${o.status === 'new' ? `<button class="b1" data-act="accept" data-id="${o.id}">Принять в сборку</button>` : o.status === 'work' ? `<button class="b1" data-act="ship" data-id="${o.id}">Передать в доставку</button>` : o.status === 'ship' ? `<button class="b1" data-act="finish" data-id="${o.id}">Отметить выполненным</button>` : '<button class="b1" disabled style="opacity:.5">Выполнен</button>'}<button class="b2" data-act="write" data-id="${o.id}">Написать клиенту</button></div></div>`).join('')}
    <div class="oempty">${I.box}Новые заказы появятся здесь.<br>Уведомление о каждом заказе придёт в бот.</div>`;
  }

  function vAdminProduct(id) {
    const p = S.product(id); if (!p) return vAdminProducts();
    const e = ui.edit && ui.edit.id === id ? ui.edit : (ui.edit = { id, name: p.name, cat: p.cat, old: p.old || p.price, price: p.price, sizes: Object.assign({}, p.sizes), coll: p.inCollection !== false, isNew: p.badgeNew !== false, notify: p.notify !== false });
    const disc = e.old > e.price ? Math.round((1 - e.price / e.old) * 100) : 0;
    const gal = p.adminGallery || p.gallery;
    return `<div class="pedit">
      <div class="ahead"><a href="#/admin/products">${I.back}<span class="h1">Товар</span></a><a class="lnk" href="#/product/${id}">Как видит покупатель</a></div>
      <div class="pgal">${gal.slice(0, 5).map((src, i) => `<div class="${i ? '' : 'cover'}"><img src="${src}" alt="">${i ? '' : '<span>Обложка</span>'}</div>`).join('')}<div class="add" data-act="addphoto">${I.plus}</div></div>
      <div class="fl" style="height:38px">Название</div><label class="fi"><input id="e-name" value="${esc(e.name)}"></label>
      <div class="fl">Категория</div><label class="fi"><select id="e-cat">${['Кроссовки', 'Худи', 'Штаны', 'Кепки'].map((c) => `<option ${c === e.cat ? 'selected' : ''}>${c}</option>`).join('')}</select>${I.chevD}</label>
      <div class="fi2"><div><div class="fl">Цена</div><label class="fi fi--price"><input id="e-old" inputmode="numeric" value="${rub(e.old)}"></label></div>
        <div><div class="fl">Цена со скидкой</div><label class="fi fi--price"><input id="e-price" inputmode="numeric" value="${rub(e.price)}">${disc ? `<span class="pill" id="e-disc">−${disc}%</span>` : ''}</label></div></div>
      <div class="pnote">Продано: ${p.sold || 0} шт  ·  в корзинах сейчас: ${S.s.cart.items.filter((i) => i.pid === id).reduce((s, i) => s + i.qty, 0)}</div>
      <div class="slbl">Остатки по размерам<button data-act="stockedit">${ui.stockEdit ? 'Готово' : 'Изменить'}</button></div>
      <div class="stock">${Object.entries(e.sizes).map(([s, n]) => `<div class="${n ? '' : 'zero'}"><span>${s}</span>${ui.stockEdit ? `<input data-size="${s}" class="e-stock" inputmode="numeric" value="${n}">` : `<span>${n}</span>`}</div>`).join('')}</div>
      <div class="slbl" style="margin-top:17px">Цвета</div>
      <div class="pcolors">${p.colors.map((c, i) => `<span class="sw ${c.hex === '#ffffff' ? 'sw--light' : ''} ${i ? '' : 'on'}" style="background:${c.hex}"></span>`).join('')}<span class="sw add">${I.plus}</span></div>
      <label class="tgl t1" data-act="tgl" data-id="coll"><span class="sw-t ${e.coll ? 'on' : ''}"></span>Показывать в коллекции «Дроп #14»</label>
      <label class="tgl" data-act="tgl" data-id="isNew"><span class="sw-t ${e.isNew ? 'on' : ''}"></span>Бейдж «Новинка»</label>
      <label class="tgl tgl--sub" data-act="tgl" data-id="notify"><span class="sw-t ${e.notify ? 'on' : ''}"></span><span>Уведомить подписчиков о скидке<small>уйдёт ${D.stats.subscribers} подписчикам бота</small></span></label>
      <button class="save" data-act="save" data-id="${id}">Сохранить изменения</button></div>`;
  }
  function vAdminProducts() {
    return `<div class="ahead"><span class="h1">Товары</span><span class="hint" style="font-size:15px">${D.catalogStats.products} товаров · ${D.catalogStats.stock} шт</span></div>
      <div class="list">${S.products().map((p) => `<a href="#/admin/product/${p.id}"><img src="${p.img}" alt=""><span>${p.name}<small>${rub(p.price)} · остаток ${Object.values(p.sizes).reduce((a, b) => a + b, 0)} шт</small></span>${I.chevR}</a>`).join('')}</div>
      <p class="hint" style="font-size:13.5px;padding:0 18px">В демо открываются 4 товара из макета.</p>`;
  }
  function vAdminClients() {
    return `<div class="ahead"><span class="h1">Клиенты</span><span class="hint" style="font-size:15px">${D.stats.subscribers} в боте</span></div>
      <div class="list">${[['Артём К.', '1 заказ · 17 032 ₽'], ['Никита Ч.', 'тестовый заказ']].map(([n, s]) => `<div class="row"><span class="logo-c" style="width:40px;height:40px;background:#e9eefc;color:#1452fe;font-weight:700">${n[0]}</span><span>${n}<small>${s}</small></span></div>`).join('')}</div>`;
  }
  function vAdminMore() {
    return `<div class="ahead"><span class="h1">Ещё</span></div><div class="list">
      <a href="admin.html" target="_blank">Веб-админка (десктоп)${I.chevR}</a><a href="#" data-act="mailing">Рассылки в Telegram${I.chevR}</a><a href="#/">Открыть магазин${I.chevR}</a><a href="#" data-act="reset">Сбросить демо-данные${I.chevR}</a></div>`;
  }

  // ---------- роутер ----------
  const routes = [
    [/^#?\/?$/, () => ({ v: vCatalog(), tab: 'home' })],
    [/^#\/product\/(\w+)/, (m) => ({ v: vProduct(m[1]), main: 'add', pid: m[1], back: true, cls: 'pg' })],
    [/^#\/cart$/, () => ({ v: vCart(), main: S.s.cart.items.length ? 'pay' : null, tab: S.s.cart.items.length ? null : 'cart', back: true })],
    [/^#\/done\/(\d+)/, (m) => ({ v: vDone(m[1]), notabs: true })],
    [/^#\/fav$/, () => ({ v: vFav(), tab: 'fav' })],
    [/^#\/search$/, () => ({ v: vSearch(), tab: 'search' })],
    [/^#\/drop$/, () => { ui.cat = null; ui.chip = 'Все'; return { v: vCatalog(), tab: 'home' }; }],
    [/^#\/profile$/, () => ({ v: vProfile(), tab: 'profile' })],
    [/^#\/admin\/?$/, () => ({ v: vAdminSum(), atab: 'sum', admin: true })],
    [/^#\/admin\/orders$/, () => ({ v: vAdminOrders(), atab: 'orders', admin: true })],
    [/^#\/admin\/products$/, () => ({ v: vAdminProducts(), atab: 'products', admin: true })],
    [/^#\/admin\/product\/(\w+)/, (m) => ({ v: vAdminProduct(m[1]), atab: 'products', admin: true, back: true })],
    [/^#\/admin\/clients$/, () => ({ v: vAdminClients(), atab: 'clients', admin: true })],
    [/^#\/admin\/more$/, () => ({ v: vAdminMore(), atab: 'more', admin: true })],
  ];
  let lastHash = null, rendering = false, pending = false;
  // повторный вызов во время перерисовки (blur/change удаляемого поля) откладываем
  function render() {
    if (rendering) { pending = true; return; }
    rendering = true;
    try { draw(); } finally { rendering = false; }
    if (pending) { pending = false; queueMicrotask(render); }
  }
  function draw() {
    const h = location.hash || '#/';
    let r;
    for (const [re, fn] of routes) { const m = h.match(re); if (m) { r = fn(m); break; } }
    if (!r) r = { v: vCatalog(), tab: 'home' };
    const keep = h === lastHash ? screen.scrollTop : 0;
    const ae = document.activeElement, aid = ae && ae.id, pos = ae && ae.selectionStart;
    screen.innerHTML = r.v;
    screen.className = 'screen ' + (r.cls || '');
    screen.scrollTop = keep;
    if (aid && h === lastHash) { const el = document.getElementById(aid); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} } }
    if (h !== lastHash) { ui.slide = 0; if (!h.startsWith('#/admin/product')) { ui.edit = null; ui.stockEdit = false; } }
    lastHash = h;
    html.classList.toggle('admin-mode', !!r.admin);
    sheet.classList.toggle('admin', !!r.admin);
    $('#sheetSub').textContent = r.admin ? 'админ-панель' : 'мини-приложение';
    tabbar.innerHTML = r.admin ? adminTabs(r.atab) : shopTabs(r.tab);
    sheet.classList.toggle('no-tabs', !!r.notabs);
    document.querySelectorAll('.demo-nav a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === h));
    setMain(r);
    if (inTG) r.back ? tg.BackButton.show() : tg.BackButton.hide();
    bindGallery();
  }
  function setMain(r) {
    let text = null;
    if (r.main === 'add') {
      const p = S.product(r.pid);
      const inCart = S.s.cart.items.some((i) => i.pid === r.pid && i.size === (ui.sel[r.pid] || {}).size);
      text = inCart && ui.added === r.pid ? `Перейти в корзину · ${S.totals().count}` : `Добавить в корзину · ${rub(p.price)}`;
      mainAction = () => {
        if (ui.added === r.pid) return go('#/cart');
        const sel = ui.sel[r.pid];
        S.addToCart(r.pid, sel.size, p.colors.length > 1 ? sel.color : undefined);
        ui.added = r.pid; haptic('medium'); toast('Добавлено в корзину');
      };
    } else if (r.main === 'pay') {
      text = `Оплатить ${rub(S.totals().total)}`;
      mainAction = pay;
    } else mainAction = null;
    sheet.classList.toggle('has-main', !!text);
    $('#mainbtn').textContent = text || '';
    if (inTG) { if (text) { tg.MainButton.setText(text); tg.MainButton.show(); } else tg.MainButton.hide(); }
  }
  function pay() {
    const t = S.totals();
    const finish = () => { const o = S.placeOrder(); haptic('heavy'); go('#/done/' + o.id); };
    const msg = `Демо-оплата ${rub(t.total)} через ${D.payments.find((p) => p.id === S.s.cart.pay).name}. Реальные деньги не списываются.`;
    if (inTG) tg.showPopup({ title: 'Оплата', message: msg, buttons: [{ id: 'ok', type: 'default', text: 'Оплатить' }, { type: 'cancel' }] }, (b) => b === 'ok' && finish());
    else if (confirm(msg)) finish();
  }
  function bindGallery() {
    const g = $('#gal'); if (!g) return;
    g.addEventListener('scroll', () => {
      const i = Math.round(g.scrollLeft / g.clientWidth);
      if (i !== ui.slide) { ui.slide = i; document.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k === i)); $('#galc').textContent = `${i + 1}/${g.children.length}`; }
    }, { passive: true });
  }

  // ---------- события ----------
  const numOf = (v) => parseInt(String(v).replace(/\D/g, ''), 10) || 0;
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const a = el.dataset.act, id = el.dataset.id;
    if (el.tagName === 'A' || ['fav', 'mailing', 'reset', 'sizes'].includes(a)) ev.preventDefault();
    ev.stopPropagation();
    const pid = (location.hash.match(/product\/(\w+)/) || [])[1];
    switch (a) {
      case 'close': inTG ? tg.close() : toast('В Telegram здесь закроется Mini App'); break;
      case 'menu': toast('Меню Mini App'); break;
      case 'back': history.length > 1 ? history.back() : go('#/'); break;
      case 'main': mainAction && mainAction(); render(); break;
      case 'cat': ui.cat = ui.cat === id ? null : id; if (D.chips.includes(id)) ui.chip = ui.cat ? id : 'Все'; render(); break;
      case 'chip': ui.chip = id; ui.cat = null; render(); break;
      case 'fav': S.set((s) => { s.fav = s.fav.includes(id) ? s.fav.filter((x) => x !== id) : s.fav.concat(id); }); haptic(); break;
      case 'share': {
        const url = 'https://t.me/share/url?url=' + encodeURIComponent('https://t.me/drop_store_bot/app?startapp=' + id) + '&text=' + encodeURIComponent(S.product(id).name);
        inTG ? tg.openTelegramLink(url) : (navigator.clipboard && navigator.clipboard.writeText(location.href), toast('Ссылка скопирована'));
        break;
      }
      case 'color': ui.sel[pid].color = id; haptic(); render(); break;
      case 'size': ui.sel[pid].size = id; ui.added = null; haptic(); render(); break;
      case 'sizes': toast('Таблица размеров: EU 40-45'); break;
      case 'ptab': ui.ptab = id; render(); break;
      case 'qty': S.set((s) => { const it = s.cart.items[id]; it.qty = Math.max(1, Math.min(9, it.qty + +el.dataset.d)); }); haptic(); break;
      case 'del': S.set((s) => { s.cart.items.splice(id, 1); }); haptic(); break;
      case 'promo-clear': ui.promoInput = ''; ui.promoBad = false; S.set((s) => { s.cart.promo = ''; }); break;
      case 'promo-apply': applyPromo(); break;
      case 'dlv': S.set((s) => { s.cart.delivery = id; }); break;
      case 'pay': S.set((s) => { s.cart.pay = id; }); haptic(); break;
      case 'period': ui.period = id; render(); break;
      case 'ofilter': ui.ofilter = id; render(); break;
      case 'accept': setStatus(id, 'work', 'Заказ принят в сборку'); break;
      case 'ship': setStatus(id, 'ship', 'Передан в доставку'); break;
      case 'finish': setStatus(id, 'done', 'Заказ выполнен'); break;
      case 'write': inTG ? tg.openTelegramLink('https://t.me/drop_store_bot') : toast('Откроется чат с клиентом в Telegram'); break;
      case 'mailing': toast('Рассылка уйдёт ' + D.stats.subscribers + ' подписчикам бота'); break;
      case 'addphoto': toast('Загрузка фото из галереи'); break;
      case 'stockedit': ui.stockEdit = !ui.stockEdit; render(); break;
      case 'tgl': ev.preventDefault(); ui.edit[id] = !ui.edit[id]; render(); break;
      case 'save': {
        const e = ui.edit;
        S.set((s) => { s.products[id] = { name: e.name, cat: e.cat, price: e.price, old: e.old > e.price ? e.old : undefined, sizes: e.sizes, inCollection: e.coll, badgeNew: e.isNew, notify: e.notify }; });
        ui.stockEdit = false; haptic('medium'); toast(e.notify && e.old > e.price ? `Сохранено · уведомление ${D.stats.subscribers} подписчикам` : 'Изменения сохранены');
        break;
      }
      case 'reset': S.reset(); ui.edit = null; ui.promoInput = null; toast('Демо сброшено'); go('#/'); break;
    }
  });
  function setStatus(id, st, msg) { S.set((s) => { s.orders.find((o) => String(o.id) === String(id)).status = st; }); ui.ofilter = st; haptic('medium'); toast(msg); render(); }
  function applyPromo() {
    const v = (ui.promoInput !== null ? ui.promoInput : S.s.cart.promo).trim().toUpperCase();
    if (D.promo[v]) { ui.promoBad = false; ui.promoInput = null; S.set((s) => { s.cart.promo = v; }); haptic('medium'); }
    else { ui.promoBad = !!v; render(); }
  }
  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.id === 'q') { ui.q = t.value; render(); }
    else if (t.id === 'oq') { ui.oq = t.value; render(); }
    else if (t.id === 'promo') { ui.promoInput = t.value; ui.promoBad = false; if (S.s.cart.promo) S.s.cart.promo = ''; if (D.promo[t.value.trim().toUpperCase()]) applyPromo(); else render(); }
    else if (t.id === 'e-name') ui.edit.name = t.value;
    else if (t.id === 'e-cat') ui.edit.cat = t.value;
    else if (t.id === 'e-old' || t.id === 'e-price') {
      ui.edit[t.id === 'e-old' ? 'old' : 'price'] = numOf(t.value);
      const e = ui.edit, d = e.old > e.price ? Math.round((1 - e.price / e.old) * 100) : 0;
      const pill = $('#e-disc'); if (pill) pill.textContent = d ? `−${d}%` : '0%';
    } else if (t.classList.contains('e-stock')) ui.edit.sizes[t.dataset.size] = numOf(t.value);
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.id === 'e-old' || t.id === 'e-price') render();
    if (t.id === 'e-cat') ui.edit.cat = t.value;
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && ev.target.id === 'promo') applyPromo(); });

  S.on(render);
  addEventListener('hashchange', render);
  render();
  // таймер дропа
  if (!S.SHOT) setInterval(() => { const t = $('#timer'); if (t) t.textContent = fmtTime(dropLeft()); }, 1000);
})();
