export type Category = {
  slug: string;
  name: string;
  shortName: string;
  note: string;
  image: string;
  tone: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  oldPrice?: number;
  rating: string;
  reviews: number;
  image: string;
  color: string;
  label?: string;
  description: string;
  specs: { label: string; value: string }[];
  inStock: boolean;
};

const photo = (name: string) => `/products/${name}.jpg`;

export const categories: Category[] = [
  {
    slug: "smartphones",
    name: "Смартфоны и гаджеты",
    shortName: "Смартфоны",
    note: "На связи с важным",
    image: photo("phone"),
    tone: "category-blue",
  },
  {
    slug: "computers",
    name: "Ноутбуки и компьютеры",
    shortName: "Ноутбуки",
    note: "Для работы и идей",
    image: photo("laptop"),
    tone: "category-lilac",
  },
  {
    slug: "audio",
    name: "ТВ и аудио",
    shortName: "ТВ и аудио",
    note: "Звук и изображение",
    image: photo("headphones"),
    tone: "category-sky",
  },
  {
    slug: "home",
    name: "Техника для дома",
    shortName: "Для дома",
    note: "Больше времени себе",
    image: photo("vacuum"),
    tone: "category-mint",
  },
  {
    slug: "kitchen",
    name: "Техника для кухни",
    shortName: "Для кухни",
    note: "Рецепты без суеты",
    image: photo("airfryer"),
    tone: "category-yellow",
  },
];

const listing = (
  id: string,
  slug: string,
  name: string,
  brand: string,
  category: string,
  price: number,
  imageName: string,
  color: string,
  description: string,
  specs: Product["specs"],
  extras: Partial<Pick<Product, "oldPrice" | "rating" | "reviews" | "label" | "inStock">> = {},
): Product => ({
  id,
  slug,
  name,
  brand,
  category,
  price,
  image: photo(imageName),
  color,
  description,
  specs,
  rating: extras.rating ?? "4,8",
  reviews: extras.reviews ?? 0,
  inStock: extras.inStock ?? true,
  ...extras,
});

export const products: Product[] = [
  listing("nova-one", "samsung-galaxy-a36-256-black", "Samsung Galaxy A36 5G, 256 ГБ", "SAMSUNG", "smartphones", 4_489_000, "phone", "Графитовый", "Galaxy A36 сочетает большой Super AMOLED-экран, основную камеру 50 Мп и аккумулятор на 5000 мА·ч. Конфигурация на 256 ГБ подходит для приложений, фото и видео.", [
    { label: "Экран", value: "Super AMOLED · 6,7 дюйма · 120 Гц" }, { label: "Память", value: "8 / 256 ГБ" }, { label: "Камеры", value: "50 + 8 + 5 Мп · фронтальная 12 Мп" }, { label: "Аккумулятор", value: "5 000 мА·ч" },
  ], { oldPrice: 4_909_000, rating: "4,9", reviews: 126, label: "Хит недели" }),
  listing("orbit-book", "lenovo-ideapad-slim-3-15amn8", "Lenovo IdeaPad Slim 3 15AMN8, Ryzen 5 · 16/512 ГБ", "LENOVO", "computers", 7_966_000, "laptop", "Серый", "Универсальный IdeaPad Slim 3 с экраном Full HD, 16 ГБ оперативной памяти и SSD на 512 ГБ подходит для работы, учёбы и повседневных задач.", [
    { label: "Экран", value: "15,6 дюйма · Full HD" }, { label: "Процессор", value: "AMD Ryzen 5" }, { label: "Оперативная память", value: "16 ГБ DDR5" }, { label: "Накопитель", value: "SSD · 512 ГБ" },
  ], { oldPrice: 8_850_000, rating: "4,8", reviews: 84, label: "Лёгкий выбор" }),
  listing("tono-studio", "jbl-tune-520", "JBL Tune 520", "JBL", "audio", 790_000, "headphones", "Чёрный", "Накладные беспроводные наушники с микрофоном и подключением по Bluetooth. Складная конструкция удобна для хранения и поездок.", [
    { label: "Конструкция", value: "Накладные · складные" }, { label: "Подключение", value: "Bluetooth" }, { label: "Чувствительность", value: "102 дБ" }, { label: "Микрофон", value: "Есть" },
  ], { rating: "4,7", reviews: 59 }),
  listing("viewpoint-55", "xiaomi-tv-a-2025-55", "Xiaomi TV A 2025, 55″", "XIAOMI", "audio", 6_204_000, "tv", "Чёрный", "55-дюймовый телевизор с разрешением 4K UHD, Android TV и Smart TV. Подходит для фильмов, спорта и приложений для просмотра видео.", [
    { label: "Диагональ", value: "55 дюймов" }, { label: "Разрешение", value: "4K UHD · 3840 × 2160" }, { label: "Платформа", value: "Android TV" }, { label: "Частота обновления", value: "60 Гц" },
  ], { oldPrice: 8_654_000, rating: "4,8", reviews: 38 }),
  listing("sfera-clean", "xiaomi-robot-vacuum-s20-white", "Xiaomi Robot Vacuum S20, White EU", "XIAOMI", "home", 2_999_150, "vacuum", "Белый", "Робот-пылесос для сухой и влажной уборки с управлением через приложение. Контейнер для пыли рассчитан на 0,4 л.", [
    { label: "Уборка", value: "Сухая и влажная" }, { label: "Пылесборник", value: "Контейнер · 0,4 л" }, { label: "Управление", value: "Приложение и кнопки на корпусе" }, { label: "Мощность", value: "45 Вт" },
  ], { oldPrice: 3_157_000, rating: "4,6", reviews: 41 }),
  listing("kompakt-airfry", "xiaomi-smart-air-fryer-65l", "Xiaomi Smart Air Fryer 6.5L, White EU", "XIAOMI", "kitchen", 1_789_000, "airfryer", "Белый", "Аэрогриль с чашей 6,5 л и антипригарной рабочей поверхностью. Температуру можно устанавливать до 220 °C.", [
    { label: "Объём", value: "6,5 л" }, { label: "Мощность", value: "1 800 Вт" }, { label: "Максимальная температура", value: "220 °C" }, { label: "Покрытие", value: "Антипригарное" },
  ], { rating: "4,9", reviews: 73, label: "Для быстрых ужинов" }),
  listing("vista-watch", "redmi-watch-5-silver-gray", "Redmi Watch 5, Silver Gray", "XIAOMI", "smartphones", 1_579_000, "watch", "Серебристый / серый", "Умные часы с AMOLED-экраном, совместимые с iOS и Android. Корпус размером 41 мм и силиконовый ремешок подходят для повседневного ношения.", [
    { label: "Экран", value: "AMOLED · 432 × 514" }, { label: "Размер корпуса", value: "41 мм" }, { label: "Совместимость", value: "iOS и Android" }, { label: "Ремешок", value: "Силикон" },
  ], { rating: "4,5", reviews: 31 }),
  listing("orbit-screen", "samsung-odyssey-g7-27", "Samsung Odyssey G7, 27″", "SAMSUNG", "computers", 8_500_000, "monitor", "Чёрный", "Изогнутый игровой монитор с QHD-разрешением, VA-матрицей и частотой обновления 240 Гц.", [
    { label: "Диагональ", value: "27 дюймов" }, { label: "Разрешение", value: "QHD · 2560 × 1440" }, { label: "Частота обновления", value: "240 Гц" }, { label: "Матрица", value: "VA · изогнутый экран" },
  ], { rating: "4,7", reviews: 22 }),
  listing("nova-air", "redmi-note-14-6-128-green", "Xiaomi Redmi Note 14, 6/128 ГБ", "XIAOMI", "smartphones", 2_457_000, "phone", "Зелёный", "Redmi Note 14 оснащён 6,67-дюймовым дисплеем и основной камерой 108 Мп. Аккумулятор ёмкостью 5500 мА·ч рассчитан на активное использование в течение дня.", [
    { label: "Экран", value: "6,67 дюйма · 120 Гц" }, { label: "Память", value: "6 / 128 ГБ" }, { label: "Основная камера", value: "108 Мп" }, { label: "Аккумулятор", value: "5 500 мА·ч" },
  ], { rating: "4,8", reviews: 47, label: "Новая коллекция" }),
  listing("orbit-book-pro", "lenovo-slim-3-15irh10-i5-16-512", "Lenovo Slim 3 15IRH10, Core i5 · 16/512 ГБ", "LENOVO", "computers", 8_250_000, "laptop", "Серый", "Ноутбук с процессором Intel Core i5-13420H, экраном WUXGA и быстрым SSD. Подойдёт для рабочих задач и повседневного использования.", [
    { label: "Экран", value: "15,3 дюйма · WUXGA · IPS" }, { label: "Процессор", value: "Intel Core i5-13420H" }, { label: "Оперативная память", value: "16 ГБ" }, { label: "Накопитель", value: "SSD · 512 ГБ" },
  ], { oldPrice: 9_198_000, rating: "4,9", reviews: 63, label: "Выбор покупателей" }),
  listing("viewpoint-65", "samsung-ue55u8001fuxuz-55", "Samsung Crystal UHD U8001F, 55″", "SAMSUNG", "audio", 6_470_000, "tv", "Чёрный", "55-дюймовый телевизор с разрешением 4K UHD, Smart TV и платформой Tizen.", [
    { label: "Диагональ", value: "55 дюймов" }, { label: "Разрешение", value: "4K UHD" }, { label: "Платформа", value: "Tizen · Smart TV" }, { label: "Частота обновления", value: "50 Гц" },
  ], { oldPrice: 7_700_000, rating: "4,9", reviews: 28 }),
  listing("sfera-clean-plus", "artel-vcu0120-vacuum-black", "Artel VCU0120, чёрный", "ARTEL", "home", 1_150_000, "vacuum", "Чёрный", "Пылесос для сухой уборки с пылесборником объёмом 3,5 л и регулировкой мощности на корпусе.", [
    { label: "Тип уборки", value: "Сухая" }, { label: "Мощность", value: "2 000 Вт" }, { label: "Мощность всасывания", value: "420 Вт" }, { label: "Пылесборник", value: "3,5 л" },
  ], { oldPrice: 1_483_000, rating: "4,7", reviews: 18, label: "Новинка" }),
  listing("kompakt-airfry-mini", "tefal-easy-fry-max-ey245b10", "Tefal Easy Fry Max EY245B10", "TEFAL", "kitchen", 2_490_000, "airfryer", "Чёрный", "Аэрогриль с сенсорным управлением, антипригарной поверхностью и автоматическим отключением при перегреве.", [
    { label: "Мощность", value: "1 500 Вт" }, { label: "Максимальная температура", value: "200 °C" }, { label: "Управление", value: "Сенсорное" }, { label: "Рабочая поверхность", value: "Антипригарная" },
  ], { rating: "4,8", reviews: 26 }),
  listing("nova-max", "redmi-note-14s-8-256-purple", "Xiaomi Redmi Note 14S, 8/256 ГБ", "XIAOMI", "smartphones", 3_470_000, "phone", "Фиолетовый", "Redmi Note 14S с AMOLED-экраном и памятью 256 ГБ. Конфигурация на 8 ГБ оперативной памяти подходит для повседневных приложений и многозадачности.", [
    { label: "Экран", value: "AMOLED · 6,67 дюйма" }, { label: "Память", value: "8 / 256 ГБ" }, { label: "Аккумулятор", value: "5 000 мА·ч" }, { label: "Операционная система", value: "Android 14" },
  ], { rating: "4,9", reviews: 52, label: "Большой экран" }),
  listing("nova-lite", "samsung-galaxy-a36-256-white", "Samsung Galaxy A36 5G, 256 ГБ", "SAMSUNG", "smartphones", 4_489_000, "phone", "Белый", "Версия Galaxy A36 в белом цвете с 8 ГБ оперативной памяти и накопителем на 256 ГБ. Модель поддерживает две SIM-карты.", [
    { label: "Экран", value: "Super AMOLED · 6,7 дюйма · 120 Гц" }, { label: "Память", value: "8 / 256 ГБ" }, { label: "Камеры", value: "50 + 8 + 5 Мп · фронтальная 12 Мп" }, { label: "Аккумулятор", value: "5 000 мА·ч" },
  ], { oldPrice: 4_909_000, rating: "4,6", reviews: 34 }),
  listing("orbit-book-flex", "lenovo-ideapad-slim-3-16iru8", "Lenovo IdeaPad Slim 3 16IRU8, Core i5 · 8/256 ГБ", "LENOVO", "computers", 7_986_000, "laptop", "Серый", "16-дюймовый IdeaPad с процессором Intel Core i5-1335U, 8 ГБ DDR5 и SSD на 256 ГБ.", [
    { label: "Экран", value: "16 дюймов · Full HD · IPS" }, { label: "Процессор", value: "Intel Core i5-1335U" }, { label: "Оперативная память", value: "8 ГБ DDR5" }, { label: "Накопитель", value: "SSD · 256 ГБ" },
  ], { rating: "4,7", reviews: 29, label: "Для поездок" }),
  listing("orbit-screen-studio", "samsung-odyssey-g5-27", "Samsung Odyssey G5 G50SF, 27″", "SAMSUNG", "computers", 7_802_000, "monitor", "Чёрный", "27-дюймовый OLED-монитор с разрешением QHD, частотой 180 Гц и интерфейсами HDMI и DisplayPort.", [
    { label: "Диагональ", value: "27 дюймов" }, { label: "Разрешение", value: "QHD · 2560 × 1440" }, { label: "Частота обновления", value: "180 Гц" }, { label: "Матрица", value: "OLED" },
  ], { rating: "4,8", reviews: 17 }),
  listing("tono-buds-pro", "samsung-galaxy-buds2", "Samsung Galaxy Buds2", "SAMSUNG", "audio", 1_285_000, "headphones", "Графитовый", "Компактные беспроводные внутриканальные наушники с активным шумоподавлением, микрофоном и Bluetooth-подключением.", [
    { label: "Конструкция", value: "Внутриканальные" }, { label: "Шумоподавление", value: "Есть" }, { label: "Подключение", value: "Bluetooth" }, { label: "Микрофон", value: "Есть" },
  ], { rating: "4,8", reviews: 67 }),
  listing("viewpoint-43", "artel-a43puch010-tv", "Artel A43PUCH010, 43″", "ARTEL", "audio", 2_962_000, "tv", "Чёрный", "Телевизор с диагональю 43 дюйма, разрешением 4K UHD и функциями Smart TV.", [
    { label: "Диагональ", value: "43 дюйма" }, { label: "Разрешение", value: "4K UHD · 3840 × 2160" }, { label: "Платформа", value: "Smart TV" }, { label: "Частота обновления", value: "60 Гц" },
  ], { oldPrice: 4_209_000, rating: "4,6", reviews: 21 }),
  listing("sfera-robot-r2", "xiaomi-robot-vacuum-x20-pro", "Xiaomi Robot Vacuum X20 Pro EU", "XIAOMI", "home", 8_645_000, "vacuum", "Белый", "Робот-пылесос с сухой и влажной уборкой, мощностью всасывания до 7000 Па и управлением со смартфона.", [
    { label: "Уборка", value: "Сухая и влажная" }, { label: "Мощность всасывания", value: "7 000 Па" }, { label: "Пылесборник", value: "Контейнер · 0,3 л" }, { label: "Управление", value: "Приложение и кнопки на корпусе" },
  ], { oldPrice: 9_100_000, rating: "4,7", reviews: 44, label: "Новинка" }),
  listing("sfera-clean-handheld", "artel-vcc0220-vacuum", "Artel VCC 0220", "ARTEL", "home", 1_288_000, "vacuum", "Чёрный", "Пылесос для сухой уборки с контейнером для пыли, фильтром HEPA и сетевым питанием.", [
    { label: "Тип уборки", value: "Сухая" }, { label: "Потребляемая мощность", value: "2 000 Вт" }, { label: "Мощность всасывания", value: "430 Вт" }, { label: "Фильтр", value: "HEPA" },
  ], { rating: "4,5", reviews: 16 }),
  listing("kompakt-blend-800", "philips-na120-00-air-fryer", "Philips NA120/00", "PHILIPS", "kitchen", 1_860_000, "airfryer", "Чёрный", "Аэрогриль с механическим управлением, антипригарной рабочей поверхностью и защитой от перегрева.", [
    { label: "Мощность", value: "1 500 Вт" }, { label: "Максимальная температура", value: "200 °C" }, { label: "Управление", value: "Механическое" }, { label: "Рабочая поверхность", value: "Антипригарная" },
  ], { rating: "4,7", reviews: 36 }),
  listing("kompakt-grill-3", "xiaomi-dual-zone-air-fryer-10l", "Xiaomi Dual Zone Air Fryer 10L EU", "XIAOMI", "kitchen", 2_450_000, "airfryer", "Чёрный", "Аэрогриль с двумя зонами приготовления, сенсорным управлением и антипригарной поверхностью.", [
    { label: "Объём", value: "10 л · 2 зоны" }, { label: "Мощность", value: "2 700 Вт" }, { label: "Максимальная температура", value: "230 °C" }, { label: "Управление", value: "Сенсорное" },
  ], { rating: "4,8", reviews: 25 }),

  // Smartphones, tablets and wearables
  listing("samsung-galaxy-a17", "samsung-galaxy-a17-128-black", "Samsung Galaxy A17, 128 ГБ", "SAMSUNG", "smartphones", 2_699_000, "phone", "Чёрный", "Доступный смартфон Galaxy с большим экраном, памятью 128 ГБ и поддержкой двух SIM-карт.", [
    { label: "Экран", value: "6,7 дюйма · Super AMOLED" }, { label: "Память", value: "128 ГБ" }, { label: "Связь", value: "4G · Dual SIM" }, { label: "Платформа", value: "Android" },
  ]),
  listing("samsung-galaxy-a57", "samsung-galaxy-a57-256-gray", "Samsung Galaxy A57, 256 ГБ", "SAMSUNG", "smartphones", 5_828_000, "phone", "Серый", "Смартфон среднего класса с накопителем 256 ГБ и большим AMOLED-дисплеем для фото, видео и повседневных приложений.", [
    { label: "Экран", value: "Super AMOLED" }, { label: "Память", value: "256 ГБ" }, { label: "Связь", value: "5G · Dual SIM" }, { label: "Платформа", value: "Android" },
  ], { label: "Новинка" }),
  listing("samsung-galaxy-s26-ultra", "samsung-galaxy-s26-ultra-12-256-black", "Samsung Galaxy S26 Ultra, 12/256 ГБ", "SAMSUNG", "smartphones", 14_766_000, "phone", "Чёрный", "Флагманская модель Galaxy с большим экраном, 12 ГБ оперативной памяти и встроенным накопителем на 256 ГБ.", [
    { label: "Экран", value: "Dynamic AMOLED 2X" }, { label: "Память", value: "12 / 256 ГБ" }, { label: "Связь", value: "5G · Dual SIM" }, { label: "Платформа", value: "Android" },
  ], { label: "Флагман" }),
  listing("redmi-note-14-pro-plus", "xiaomi-redmi-note-14-pro-plus-5g-8-256-blue", "Xiaomi Redmi Note 14 Pro+ 5G, 8/256 ГБ", "XIAOMI", "smartphones", 5_674_000, "phone", "Голубой", "Redmi Note 14 Pro+ сочетает 5G, AMOLED-экран и конфигурацию памяти 8/256 ГБ.", [
    { label: "Экран", value: "AMOLED · 6,67 дюйма" }, { label: "Память", value: "8 / 256 ГБ" }, { label: "Связь", value: "5G · Dual SIM" }, { label: "Платформа", value: "Android · HyperOS" },
  ]),
  listing("redmi-note-14-pro-purple", "xiaomi-redmi-note-14-pro-8-256-purple", "Xiaomi Redmi Note 14 Pro, 8/256 ГБ", "XIAOMI", "smartphones", 4_095_000, "phone", "Фиолетовый", "Версия Redmi Note 14 Pro с 8 ГБ оперативной памяти и накопителем 256 ГБ.", [
    { label: "Экран", value: "AMOLED · 6,67 дюйма" }, { label: "Память", value: "8 / 256 ГБ" }, { label: "Процессор", value: "MediaTek Helio G100 Ultra" }, { label: "Платформа", value: "Android" },
  ]),
  listing("redmi-15c", "xiaomi-redmi-15c-8-256-blue", "Xiaomi Redmi 15C, 8/256 ГБ", "XIAOMI", "smartphones", 2_419_000, "phone", "Голубой", "Практичная модель Redmi с большим запасом памяти и ярким дисплеем.", [
    { label: "Экран", value: "6,9 дюйма" }, { label: "Память", value: "8 / 256 ГБ" }, { label: "Связь", value: "4G · Dual SIM" }, { label: "Платформа", value: "Android · HyperOS" },
  ]),
  listing("xiaomi-pad-8", "xiaomi-pad-8-8-128-gray", "Xiaomi Pad 8, 8/128 ГБ", "XIAOMI", "smartphones", 6_964_000, "phone", "Серый", "Планшет для чтения, видео и работы с приложениями на большом экране.", [
    { label: "Экран", value: "11 дюймов" }, { label: "Память", value: "8 / 128 ГБ" }, { label: "Подключение", value: "Wi-Fi" }, { label: "Платформа", value: "Android · HyperOS" },
  ]),
  listing("xiaomi-pad-7", "xiaomi-pad-7-8-256-gray", "Xiaomi Pad 7, 8/256 ГБ", "XIAOMI", "smartphones", 6_500_000, "phone", "Серый", "Планшет с экраном высокого разрешения и накопителем 256 ГБ для мультимедиа и многозадачности.", [
    { label: "Экран", value: "11,2 дюйма · 3.2K" }, { label: "Память", value: "8 / 256 ГБ" }, { label: "Подключение", value: "Wi-Fi" }, { label: "Платформа", value: "Android · HyperOS" },
  ]),
  listing("samsung-galaxy-tab-a11-plus", "samsung-galaxy-tab-a11-plus-6-128-gray", "Samsung Galaxy Tab A11+, 6/128 ГБ", "SAMSUNG", "smartphones", 3_415_000, "phone", "Серый", "Планшет Samsung с 11-дюймовым экраном и памятью 128 ГБ для дома, поездок и видеозвонков.", [
    { label: "Экран", value: "11 дюймов · TFT" }, { label: "Память", value: "6 / 128 ГБ" }, { label: "Процессор", value: "MediaTek Dimensity 7300" }, { label: "Связь", value: "5G" },
  ]),
  listing("xiaomi-band-9", "xiaomi-band-9", "Xiaomi Smart Band 9", "XIAOMI", "smartphones", 813_000, "watch", "Чёрный", "Фитнес-браслет с AMOLED-экраном, отслеживанием активности и совместимостью с iOS и Android.", [
    { label: "Экран", value: "AMOLED · 192 × 490" }, { label: "Совместимость", value: "iOS и Android" }, { label: "Связь", value: "Bluetooth" }, { label: "Ремешок", value: "TPU" },
  ]),
  listing("samsung-galaxy-watch-5-pro", "samsung-galaxy-watch-5-pro-45-silver", "Samsung Galaxy Watch 5 Pro, 45 мм", "SAMSUNG", "smartphones", 3_211_000, "watch", "Серебристый", "Умные часы с круглым корпусом, GPS и поддержкой уведомлений со смартфона.", [
    { label: "Экран", value: "AMOLED" }, { label: "Размер корпуса", value: "45 мм" }, { label: "Связь", value: "Bluetooth · Wi-Fi · GPS" }, { label: "Совместимость", value: "Android" },
  ]),

  // Laptops and computers
  listing("asus-vivobook-x1504za", "asus-vivobook-x1504za-i5-8-512", "ASUS Vivobook X1504ZA, Core i5 · 8/512 ГБ", "ASUS", "computers", 8_248_000, "laptop", "Синий", "Универсальный 15,6-дюймовый ноутбук с процессором Core i5 и SSD на 512 ГБ.", [
    { label: "Экран", value: "15,6 дюйма · Full HD · IPS" }, { label: "Процессор", value: "Intel Core i5-1335U" }, { label: "Оперативная память", value: "8 ГБ" }, { label: "Накопитель", value: "SSD · 512 ГБ" },
  ]),
  listing("asus-vivobook-x1505va", "asus-vivobook-x1505va-oled-i5-16-512", "ASUS Vivobook X1505VA OLED, Core i5 · 16/512 ГБ", "ASUS", "computers", 9_262_500, "laptop", "Серый", "Vivobook с OLED-дисплеем Full HD, процессором Core i5 и 16 ГБ оперативной памяти.", [
    { label: "Экран", value: "15,6 дюйма · OLED · Full HD" }, { label: "Процессор", value: "Intel Core i5-13420H" }, { label: "Оперативная память", value: "16 ГБ" }, { label: "Накопитель", value: "SSD · 512 ГБ" },
  ]),
  listing("asus-vivobook-x1502va", "asus-vivobook-x1502va-i7-16-512", "ASUS Vivobook X1502VA, Core i7 · 16/512 ГБ", "ASUS", "computers", 9_262_500, "laptop", "Синий", "Ноутбук с Core i7, 16 ГБ памяти и SSD на 512 ГБ для нескольких рабочих задач одновременно.", [
    { label: "Экран", value: "15,6 дюйма · Full HD · IPS" }, { label: "Процессор", value: "Intel Core i7-13620H" }, { label: "Оперативная память", value: "16 ГБ DDR4" }, { label: "Накопитель", value: "SSD · 512 ГБ" },
  ]),
  listing("asus-vivobook-k3704va", "asus-vivobook-k3704va-i5-16-512", "ASUS Vivobook K3704VA, 17,3″ · Core i5", "ASUS", "computers", 9_571_250, "laptop", "Серый", "Модель с увеличенным 17,3-дюймовым экраном и конфигурацией памяти 16/512 ГБ.", [
    { label: "Экран", value: "17,3 дюйма · Full HD" }, { label: "Процессор", value: "Intel Core i5-13500H" }, { label: "Оперативная память", value: "16 ГБ DDR4" }, { label: "Накопитель", value: "SSD · 512 ГБ" },
  ]),
  listing("asus-tuf-fx507", "asus-tuf-fx507-i5-rtx3050", "ASUS TUF Gaming FX507, Core i5 · RTX 3050", "ASUS", "computers", 12_262_000, "laptop", "Чёрный", "Игровой ноутбук с экраном 144 Гц и дискретной графикой GeForce RTX 3050.", [
    { label: "Экран", value: "15,6 дюйма · Full HD · 144 Гц" }, { label: "Процессор", value: "Intel Core i5-12500H" }, { label: "Оперативная память", value: "16 ГБ" }, { label: "Графика", value: "NVIDIA GeForce RTX 3050 · 4 ГБ" },
  ]),
  listing("asus-rog-zephyrus", "asus-rog-zephyrus-i7-rtx4050", "ASUS ROG Zephyrus, Core i7 · RTX 4050", "ASUS", "computers", 22_935_000, "laptop", "Чёрный", "Компактный игровой ноутбук с экраном WQXGA и дискретной графикой серии RTX.", [
    { label: "Экран", value: "16 дюймов · WQXGA" }, { label: "Процессор", value: "Intel Core i7-12700H" }, { label: "Оперативная память", value: "16 ГБ DDR4" }, { label: "Графика", value: "NVIDIA GeForce RTX 4050" },
  ]),
  listing("lenovo-loq-16", "lenovo-loq-i7-16-1tb-rtx4060", "Lenovo LOQ, Core i7 · RTX 4060", "LENOVO", "computers", 15_988_000, "laptop", "Серый", "Игровая модель Lenovo с экраном 16 дюймов, быстрым SSD и графикой RTX 4060.", [
    { label: "Экран", value: "16 дюймов · WQXGA · 165 Гц" }, { label: "Процессор", value: "Intel Core i7-13620H" }, { label: "Оперативная память", value: "16 ГБ DDR5" }, { label: "Графика", value: "NVIDIA GeForce RTX 4060 · 8 ГБ" },
  ]),
  listing("lenovo-ideapad-gaming-3", "lenovo-ideapad-gaming-3-ryzen5-rtx2050", "Lenovo IdeaPad Gaming 3, Ryzen 5 · RTX 2050", "LENOVO", "computers", 9_175_000, "laptop", "Чёрный", "Ноутбук для игр и графических задач с экраном Full HD и дискретной графикой GeForce RTX.", [
    { label: "Экран", value: "15,6 дюйма · Full HD · IPS" }, { label: "Процессор", value: "AMD Ryzen 5 5500H" }, { label: "Оперативная память", value: "8 ГБ DDR4" }, { label: "Графика", value: "NVIDIA GeForce RTX 2050 · 4 ГБ" },
  ]),
  listing("macbook-air-m2", "apple-macbook-air-13-m2-16-512", "Apple MacBook Air 13″, M2 · 16/512 ГБ", "APPLE", "computers", 24_970_000, "laptop", "Полночь", "Тонкий ноутбук Apple на чипе M2 с 16 ГБ объединённой памяти и SSD на 512 ГБ.", [
    { label: "Экран", value: "13,6 дюйма · Liquid Retina" }, { label: "Процессор", value: "Apple M2" }, { label: "Память", value: "16 ГБ" }, { label: "Накопитель", value: "SSD · 512 ГБ" },
  ]),

  // TVs and audio
  listing("samsung-tv-du7100", "samsung-ue55du7100uxuz-55", "Samsung UE55DU7100, 55″", "SAMSUNG", "audio", 7_599_000, "tv", "Чёрный", "Телевизор Samsung с диагональю 55 дюймов, разрешением 4K и Smart TV.", [
    { label: "Диагональ", value: "55 дюймов" }, { label: "Разрешение", value: "4K UHD · 3840 × 2160" }, { label: "Платформа", value: "Tizen · Smart TV" }, { label: "Частота обновления", value: "60 Гц" },
  ]),
  listing("artel-tv-a43nfch001", "artel-a43nfch001-43", "Artel A43NFCH001, 43″", "ARTEL", "audio", 2_530_000, "tv", "Чёрный", "Телевизор Artel с Full HD-экраном, Smart TV и подсветкой Direct LED.", [
    { label: "Диагональ", value: "43 дюйма" }, { label: "Разрешение", value: "Full HD · 1920 × 1080" }, { label: "Платформа", value: "Smart TV" }, { label: "Частота обновления", value: "60 Гц" },
  ]),
  listing("lg-ua7500-55", "lg-55ua75009la-4k", "LG UHD AI 4K 55UA75009LA, 55″", "LG", "audio", 6_999_000, "tv", "Чёрный", "55-дюймовый телевизор LG с разрешением 4K, Smart TV и платформой webOS.", [
    { label: "Диагональ", value: "55 дюймов" }, { label: "Разрешение", value: "4K UHD" }, { label: "Платформа", value: "webOS · Smart TV" }, { label: "Технология экрана", value: "LED" },
  ]),
  listing("lg-nanocell-55", "lg-55nano80a6b-nanocell", "LG NanoCell AI NANO80, 55″", "LG", "audio", 7_432_000, "tv", "Чёрный", "Телевизор NanoCell с 4K-экраном и webOS для фильмов и потоковых приложений.", [
    { label: "Диагональ", value: "55 дюймов" }, { label: "Разрешение", value: "4K UHD · 3840 × 2160" }, { label: "Платформа", value: "webOS" }, { label: "Технология экрана", value: "NanoCell" },
  ]),
  listing("lg-qned-55", "lg-55qned70a6a-qned", "LG QNED AI 4K 55QNED70A6A, 55″", "LG", "audio", 8_923_000, "tv", "Чёрный", "Телевизор QNED с 4K-разрешением и Smart TV на платформе webOS.", [
    { label: "Диагональ", value: "55 дюймов" }, { label: "Разрешение", value: "4K UHD" }, { label: "Платформа", value: "webOS · Smart TV" }, { label: "Технология экрана", value: "QNED" },
  ]),
  listing("avalon-tv-b55", "avalon-b55mua800-55", "Avalon B55MUA800, 55″", "AVALON", "audio", 4_868_000, "tv", "Чёрный", "Телевизор с экраном 55 дюймов и Smart TV для просмотра видео и эфирных каналов.", [
    { label: "Диагональ", value: "55 дюймов" }, { label: "Разрешение", value: "4K UHD" }, { label: "Платформа", value: "Smart TV" }, { label: "Подключение", value: "HDMI · USB · Wi-Fi" },
  ]),
  listing("lg-oled-c5-55", "lg-oled55c5rla-c5-55", "LG OLED C5 evo AI 4K, 55″", "LG", "audio", 21_536_000, "tv", "Чёрный", "Премиальный OLED-телевизор LG с разрешением 4K и webOS.", [
    { label: "Диагональ", value: "55 дюймов" }, { label: "Разрешение", value: "4K UHD" }, { label: "Платформа", value: "webOS" }, { label: "Технология экрана", value: "OLED evo" },
  ], { label: "OLED" }),
  listing("sony-wh-ch520", "sony-wh-ch520-black", "Sony WH-CH520", "SONY", "audio", 706_000, "headphones", "Чёрный", "Лёгкие накладные Bluetooth-наушники со встроенным микрофоном для звонков и музыки.", [
    { label: "Конструкция", value: "Накладные" }, { label: "Подключение", value: "Bluetooth 5.2" }, { label: "Микрофон", value: "Есть" }, { label: "Частотный диапазон", value: "20 Гц – 20 кГц" },
  ]),
  listing("sony-wh1000xm5", "sony-wh-1000xm5-black", "Sony WH-1000XM5", "SONY", "audio", 4_305_000, "headphones", "Чёрный", "Полноразмерные беспроводные наушники Sony с активным шумоподавлением.", [
    { label: "Конструкция", value: "Полноразмерные" }, { label: "Подключение", value: "Bluetooth 5.3" }, { label: "Шумоподавление", value: "Активное" }, { label: "Микрофон", value: "Есть" },
  ]),
  listing("samsung-buds-fe-white", "samsung-galaxy-buds-fe-white", "Samsung Galaxy Buds FE", "SAMSUNG", "audio", 1_077_000, "headphones", "Белый", "Компактные TWS-наушники с активным шумоподавлением и зарядным кейсом.", [
    { label: "Конструкция", value: "Внутриканальные · TWS" }, { label: "Шумоподавление", value: "Активное" }, { label: "Связь", value: "Bluetooth" }, { label: "Микрофон", value: "Есть" },
  ]),
  listing("jbl-charge-5", "jbl-charge-5-bluetooth", "JBL Charge 5", "JBL", "audio", 1_762_000, "headphones", "Чёрный", "Портативная Bluetooth-колонка JBL с защитой от брызг для дома и поездок.", [
    { label: "Тип", value: "Портативная колонка" }, { label: "Подключение", value: "Bluetooth" }, { label: "Питание", value: "Аккумулятор" }, { label: "Защита", value: "Влагозащищённый корпус" },
  ]),
  listing("jbl-partybox-110", "jbl-partybox-110", "JBL PartyBox 110", "JBL", "audio", 6_593_000, "headphones", "Чёрный", "Портативная акустическая система с мощным звучанием, световыми эффектами и Bluetooth-подключением.", [
    { label: "Тип", value: "Портативная аудиосистема" }, { label: "Подключение", value: "Bluetooth" }, { label: "Питание", value: "Сеть и аккумулятор" }, { label: "Функции", value: "Световые эффекты" },
  ]),

  // Cleaning appliances
  listing("xiaomi-vacuum-s40c", "xiaomi-robot-vacuum-s40c-eu", "Xiaomi Robot Vacuum S40C EU", "XIAOMI", "home", 3_157_000, "vacuum", "Белый", "Робот-пылесос с сухой и влажной уборкой и управлением через приложение.", [
    { label: "Тип", value: "Робот-пылесос" }, { label: "Уборка", value: "Сухая и влажная" }, { label: "Управление", value: "Приложение" }, { label: "Питание", value: "Аккумулятор" },
  ]),
  listing("xiaomi-vacuum-h40", "xiaomi-robot-vacuum-h40-eu", "Xiaomi Robot Vacuum H40 EU", "XIAOMI", "home", 5_014_000, "vacuum", "Белый", "Робот для сухой и влажной уборки с док-станцией и управлением со смартфона.", [
    { label: "Тип", value: "Робот-пылесос" }, { label: "Уборка", value: "Сухая и влажная" }, { label: "Управление", value: "Приложение и кнопки" }, { label: "Питание", value: "Аккумулятор" },
  ]),
  listing("xiaomi-vacuum-s20-black", "xiaomi-robot-vacuum-s20-black-eu", "Xiaomi Robot Vacuum S20, Black EU", "XIAOMI", "home", 3_157_000, "vacuum", "Чёрный", "Робот-пылесос для регулярной уборки пола с поддержкой влажной уборки.", [
    { label: "Тип", value: "Робот-пылесос" }, { label: "Уборка", value: "Сухая и влажная" }, { label: "Управление", value: "Приложение" }, { label: "Цвет", value: "Чёрный" },
  ]),
  listing("xiaomi-vacuum-x20-plus", "xiaomi-robot-vacuum-x20-plus-eu", "Xiaomi Robot Vacuum X20+ EU", "XIAOMI", "home", 8_171_000, "vacuum", "Белый", "Робот-пылесос с базой самоочистки и функцией влажной уборки.", [
    { label: "Тип", value: "Робот-пылесос с базой" }, { label: "Уборка", value: "Сухая и влажная" }, { label: "Управление", value: "Приложение" }, { label: "Питание", value: "Аккумулятор" },
  ]),
  listing("dreame-x50-ultra", "dreame-x50-ultra-complete", "Dreame X50 Ultra Complete", "DREAME", "home", 16_500_000, "vacuum", "Белый", "Робот-пылесос Dreame с автоматической базой и режимами сухой и влажной уборки.", [
    { label: "Тип", value: "Робот-пылесос с базой" }, { label: "Уборка", value: "Сухая и влажная" }, { label: "Управление", value: "Приложение" }, { label: "Комплектация", value: "Complete" },
  ]),
  listing("polaris-pvcr3600", "polaris-pvcr-3600-wifi-iq-home", "Polaris PVCR 3600 Wi-Fi IQ Home", "POLARIS", "home", 1_899_000, "vacuum", "Белый", "Робот-пылесос с Wi-Fi-подключением и управлением через приложение IQ Home.", [
    { label: "Тип", value: "Робот-пылесос" }, { label: "Управление", value: "Wi-Fi · приложение IQ Home" }, { label: "Уборка", value: "Сухая и влажная" }, { label: "Питание", value: "Аккумулятор" },
  ]),
  listing("karcher-rcv5", "karcher-rcv-5", "Kärcher RCV 5", "KÄRCHER", "home", 8_200_000, "vacuum", "Белый", "Робот для автоматической уборки помещений с управлением через приложение.", [
    { label: "Тип", value: "Робот-пылесос" }, { label: "Уборка", value: "Сухая и влажная" }, { label: "Управление", value: "Приложение" }, { label: "Питание", value: "Аккумулятор" },
  ]),
  listing("samsung-vcc882", "samsung-vcc882fh3p-uz", "Samsung VCC882FH3P/UZ", "SAMSUNG", "home", 2_245_000, "vacuum", "Чёрный", "Проводной пылесос для сухой уборки с контейнером для сбора пыли.", [
    { label: "Тип", value: "Контейнерный пылесос" }, { label: "Уборка", value: "Сухая" }, { label: "Питание", value: "От сети" }, { label: "Управление", value: "На корпусе" },
  ]),
  listing("tefal-tw7b11ea", "tefal-x-trem-cyclonic-max-tw7b11ea", "Tefal X-Trem Cyclonic Max TW7B11EA", "TEFAL", "home", 3_216_000, "vacuum", "Чёрный", "Пылесос с циклонной системой фильтрации для уборки дома.", [
    { label: "Тип", value: "Контейнерный пылесос" }, { label: "Уборка", value: "Сухая" }, { label: "Питание", value: "От сети" }, { label: "Фильтрация", value: "Циклонная" },
  ]),

  // Kitchen appliances
  listing("nutribullet-nba071b", "nutribullet-xxl-digital-air-fryer-nba071b", "Nutribullet XXL Digital Air Fryer NBA071B", "NUTRIBULLET", "kitchen", 1_399_000, "airfryer", "Чёрный", "Аэрогриль с цифровой панелью управления и большой чашей для приготовления нескольких порций.", [
    { label: "Тип", value: "Аэрогриль" }, { label: "Управление", value: "Цифровое" }, { label: "Питание", value: "От сети" }, { label: "Покрытие", value: "Антипригарное" },
  ]),
  listing("tefal-ey505d15", "tefal-easy-fry-ey505d15", "Tefal Easy Fry EY505D15", "TEFAL", "kitchen", 2_830_000, "airfryer", "Чёрный", "Аэрогриль с цифровым управлением для запекания и приготовления без большого количества масла.", [
    { label: "Тип", value: "Аэрогриль" }, { label: "Управление", value: "Цифровое" }, { label: "Мощность", value: "1 400 Вт" }, { label: "Покрытие", value: "Антипригарное" },
  ]),
  listing("tefal-dual-easy-fry", "tefal-dual-easy-fry-ey9428e0", "Tefal Dual Easy Fry EY9428E0", "TEFAL", "kitchen", 3_399_000, "airfryer", "Чёрный", "Аэрогриль с двумя зонами приготовления, чтобы готовить разные блюда одновременно.", [
    { label: "Тип", value: "Аэрогриль · две зоны" }, { label: "Объём", value: "Большая двухсекционная чаша" }, { label: "Управление", value: "Электронное" }, { label: "Покрытие", value: "Антипригарное" },
  ]),
  listing("braun-hf5055", "braun-multifry-5-hf5055ibk", "Braun MultiFry 5 HF5055IBK", "BRAUN", "kitchen", 1_999_000, "airfryer", "Чёрный", "Аэрогриль Braun с цифровым управлением и чашей для приготовления горячих блюд.", [
    { label: "Тип", value: "Аэрогриль" }, { label: "Управление", value: "Цифровое" }, { label: "Программы", value: "Автоматические режимы" }, { label: "Покрытие", value: "Антипригарное" },
  ]),
  listing("polaris-paf6006dw", "polaris-paf-6006dw", "Polaris PAF 6006DW", "POLARIS", "kitchen", 2_199_000, "airfryer", "Белый", "Аэрогриль Polaris с цифровой панелью управления и автоматическими программами приготовления.", [
    { label: "Тип", value: "Аэрогриль" }, { label: "Управление", value: "Цифровое" }, { label: "Программы", value: "Автоматические режимы" }, { label: "Питание", value: "От сети" },
  ]),
  listing("dreame-af30", "dreame-air-fryer-af30-white", "Dreame Air Fryer AF30", "DREAME", "kitchen", 2_326_000, "airfryer", "Белый", "Аэрогриль для приготовления, запекания и разогрева с настройкой времени и температуры.", [
    { label: "Тип", value: "Аэрогриль" }, { label: "Управление", value: "Электронное" }, { label: "Питание", value: "От сети" }, { label: "Покрытие", value: "Антипригарное" },
  ]),
  listing("artel-gt60a", "artel-gt-60a-electric-grill", "Artel GT-60A", "ARTEL", "kitchen", 1_184_000, "airfryer", "Чёрный", "Компактный электрогриль Artel для приготовления горячих бутербродов, мяса и овощей.", [
    { label: "Тип", value: "Электрогриль" }, { label: "Управление", value: "Механическое" }, { label: "Питание", value: "От сети" }, { label: "Поверхность", value: "Рифлёная" },
  ]),
  listing("bq-gr3005", "bq-gr3005-black-steel", "BQ GR3005 Black-Steel", "BQ", "kitchen", 446_000, "airfryer", "Чёрный / стальной", "Настольный электрогриль с антипригарной рабочей поверхностью.", [
    { label: "Тип", value: "Электрогриль" }, { label: "Управление", value: "Механическое" }, { label: "Питание", value: "От сети" }, { label: "Поверхность", value: "Антипригарная" },
  ]),
  listing("philips-na230", "philips-na230-00-air-fryer", "Philips NA230/00", "PHILIPS", "kitchen", 1_854_000, "airfryer", "Чёрный", "Аэрогриль Philips с цифровым управлением и программами приготовления горячих блюд.", [
    { label: "Тип", value: "Аэрогриль" }, { label: "Управление", value: "Цифровое" }, { label: "Питание", value: "От сети" }, { label: "Покрытие", value: "Антипригарное" },
  ]),
];

export const getProduct = (slug: string) => products.find((product) => product.slug === slug);
export const getCategory = (slug: string) => categories.find((category) => category.slug === slug);

export function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} сум`;
}
