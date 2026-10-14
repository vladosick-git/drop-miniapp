// Состояние демо: корзина, избранное, заказы, правки товара.
// Хранится в localStorage, общий для магазина и админки (покупка в магазине
// появляется в админке). В режиме ?shot=1 всегда исходное состояние из макетов.
(function () {
  const D = window.DROP_DATA;
  const params = new URLSearchParams(location.search);
  const SHOT = params.has('shot');
  const KEY = 'drop-demo-v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const fresh = () => ({
    cart: clone(D.defaultCart),
    fav: [],
    orders: clone(D.orders),
    products: {},          // правки из админки: { runner: {price, old, name, sizes, ...} }
    points: D.user.points,
    dropEnd: Date.now() + D.drop.left * 1000,
    nextId: 1003,
  });

  let st;
  try { st = !SHOT && params.get('reset') === null && JSON.parse(localStorage.getItem(KEY)); } catch (e) { st = null; }
  if (!st || !st.cart) st = fresh();
  if (st.dropEnd < Date.now()) st.dropEnd = Date.now() + D.drop.left * 1000;

  const listeners = [];
  const save = () => {
    if (!SHOT) try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    listeners.forEach((fn) => fn());
  };
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) { st = JSON.parse(e.newValue); listeners.forEach((fn) => fn()); }
  });

  const product = (id) => {
    const base = D.products.find((p) => p.id === id);
    return base && Object.assign(clone(base), st.products[id] || {});
  };
  const rub = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₽';

  function totals() {
    const c = st.cart;
    const goods = c.items.reduce((s, it) => s + product(it.pid).price * it.qty, 0);
    const pct = D.promo[(c.promo || '').toUpperCase()] || 0;
    const promo = Math.round(goods * pct / 100);
    const points = goods ? Math.min(D.pointsSpend, st.points, goods - promo) : 0;
    const dlv = goods ? D.delivery.find((d) => d.id === c.delivery).price : 0;
    return { goods, pct, promo, points, delivery: dlv, total: goods - promo - points + dlv, count: c.items.reduce((s, it) => s + it.qty, 0) };
  }

  window.Store = {
    SHOT, params, rub, product, totals,
    get s() { return st; },
    on(fn) { listeners.push(fn); },
    set(fn) { fn(st); save(); },
    reset() { st = fresh(); save(); },
    products() { return D.products.map((p) => product(p.id)); },
    addToCart(pid, size, color) {
      const ex = st.cart.items.find((i) => i.pid === pid && i.size === size && i.color === color);
      if (ex) ex.qty++; else st.cart.items.push({ pid, size, color, qty: 1 });
      save();
    },
    placeOrder() {
      const t = totals(); const c = st.cart;
      const d = D.delivery.find((x) => x.id === c.delivery);
      const now = new Date();
      const hm = SHOT ? '19:52' : now.toTimeString().slice(0, 5);
      const order = {
        id: st.nextId++, client: D.user.name + ' К.', status: 'new', time: hm, date: 'сегодня, ' + hm,
        items: c.items.map((i) => ({ pid: i.pid, size: (product(i.pid).sizeLabel === 'Размер EU' ? 'EU ' : '') + i.size, color: i.color, qty: i.qty })),
        delivery: d.name, short: d.short, address: D.address,
        pay: D.payments.find((p) => p.id === c.pay).name, paid: 'оплачено',
        promo: t.pct ? `${c.promo} · −${t.pct}%` : null, total: t.total, demo: true,
      };
      st.orders.unshift(order);
      st.points -= t.points;
      st.cart = { items: [], promo: '', delivery: c.delivery, pay: c.pay };
      save();
      return order;
    },
  };
  // ?demo=paid - для скринов: заказ из корзины уже оформлен (только в памяти)
  if (SHOT && params.get('demo') === 'paid') window.Store.placeOrder();
})();
