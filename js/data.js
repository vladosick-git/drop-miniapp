// Моковые данные ДРОП. Все цифры взяты из макетов GPT (ref/*.png).
// Единственная правка: размер 45 у Runner 2.0 в магазине зачёркнут,
// поэтому в админке его остаток 0 (в макете админки было 3).
window.DROP_DATA = {
  today: '15 октября, среда',
  launch: { date: '14 октября', day: 2 },
  user: { name: 'Артём', points: 1250, avatar: 'assets/img/avatar_artem.jpg' },
  owner: { name: 'Никита Ч.', role: 'владелец', avatar: 'assets/img/avatar_nikita.jpg' },
  drop: { title: 'ДРОП #14 · ОСЕНЬ', collection: 'Дроп #14 · Осень', left: 2 * 3600 + 14 * 60 + 37, published: '14 октября', sold: 2, total: 500 },

  categories: [
    { id: 'new', name: 'Новинки', img: 'assets/img/cat_new.jpg' },
    { id: 'Кроссовки', name: 'Кроссовки', img: 'assets/img/cat_sneakers.jpg' },
    { id: 'Худи', name: 'Худи', img: 'assets/img/cat_hoodies.jpg' },
    { id: 'acc', name: 'Аксессуары', img: 'assets/img/cat_acc.jpg' },
    { id: 'sale', name: 'SALE' },
  ],
  chips: ['Все', 'Кроссовки', 'Худи', 'Штаны', 'Кепки'],

  products: [
    {
      id: 'hoodie', name: 'Худи Oversize «Бетон»', cat: 'Худи', price: 6490,
      img: 'assets/img/card_hoodie.jpg', thumb: 'assets/img/thumb_hoodie.jpg', web: 'assets/img/web_hoodie.jpg',
      gallery: ['assets/img/big_hoodie.jpg'],
      sizeLabel: 'Размер', sizes: { S: 4, M: 6, L: 5, XL: 3 }, defSize: 'L',
      colors: [{ name: 'серый', hex: '#8f8f8f' }],
      desc: 'Плотный футер, свободный крой и капюшон на подкладке.',
      comp: '80% хлопок, 20% полиэстер.',
    },
    {
      id: 'runner', name: 'Кроссовки Runner 2.0', cat: 'Кроссовки', price: 12990, old: 16240,
      rating: 4.8, reviews: 126,
      img: 'assets/img/card_runner.jpg', thumb: 'assets/img/thumb_runner.jpg', web: 'assets/img/web_runner.jpg',
      gallery: ['assets/img/runner_big.jpg', 'assets/img/big_runner_2.jpg', 'assets/img/big_runner_3.jpg', 'assets/img/big_runner_4.jpg', 'assets/img/big_runner_5.jpg'],
      adminGallery: ['assets/img/gal_runner_1.jpg', 'assets/img/gal_runner_2.jpg', 'assets/img/gal_runner_3.jpg', 'assets/img/gal_runner_4.jpg', 'assets/img/gal_runner_5.jpg'],
      sizeLabel: 'Размер EU', sizes: { 40: 5, 41: 6, 42: 4, 43: 6, 44: 5, 45: 0 }, defSize: '42',
      colors: [{ name: 'белый', hex: '#ffffff' }, { name: 'чёрный', hex: '#151515' }, { name: 'серый', hex: '#8a8a8a' }],
      desc: 'Лёгкие кроссовки для города. Мягкая подошва и удобная посадка.',
      comp: 'Верх: текстиль и сетка. Подошва: EVA.',
      sold: 1, inCarts: 1, inCollection: true, badgeNew: true, notify: true,
    },
    {
      id: 'cargo', name: 'Карго-штаны Utility', cat: 'Штаны', price: 7990,
      img: 'assets/img/card_cargo.jpg', web: 'assets/img/web_cargo.jpg', gallery: ['assets/img/big_cargo.jpg'],
      sizeLabel: 'Размер', sizes: { S: 3, M: 5, L: 4, XL: 2 }, defSize: 'M',
      colors: [{ name: 'серый', hex: '#7d7d7d' }],
      desc: 'Широкие карго с накладными карманами.',
      comp: '100% хлопок.',
    },
    {
      id: 'cap', name: 'Кепка 6-panel', cat: 'Кепки', price: 2490, left: 3,
      img: 'assets/img/card_cap.jpg', thumb: 'assets/img/order_cap.jpg', web: 'assets/img/web_cap.jpg', gallery: ['assets/img/big_cap.jpg'],
      sizeLabel: 'Размер', sizes: { 'One size': 3 }, defSize: 'One size',
      colors: [{ name: 'графит', hex: '#6f6f6f' }],
      desc: 'Шестипанельная кепка из стираного хлопка.',
      comp: '100% хлопок.',
    },
  ],
  catalogStats: { products: 12, stock: 184 },

  promo: { DROP14: 10 },
  pointsSpend: 500,
  delivery: [
    { id: 'courier', name: 'Курьер завтра, 10:00-18:00', price: 0, short: 'Курьер' },
    { id: 'cdek', name: 'СДЭК, пункт выдачи, 2-3 дня', price: 290, short: 'СДЭК' },
    { id: 'pickup', name: 'Самовывоз из шоурума', note: 'Москва', price: 0, short: 'Самовывоз' },
  ],
  address: 'Москва, ул. Большая Дмитровка, 7',
  payments: [{ id: 'sbp', name: 'СБП' }, { id: 'card', name: 'Картой' }, { id: 'tgpay', name: 'Telegram Pay' }],

  defaultCart: {
    items: [
      { pid: 'runner', size: '42', color: 'белый', qty: 1 },
      { pid: 'hoodie', size: 'L', qty: 1 },
    ],
    promo: 'DROP14', delivery: 'courier', pay: 'sbp',
  },

  orders: [
    {
      id: 1002, client: 'Артём К.', status: 'new', time: '19:24', date: '15 окт, 19:24', first: true,
      items: [{ pid: 'runner', size: 'EU 42', color: 'белый' }, { pid: 'hoodie', size: 'L' }],
      delivery: 'Курьер завтра, 10:00-18:00', short: 'Курьер', address: 'Москва, ул. Большая Дмитровка, 7',
      pay: 'СБП', paid: 'оплачено', promo: 'DROP14 · −10%', total: 17032,
    },
    {
      id: 1001, client: 'Никита Ч.', status: 'test', time: '14 октября', date: '14 окт, 12:08',
      items: [{ pid: 'cap' }], short: 'Самовывоз', pay: 'СБП', payNote: 'СБП · 10 ₽ · возвращено', webPay: 'СБП, возвращено', total: 10,
    },
  ],
  stats: { opens: 14, subscribers: 23, funnel: [['Открыли приложение', 14, ''], ['Открыли товар', 6, '43%'], ['Добавили в корзину', 2, '33%'], ['Оплатили', 1, '50%']] },
  checklist: [
    ['Подключить оплату СБП', 'Оплата СБП подключена', true],
    ['Добавить товары - 12 шт', null, true],
    ['Подключить бота', 'Бот подключён', true],
    ['Настроить доставку', 'Доставка настроена', true],
    ['Провести тестовый заказ', 'Тестовый заказ проведён', true],
    ['Сделать первую рассылку', 'Первая рассылка', false],
    ['Подключить свой домен', 'Свой домен', false],
  ],
};
