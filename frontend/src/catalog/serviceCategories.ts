// Lightest-touch category grouping for the Barinoff price list.
//
// The `services` table has no category column, and adding one would mean a schema
// migration for a purely presentational grouping — so this is a static frontend map
// keyed by the service's real (verbatim) name from barinoffbarber.ru, matching the
// backend seed in `backend/src/db/index.ts`. If a service name ever doesn't match this
// map it still renders, just under "Другое", so nothing is ever silently hidden.

export const SERVICE_CATEGORY_ORDER = [
  'Стрижки',
  'Борода',
  'Бритьё и уход',
  'Комплексы',
  'Детские услуги',
  'Плетение',
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORY_ORDER)[number] | 'Другое';

const SERVICE_CATEGORY_BY_NAME: Record<string, ServiceCategory> = {
  // Стрижки
  'Мужская стрижка': 'Стрижки',
  'Стрижка машинкой под одну насадку': 'Стрижки',
  Окантовка: 'Стрижки',
  'Коррекция стрижки': 'Стрижки',
  'Укладка (мытьё головы + стайлинг)': 'Стрижки',
  'Скрабирование головы': 'Стрижки',
  // Борода
  'Моделирование бороды': 'Борода',
  'Стрижка бороды, усов': 'Борода',
  'Камуфляж бороды': 'Борода',
  // Бритьё и уход
  'Бритьё головы опасной бритвой': 'Бритьё и уход',
  'Королевское бритьё опасной бритвой': 'Бритьё и уход',
  'Уши + нос + брови + щёки + шея': 'Бритьё и уход',
  'Уши + нос + брови': 'Бритьё и уход',
  'Щёки + шея': 'Бритьё и уход',
  'Нос + уши': 'Бритьё и уход',
  Нос: 'Бритьё и уход',
  'Угольная очищающая маска для лица': 'Бритьё и уход',
  'Камуфляж седины': 'Бритьё и уход',
  // Комплексы
  'Стрижка + моделирование бороды': 'Комплексы',
  'Стрижка + угольная маска для лица': 'Комплексы',
  'Стрижка + королевское бритьё': 'Комплексы',
  'Комплекс: стрижка + моделирование бороды + химическая завивка': 'Комплексы',
  // Детские услуги
  'Детская стрижка (6–12 лет)': 'Детские услуги',
  'Папа + сын (до 12 лет)': 'Детские услуги',
  // Плетение
  Брейдинг: 'Плетение',
  Дреды: 'Плетение',
  Косы: 'Плетение',
  'Разные виды плетения': 'Плетение',
};

export function categoryForService(serviceName: string): ServiceCategory {
  return SERVICE_CATEGORY_BY_NAME[serviceName] ?? 'Другое';
}

export function groupServicesByCategory<T extends { name: string }>(
  services: T[],
): Array<{ category: ServiceCategory; services: T[] }> {
  const byCategory = new Map<ServiceCategory, T[]>();
  for (const service of services) {
    const category = categoryForService(service.name);
    const bucket = byCategory.get(category);
    if (bucket) {
      bucket.push(service);
    } else {
      byCategory.set(category, [service]);
    }
  }

  const orderedCategories: ServiceCategory[] = [...SERVICE_CATEGORY_ORDER, 'Другое'];
  return orderedCategories
    .filter((category) => byCategory.has(category))
    .map((category) => ({ category, services: byCategory.get(category)! }));
}
