import { Product, ProductCategory, Employee } from '../types';

export const categoryLabels: Record<ProductCategory, string> = {
  dairy: 'Молочная гастрономия',
  bakery: 'Хлебобулочные изделия',
  meat_sausage: 'Мясные изделия & Колбасы',
  grocery: 'Бакалейные товары',
  beverages: 'Напитки & Соки',
  confectionery: 'Кондитерские изделия',
  other: 'Прочие товары'
};

export const categoryColors: Record<ProductCategory, string> = {
  dairy: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/30',
  bakery: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/30',
  meat_sausage: 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/30',
  grocery: 'bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-900/30',
  beverages: 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-900/30',
  confectionery: 'bg-pink-50 dark:bg-pink-950/40 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-900/30',
  other: 'bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border-gray-200 dark:border-slate-700'
};

export const productTemplates = [
  { name: 'Молоко Мария-Ра 2.5%, 900 мл', category: 'dairy', barcode: '4607142210012', price: 69, shelfLifeDays: 7, location: 'Холодильник Ряд 1' },
  { name: 'Сметана Плавыч 15%, 350 г', category: 'dairy', barcode: '4607142210043', price: 95, shelfLifeDays: 14, location: 'Холодильник Ряд 2' },
  { name: 'Творог Модест детский 3.2%, 100 г', category: 'dairy', barcode: '4607142210050', price: 42, shelfLifeDays: 8, location: 'Холодильник Ряд 1' },
  { name: 'Батон Алтайский нарезанный, 350 г', category: 'bakery', barcode: '4607002340021', price: 34, shelfLifeDays: 3, location: 'Хлебная полка Ряд 1' },
  { name: 'Хлеб ржаной Мария-Ра, 400 г', category: 'bakery', barcode: '4607002340038', price: 29, shelfLifeDays: 3, location: 'Хлебная полка Ряд 1' },
  { name: 'Колбаса Докторская ГОСТ СПК, 400 г', category: 'meat_sausage', barcode: '4607123980112', price: 340, shelfLifeDays: 20, location: 'Холодильник Колбасы' },
  { name: 'Сардельки Свиные Барнаульский МК, 500 г', category: 'meat_sausage', barcode: '4607123980143', price: 290, shelfLifeDays: 15, location: 'Холодильник Колбасы' },
  { name: 'Рис Круглозерный Алтайская Сказка, 800 г', category: 'grocery', barcode: '4601230490012', price: 89, shelfLifeDays: 365, location: 'Бакалея Стеллаж 4' },
  { name: 'Вода минеральная Карачинская 1.5 л', category: 'beverages', barcode: '4605550010115', price: 45, shelfLifeDays: 180, location: 'Напитки Ряд 1' },
  { name: 'Шоколад Алёнка молочный, 90 г', category: 'confectionery', barcode: '4600120150221', price: 90, shelfLifeDays: 120, location: 'Шоколад Ряд 2' }
];

export const employees: Employee[] = [
  { id: '1', name: 'Копыл И.А.', role: 'Товаровед-кассир', avatarColor: 'bg-emerald-500' },
  { id: '2', name: 'Иванова А.С.', role: 'Директор магазина', avatarColor: 'bg-amber-500' },
  { id: '3', name: 'Федорова М.В.', role: 'Старший бухгалтер', avatarColor: 'bg-blue-500' },
  { id: '4', name: 'Васильев П.С.', role: 'Старший товаровед', avatarColor: 'bg-purple-500' },
  { id: '5', name: 'Смирнов А.В.', role: 'Товаровед-кассир', avatarColor: 'bg-teal-500' },
];

export const initialProducts: Product[] = [
  {
    id: '1',
    barcode: '4607142210012',
    name: 'Молоко Мария-Ра 2.5%, 900 мл',
    category: 'dairy',
    price: 69,
    quantity: 12,
    expirationDate: '2026-07-01',
    manufactureDate: '2026-06-25',
    status: 'expiring_soon',
    location: 'Холодильник Ряд 1',
    addedAt: '2026-06-26'
  },
  {
    id: '2',
    barcode: '4607142210050',
    name: 'Творог Модест детский 3.2%, 100 г',
    category: 'dairy',
    price: 42,
    quantity: 8,
    expirationDate: '2026-06-28',
    manufactureDate: '2026-06-20',
    status: 'expired',
    location: 'Холодильник Ряд 1',
    addedAt: '2026-06-21'
  },
  {
    id: '3',
    barcode: '4607002340021',
    name: 'Батон Алтайский нарезанный, 350 г',
    category: 'bakery',
    price: 34,
    quantity: 15,
    expirationDate: '2026-06-30',
    manufactureDate: '2026-06-27',
    status: 'expiring_soon',
    location: 'Хлебная полка Ряд 1',
    addedAt: '2026-06-28'
  },
  {
    id: '4',
    barcode: '4607002340038',
    name: 'Хлеб ржаной Мария-Ра, 400 г',
    category: 'bakery',
    price: 29,
    quantity: 5,
    expirationDate: '2026-06-29',
    manufactureDate: '2026-06-26',
    status: 'expired',
    location: 'Хлебная полка Ряд 1',
    addedAt: '2026-06-27'
  },
  {
    id: '5',
    barcode: '4607123980112',
    name: 'Колбаса Докторская ГОСТ СПК, 400 г',
    category: 'meat_sausage',
    price: 340,
    quantity: 6,
    expirationDate: '2026-07-01',
    manufactureDate: '2026-06-11',
    status: 'expiring_soon',
    location: 'Холодильник Колбасы',
    addedAt: '2026-06-12'
  },
  {
    id: '6',
    barcode: '4607123980143',
    name: 'Сардельки Свиные Барнаульский МК, 500 г',
    category: 'meat_sausage',
    price: 290,
    quantity: 10,
    expirationDate: '2026-07-15',
    manufactureDate: '2026-06-30',
    status: 'fresh',
    location: 'Холодильник Колбасы',
    addedAt: '2026-06-30'
  },
  {
    id: '7',
    barcode: '4607142210043',
    name: 'Сметана Плавыч 15%, 350 г',
    category: 'dairy',
    price: 95,
    quantity: 14,
    expirationDate: '2026-07-06',
    manufactureDate: '2026-06-22',
    status: 'fresh',
    location: 'Холодильник Ряд 2',
    addedAt: '2026-06-23'
  },
  {
    id: '8',
    barcode: '4600120150221',
    name: 'Шоколад Алёнка молочный, 90 г',
    category: 'confectionery',
    price: 90,
    quantity: 24,
    expirationDate: '2026-10-15',
    manufactureDate: '2026-06-15',
    status: 'fresh',
    location: 'Шоколад Ряд 2',
    addedAt: '2026-06-20'
  },
  {
    id: '9',
    barcode: '4601230490012',
    name: 'Рис Круглозерный Алтайская Сказка, 800 г',
    category: 'grocery',
    price: 89,
    quantity: 40,
    expirationDate: '2027-06-30',
    manufactureDate: '2026-06-30',
    status: 'fresh',
    location: 'Бакалея Стеллаж 4',
    addedAt: '2026-06-30'
  }
];
