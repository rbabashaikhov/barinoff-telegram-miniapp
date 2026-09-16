import type Database from 'better-sqlite3';

// Real Barinoff price list (barinoffbarber.ru, #price section, verbatim names and prices).
// `duration_minutes` is NOT published anywhere on the site — the booking engine requires a
// duration to build time slots, so each value below is a technical demo assumption based on
// typical service length, not a number Barinoff publishes. See README/report for the full list.
// "от NNNN ₽" prices are stored as their base number (NNNN) for the demo; the UI does not
// currently render an "от" prefix.
const SERVICES = [
  // Стрижки
  {
    name: 'Мужская стрижка',
    description: 'Классическая мужская стрижка. Категория: Стрижки.',
    duration_minutes: 60,
    price: 1800,
  },
  {
    name: 'Стрижка машинкой под одну насадку',
    description: 'Быстрая стрижка машинкой под одну насадку. Категория: Стрижки.',
    duration_minutes: 30,
    price: 1000,
  },
  {
    name: 'Окантовка',
    description: 'Окантовка контура стрижки. Категория: Стрижки.',
    duration_minutes: 20,
    price: 500,
  },
  {
    name: 'Коррекция стрижки',
    description: 'Коррекция ранее сделанной стрижки. Категория: Стрижки.',
    duration_minutes: 30,
    price: 800,
  },
  {
    name: 'Укладка (мытьё головы + стайлинг)',
    description: 'Мытьё головы и укладка стайлинговыми средствами. Категория: Стрижки.',
    duration_minutes: 20,
    price: 600,
  },
  {
    name: 'Скрабирование головы',
    description: 'Очищающий скраб для кожи головы. Категория: Стрижки.',
    duration_minutes: 15,
    price: 400,
  },
  // Борода
  {
    name: 'Моделирование бороды',
    description: 'Моделирование формы бороды. Категория: Борода.',
    duration_minutes: 45,
    price: 1200,
  },
  {
    name: 'Стрижка бороды, усов',
    description: 'Стрижка бороды и усов. Категория: Борода.',
    duration_minutes: 30,
    price: 800,
  },
  {
    name: 'Камуфляж бороды',
    description: 'Камуфляж седины в бороде. Категория: Борода.',
    duration_minutes: 45,
    price: 1200,
  },
  // Бритьё и уход
  {
    name: 'Бритьё головы опасной бритвой',
    description: 'Бритьё головы опасной бритвой. Категория: Бритьё и уход.',
    duration_minutes: 40,
    price: 1200,
  },
  {
    name: 'Королевское бритьё опасной бритвой',
    description: 'Королевское бритьё опасной бритвой с горячим полотенцем. Категория: Бритьё и уход.',
    duration_minutes: 60,
    price: 1500,
  },
  {
    name: 'Уши + нос + брови + щёки + шея',
    description: 'Комплексная обработка триммером: уши, нос, брови, щёки, шея. Категория: Бритьё и уход.',
    duration_minutes: 40,
    price: 1000,
  },
  {
    name: 'Уши + нос + брови',
    description: 'Обработка триммером: уши, нос, брови. Категория: Бритьё и уход.',
    duration_minutes: 25,
    price: 800,
  },
  {
    name: 'Щёки + шея',
    description: 'Обработка триммером: щёки и шея. Категория: Бритьё и уход.',
    duration_minutes: 20,
    price: 600,
  },
  {
    name: 'Нос + уши',
    description: 'Обработка триммером: нос и уши. Категория: Бритьё и уход.',
    duration_minutes: 20,
    price: 600,
  },
  {
    name: 'Нос',
    description: 'Обработка триммером: нос. Категория: Бритьё и уход.',
    duration_minutes: 15,
    price: 400,
  },
  {
    name: 'Угольная очищающая маска для лица',
    description: 'Угольная очищающая маска для лица. Категория: Бритьё и уход.',
    duration_minutes: 25,
    price: 650,
  },
  {
    name: 'Камуфляж седины',
    description: 'Камуфляж седины. Цена от 1200 ₽ на сайте Barinoff — здесь указана базовая стоимость. Категория: Бритьё и уход.',
    duration_minutes: 45,
    price: 1200,
  },
  // Комплексы
  {
    name: 'Стрижка + моделирование бороды',
    description: 'Комплекс: стрижка и моделирование бороды. Категория: Комплексы.',
    duration_minutes: 90,
    price: 2500,
  },
  {
    name: 'Стрижка + угольная маска для лица',
    description: 'Комплекс: стрижка и угольная маска для лица. Категория: Комплексы.',
    duration_minutes: 75,
    price: 2000,
  },
  {
    name: 'Стрижка + королевское бритьё',
    description: 'Комплекс: стрижка и королевское бритьё опасной бритвой. Категория: Комплексы.',
    duration_minutes: 100,
    price: 2800,
  },
  {
    name: 'Комплекс: стрижка + моделирование бороды + химическая завивка',
    description:
      'Стрижка, моделирование бороды и химическая завивка. Цена от 5000 ₽ на сайте Barinoff — здесь указана базовая стоимость. Категория: Комплексы.',
    duration_minutes: 150,
    price: 5000,
  },
  // Детские услуги
  {
    name: 'Детская стрижка (6–12 лет)',
    description: 'Стрижка для детей от 6 до 12 лет. Категория: Детские услуги.',
    duration_minutes: 45,
    price: 1300,
  },
  {
    name: 'Папа + сын (до 12 лет)',
    description: 'Стрижка для папы и сына (сыну до 12 лет). Категория: Детские услуги.',
    duration_minutes: 75,
    price: 2500,
  },
  // Плетение (только Полина)
  {
    name: 'Брейдинг',
    description: 'Брейдинг. Категория: Плетение. Выполняет Полина.',
    duration_minutes: 180,
    price: 8000,
  },
  {
    name: 'Дреды',
    description:
      'Плетение дредов. Цена от 6000 ₽ на сайте Barinoff — здесь указана базовая стоимость. Категория: Плетение. Выполняет Полина.',
    duration_minutes: 240,
    price: 6000,
  },
  {
    name: 'Косы',
    description:
      'Плетение кос. Цена от 6000 ₽ на сайте Barinoff — здесь указана базовая стоимость. Категория: Плетение. Выполняет Полина.',
    duration_minutes: 150,
    price: 6000,
  },
  {
    name: 'Разные виды плетения',
    description:
      'Другие виды плетения. Цена от 4000 ₽ на сайте Barinoff — здесь указана базовая стоимость. Категория: Плетение. Выполняет Полина.',
    duration_minutes: 120,
    price: 4000,
  },
] as const;

// Only these three names are confirmed on barinoffbarber.ru. The site gives no individual bios
// beyond "мастера высокого класса" for Алексей/Роман, and no public portrait photos for anyone —
// the UI intentionally uses initial-based avatar cards instead of fabricated stock photos.
const MASTERS = [
  {
    name: 'Алексей',
    role: 'Барбер',
    description: 'Стрижки, борода, бритьё и уход, комплексы, детские стрижки.',
    display_order: 1,
  },
  {
    name: 'Роман',
    role: 'Барбер',
    description: 'Стрижки, борода, бритьё и уход, комплексы, детские стрижки.',
    display_order: 2,
  },
  {
    name: 'Полина',
    role: 'Мастер по плетению',
    description: 'Брейдинг, дреды, косы и другие виды плетения.',
    display_order: 3,
  },
] as const;

/** weekday: 0 = Sunday … 6 = Saturday */
type HoursSpec = { weekday: number; start_time: string; end_time: string; active: number };

function hoursForDays(
  days: number[],
  start: string,
  end: string,
): HoursSpec[] {
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    start_time: start,
    end_time: end,
    active: days.includes(weekday) ? 1 : 0,
  }));
}

// Barinoff's real opening hours are not published per-master; these schedules are a demo
// assumption chosen to look like a plausible barbershop rota.
const MASTER_HOURS: Record<string, HoursSpec[]> = {
  Алексей: hoursForDays([1, 2, 3, 4, 5, 6], '10:00', '20:00'),
  Роман: hoursForDays([2, 3, 4, 5, 6, 0], '11:00', '21:00'),
  Полина: hoursForDays([3, 4, 5, 6, 0], '12:00', '20:00'),
};

const BARBER_SERVICE_NAMES = SERVICES.filter((s) => s.description.includes('Плетение') === false).map(
  (s) => s.name,
);
const BRAIDING_SERVICE_NAMES = SERVICES.filter((s) => s.description.includes('Категория: Плетение')).map(
  (s) => s.name,
);

const MASTER_SERVICE_NAMES: Record<string, readonly string[]> = {
  Алексей: BARBER_SERVICE_NAMES,
  Роман: BARBER_SERVICE_NAMES,
  Полина: BRAIDING_SERVICE_NAMES,
};

const DEMO_TELEGRAM_USER_ID = 999000001;
const OCCUPIED_TELEGRAM_USER_ID = 999000002;

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function findFutureWeekday(now: Date, weekday: number, minDaysAhead = 7): string {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + minDaysAhead);
  while (date.getDay() !== weekday) {
    date.setDate(date.getDate() + 1);
  }
  return toDateString(date);
}

function upsertClient(
  db: Database.Database,
  user: { telegramUserId: number; username: string; firstName: string; lastName: string },
): number {
  const existing = db
    .prepare('SELECT id FROM clients WHERE telegram_user_id = ?')
    .get(user.telegramUserId) as { id: number } | undefined;
  if (existing) return existing.id;
  const inserted = db
    .prepare(
      `
      INSERT INTO clients (telegram_user_id, username, first_name, last_name)
      VALUES (?, ?, ?, ?)
    `,
    )
    .run(user.telegramUserId, user.username, user.firstName, user.lastName);
  return Number(inserted.lastInsertRowid);
}

export function seed(db: Database.Database, now = new Date()): void {
  const serviceCount = db.prepare('SELECT COUNT(*) AS count FROM services').get() as {
    count: number;
  };

  if (serviceCount.count === 0) {
    const insertService = db.prepare(`
      INSERT INTO services (name, description, duration_minutes, price, active)
      VALUES (@name, @description, @duration_minutes, @price, 1)
    `);
    const insertMany = db.transaction(() => {
      for (const service of SERVICES) {
        insertService.run(service);
      }
    });
    insertMany();
  }

  const masterCount = db.prepare('SELECT COUNT(*) AS count FROM masters').get() as {
    count: number;
  };

  if (masterCount.count === 0) {
    const insertMaster = db.prepare(`
      INSERT INTO masters (name, role, description, active, display_order)
      VALUES (@name, @role, @description, 1, @display_order)
    `);
    const insertMany = db.transaction(() => {
      for (const master of MASTERS) {
        insertMaster.run(master);
      }
    });
    insertMany();
  }

  const linkCount = db.prepare('SELECT COUNT(*) AS count FROM master_services').get() as {
    count: number;
  };

  if (linkCount.count === 0) {
    const insertLink = db.prepare(
      'INSERT INTO master_services (master_id, service_id) VALUES (?, ?)',
    );
    const masters = db.prepare('SELECT id, name FROM masters').all() as Array<{
      id: number;
      name: string;
    }>;
    const services = db.prepare('SELECT id, name FROM services').all() as Array<{
      id: number;
      name: string;
    }>;
    const serviceIdByName = new Map(services.map((service) => [service.name, service.id]));

    db.transaction(() => {
      for (const master of masters) {
        const names = MASTER_SERVICE_NAMES[master.name];
        if (!names) continue;
        for (const name of names) {
          const serviceId = serviceIdByName.get(name);
          if (serviceId) insertLink.run(master.id, serviceId);
        }
      }
    })();
  }

  const hoursCount = db
    .prepare('SELECT COUNT(*) AS count FROM working_hours')
    .get() as { count: number };

  if (hoursCount.count === 0) {
    const insertHours = db.prepare(`
      INSERT INTO working_hours (master_id, weekday, start_time, end_time, active)
      VALUES (@master_id, @weekday, @start_time, @end_time, @active)
    `);
    const masters = db.prepare('SELECT id, name FROM masters').all() as Array<{
      id: number;
      name: string;
    }>;

    const insertMany = db.transaction(() => {
      for (const master of masters) {
        const schedule = MASTER_HOURS[master.name];
        if (!schedule) continue;
        for (const row of schedule) {
          insertHours.run({ master_id: master.id, ...row });
        }
      }
    });
    insertMany();
  }

  const defaultMaster = db
    .prepare('SELECT id FROM masters ORDER BY display_order, id LIMIT 1')
    .get() as { id: number } | undefined;

  if (defaultMaster) {
    db.prepare(
      `UPDATE appointments SET master_id = ? WHERE master_id IS NULL`,
    ).run(defaultMaster.id);
    db.prepare(
      `UPDATE blocked_slots SET master_id = ? WHERE master_id IS NULL`,
    ).run(defaultMaster.id);
  }

  const friday = findFutureWeekday(now, 5, 7);
  const alexey = db.prepare(`SELECT id FROM masters WHERE name = 'Алексей'`).get() as
    | { id: number }
    | undefined;
  const roman = db.prepare(`SELECT id FROM masters WHERE name = 'Роман'`).get() as
    | { id: number }
    | undefined;
  const haircut = db.prepare(`SELECT id FROM services WHERE name = 'Мужская стрижка'`).get() as
    | { id: number }
    | undefined;

  const blockedCount = db.prepare('SELECT COUNT(*) AS count FROM blocked_slots').get() as {
    count: number;
  };
  if (blockedCount.count === 0 && alexey) {
    db.prepare(
      `
      INSERT INTO blocked_slots (master_id, blocked_date, start_time, end_time, reason)
      VALUES (?, ?, '15:00', '16:00', 'Обед')
    `,
    ).run(alexey.id, friday);
  }

  if (!haircut || !alexey || !roman) return;

  const demoClientId = upsertClient(db, {
    telegramUserId: DEMO_TELEGRAM_USER_ID,
    username: 'demo_client',
    firstName: 'Demo',
    lastName: 'Client',
  });
  const occupiedClientId = upsertClient(db, {
    telegramUserId: OCCUPIED_TELEGRAM_USER_ID,
    username: 'occupied_client',
    firstName: 'Иван',
    lastName: 'Петров',
  });

  const demoAppointments = db
    .prepare('SELECT COUNT(*) AS count FROM appointments WHERE client_id = ?')
    .get(demoClientId) as { count: number };
  if (demoAppointments.count === 0) {
    db.prepare(
      `
      INSERT INTO appointments (
        client_id, service_id, master_id, appointment_date, start_time, end_time, status
      ) VALUES (?, ?, ?, ?, '11:00', '12:00', 'confirmed')
    `,
    ).run(demoClientId, haircut.id, alexey.id, friday);
  }

  const occupiedCount = db
    .prepare('SELECT COUNT(*) AS count FROM appointments WHERE client_id = ?')
    .get(occupiedClientId) as { count: number };
  if (occupiedCount.count === 0) {
    db.prepare(
      `
      INSERT INTO appointments (
        client_id, service_id, master_id, appointment_date, start_time, end_time, status
      ) VALUES (?, ?, ?, ?, '10:00', '11:00', 'confirmed')
    `,
    ).run(occupiedClientId, haircut.id, roman.id, friday);
  }
}
