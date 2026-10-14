// ДРОП - веб-админка (десктоп). Данные общие с Mini App через Store (localStorage).
(function () {
  const D = window.DROP_DATA, S = window.Store, rub = S.rub;
  const $ = (s) => document.querySelector(s);
  const ui = { period: 'all', q: '' };
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let toastT;
  const toast = (t) => { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1900); };

  $('#logo').innerHTML = I.logo;
  $('#ownerAva').src = D.owner.avatar; $('#ownerName').textContent = D.owner.name; $('#ownerRole').textContent = D.owner.role;
  $('#liveOpens').textContent = `${D.stats.opens} открытий с запуска`;

  const NAV = [['Сводка', I.homeF, null], ['Заказы', I.cart, '.orders'], ['Товары', I.tagO, '.cat'], ['Коллекции', I.layers, '.coll'], ['Клиенты', I.user, null], ['Промокоды', I.ticket, null], ['Рассылки в Telegram', I.planeO, '.mail'], ['Аналитика', I.bars, '.chart'], ['Настройки', I.gear, null]];
  function nav() {
    const n = S.s.orders.filter((o) => o.status === 'new').length;
    $('#snav').innerHTML = NAV.map(([l, ic, to], i) => `<a href="#" class="${i ? '' : 'on'}" data-to="${to || ''}" data-l="${l}">${ic}${l}${l === 'Заказы' && n ? `<span class="badge">${n}</span>` : ''}</a>`).join('');
  }

  const ST = { new: ['Новый', ''], work: ['Сборка', 'work'], ship: ['В доставке', 'work'], done: ['Выполнен', 'done'], test: ['Тест', 'test'] };
  function render() {
    const orders = S.s.orders, real = orders.filter((o) => o.status !== 'test');
    const revenue = real.reduce((s, o) => s + o.total, 0), tests = orders.length - real.length;
    const avg = real.length ? revenue / real.length : 0;
    const conv = (real.length / D.stats.opens) * 100;
    const done = D.checklist.filter((c) => c[2]).length;
    const q = ui.q.trim().toLowerCase();
    const rows = orders.filter((o) => !q || `#${o.id} ${o.client} ${o.items.map((i) => S.product(i.pid).name).join(' ')}`.toLowerCase().includes(q)).slice(0, 3);
    const short = (o) => o.items.map((i) => S.product(i.pid).name.replace('Кроссовки ', '').replace(' Oversize', '')).join(', ');
    const sold = {}; real.forEach((o) => o.items.forEach((i) => (sold[i.pid] = (sold[i.pid] || 0) + (i.qty || 1))));
    const soldTxt = Object.entries(sold).map(([pid, n]) => `${S.product(pid).name.replace('Кроссовки ', '').replace(' Oversize', '')} - ${n} шт`).join(', ');
    // выручка по дням: всё пришлось на 15 октября (14-го был только тестовый заказ)
    const days = ['9 окт', '10 окт', '11 окт', '12 окт', '13 окт', '14 окт', '15 окт'];
    const dayRev = [0, 0, 0, 0, 0, 0, revenue];

    $('#main').innerHTML = `
    <div class="top"><h1>Сводка</h1><span class="date">${D.today}</span>
      <label class="srch">${I.search}<input id="q" placeholder="Поиск по заказам, товарам и клиентам" value="${esc(ui.q)}"><kbd>Ctrl K</kbd></label>
      <div class="per">${[['today', 'Сегодня'], ['week', '7 дней'], ['all', 'Всё время']].map(([k, l]) => `<button class="${ui.period === k ? 'on' : ''}" data-per="${k}">${l}</button>`).join('')}</div>
      <button class="bell" data-act="bell">${I.bell}<i></i></button>
      <button class="newbtn" data-act="new">${I.plus}Новый товар</button></div>
    <div class="launch"><span class="emoji">🚀</span><b>Магазин запущен ${D.launch.date} - вы на ${D.launch.day}-м дне работы</b>
      <div class="launch__prog"><small>Запуск магазина · ${done} из ${D.checklist.length}</small><i style="--p:${(done / D.checklist.length) * 100}%"></i></div>
      <div class="launch__links"><a href="#" data-act="mailing">Сделать первую рассылку${I.chevR}</a><a href="#" data-act="domain">Подключить свой домен${I.chevR}</a></div></div>
    <div class="stats">
      <div class="card stat">${I.coins}<small>Выручка</small><b>${rub(revenue)}</b><span>без тестовых заказов</span></div>
      <div class="card stat">${I.cart}<small>Заказы</small><b>${real.length}</b><span>+${tests} ${tests === 1 ? 'тестовый' : 'тестовых'}</span></div>
      <div class="card stat">${I.wallet}<small>Средний чек</small><b>${rub(avg)}</b></div>
      <div class="card stat">${I.users}<small>Конверсия</small><b>${conv.toFixed(1).replace('.', ',')}%</b><span>${real.length} ${real.length % 10 === 1 && real.length % 100 !== 11 ? 'заказ' : 'заказа'} из ${D.stats.opens} открытий</span></div>
    </div>
    <div class="row2">
      <div class="card chart" id="chart"><h2>Выручка по дням</h2><div id="chartBox"></div><div class="chart__note">Данных пока мало - подробная аналитика появится после первой недели продаж</div></div>
      <div class="card funnel"><h2>Воронка Mini App</h2><ul>${D.stats.funnel.map(([l, n, p]) => `<li><span>${l} - ${n}${p ? ' · ' + p : ''}</span><i style="width:${Math.max(19, (n / D.stats.funnel[0][1]) * 166)}px"></i></li>`).join('')}</ul></div>
    </div>
    <div class="row3">
      <div class="card orders"><h2>Заказы<a href="index.html#/admin/orders">Все заказы${I.arrowR}</a></h2>
        <div class="tbl"><table><colgroup><col style="width:64px"><col style="width:80px"><col style="width:176px"><col style="width:68px"><col style="width:94px"><col style="width:113px"><col style="width:70px"><col style="width:84px"><col></colgroup>
          <tr><th>№</th><th>Клиент</th><th>Товары</th><th>Сумма</th><th>Доставка</th><th>Оплата</th><th>Статус</th><th>Время</th><th></th></tr>
          ${rows.map((o) => `<tr class="${o.status === 'new' ? 'hl' : o.status === 'test' ? 'muted' : ''}"><td class="id">#${o.id}</td><td>${o.client}</td><td>${short(o)}</td><td class="sum">${rub(o.total)}</td><td>${o.short}</td><td>${o.webPay || o.pay + ' ✓'}</td>
            <td><span class="st ${ST[o.status][1]}">${ST[o.status][0]}</span></td><td>${o.date}</td><td>${o.first ? '<span class="first"><span class="emoji">🎉</span>первый заказ</span>' : ''}</td></tr>`).join('')}
        </table>${rows.length < 3 ? `<div class="empty">${I.box}Новые заказы появятся здесь</div>` : ''}</div></div>
      <div class="card cat"><h2>Каталог<small>${D.catalogStats.products} товаров · ${D.catalogStats.stock} шт на складе</small></h2>
        <div class="cat__grid">${['runner', 'hoodie', 'cargo', 'cap'].map((id) => S.product(id)).map((p) => `<img src="${p.web}" alt="${esc(p.name)}" title="${esc(p.name)} - ${rub(p.price)}">`).join('')}</div>
        <p>Продано: ${soldTxt || 'пока ничего'}</p></div>
    </div>
    <div class="row4">
      <div class="card coll"><h2>Коллекция «${D.drop.collection}»</h2><img src="assets/img/web_collection.jpg" alt="">
        <div class="coll__meta">опубликована ${D.drop.published}<i style="--p:${(D.drop.sold / D.drop.total) * 100}%"></i><span>продано ${D.drop.sold} из ${D.drop.total}</span></div></div>
      <div class="card chk"><h2>Чек-лист запуска</h2><ul>${D.checklist.filter((c) => c[1]).map((c) => `<li>${c[2] ? `<span class="ok">${I.check}</span>` : '<span class="no"></span>'}${c[1]}</li>`).join('')}</ul></div>
      <div class="card mail"><h2>Рассылки в Telegram</h2>${I.planeO}<b>Рассылок ещё не было</b><p>В боте ${D.stats.subscribers} подписчика - расскажите им о запуске</p><button data-act="mailing">Создать первую рассылку</button></div>
    </div>`;
    drawChart = () => { $('#chartBox').innerHTML = chart(days, dayRev, $('#chart').clientWidth); };
    drawChart();
  }
  let drawChart = () => {};
  addEventListener('resize', () => drawChart());

  function chart(days, vals, W) {
    // координаты как в макете: ось 0 на y=203 от верха карточки, 30 000 на y=118
    const x0 = 58, x1 = W - 22, y0 = 135, yTop = 50, max = 30000;
    const step = (x1 - x0) / days.length;
    const cx = (i) => x0 + step * (i + 0.5) - 2;
    const yv = (v) => y0 - (v / max) * (y0 - yTop);
    let s = `<svg viewBox="0 0 ${W} 189">`;
    [0, 10000, 20000, 30000].forEach((v) => {
      s += `<text x="49" y="${yv(v) + 4}" text-anchor="end" font-size="11" fill="#8f8f94">${v ? v.toLocaleString('ru-RU').replace(/ /g, ' ') : 0}</text>`;
      s += `<line x1="${x0}" x2="${x1}" y1="${yv(v)}" y2="${yv(v)}" stroke="${v ? '#f3f3f5' : '#e6e6ea'}" stroke-width="1"/>`;
    });
    s += `<line x1="${x0}" x2="${x0}" y1="${yTop}" y2="${y0}" stroke="#ededf0"/>`;
    days.forEach((d, i) => {
      const v = vals[i];
      if (v) s += `<rect x="${cx(i) - 16.5}" y="${yv(v)}" width="33" height="${y0 - yv(v)}" rx="2" fill="#1452fe"><title>${d}: ${v}</title></rect>`;
      else s += `<rect x="${cx(i) - 13.5}" y="${y0 - 2}" width="27" height="2" fill="#dcdce0"/>`;
      s += `<text x="${cx(i) + 2}" y="${y0 + 18}" text-anchor="middle" font-size="11" fill="#8f8f94">${d}</text>`;
    });
    // линия запуска 14 октября
    s += `<line x1="${cx(5) + 2}" x2="${cx(5) + 2}" y1="${yTop - 3}" y2="${y0}" stroke="#c4c4ca" stroke-dasharray="4 3"/><text x="${cx(5) + 3}" y="${yTop - 8}" text-anchor="middle" font-size="11" fill="#8f8f94">Запуск</text>`;
    s += '</svg>';
    const last = vals[vals.length - 1];
    if (last) s += `<div class="tip" style="left:${cx(6) - 54}px;top:28px">15 октября<b>${rub(last)}</b>${S.s.orders.filter((o) => o.status !== 'test').length} ${S.s.orders.filter((o) => o.status !== 'test').length === 1 ? 'заказ' : 'заказа'}</div>`;
    return s;
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-to], [data-act], [data-per]'); if (!a) return;
    if (a.dataset.per) { ui.period = a.dataset.per; render(); return; }
    if (a.dataset.l) {
      e.preventDefault();
      document.querySelectorAll('.snav a').forEach((x) => x.classList.toggle('on', x === a));
      const el = a.dataset.to && document.querySelector(a.dataset.to);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
      else if (a.dataset.l !== 'Сводка') toast(`Раздел «${a.dataset.l}» в демо не показан`);
      return;
    }
    const act = a.dataset.act; e.preventDefault();
    if (act === 'new') toast('Форма нового товара - в мобильной админке: Товары → +');
    if (act === 'mailing') toast(`Рассылка уйдёт ${D.stats.subscribers} подписчикам бота`);
    if (act === 'domain') toast('Подключение домена drop-store.ru');
    if (act === 'bell') toast('Новый заказ #1002 от Артём К.');
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'q') { ui.q = e.target.value; const p = e.target.selectionStart; render(); const q = $('#q'); q.focus(); q.setSelectionRange(p, p); } });
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#q').focus(); } });
  S.on(() => { nav(); render(); });
  nav(); render();
})();
