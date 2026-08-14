import type Database from 'better-sqlite3';

const SERVICES = [
  {
    name: 'Мужская стрижка',
    description: 'Классическая мужская стрижка с укладкой',
    duration_minutes: 60,
    price: 1500,
  },
  {
    name: 'Стрижка + борода',
    description: 'Стрижка и оформление бороды',
    duration_minutes: 90,
    price: 2200,
  },
  {
    name: 'Оформление бороды',
    description: 'Моделирование и стрижка бороды',
    duration_minutes: 45,
    price: 1000,
  },
  {
    name: 'Детская стрижка',
    description: 'Стрижка для детей до 12 лет',
    duration_minutes: 45,
    price: 1200,
  },
] as const;

const MASTERS = [
  {
    name: 'Александр',
    role: 'Senior Barber',
    description: 'Точные классические стрижки и аккуратная укладка.',
    display_order: 1,
  },
  {
    name: 'Максим',
    role: 'Barber',
    description: 'Современные мужские стрижки и работа с бородой.',
    display_order: 2,
  },
  {
    name: 'Артём',
    role: 'Barber',
    description: 'Спокойный ритм и чистые линии в каждой стрижке.',
    display_order: 3,
  },
  {
    name: 'Даниил',
    role: 'Barber',
    description: 'Уверенная техника и внимание к деталям образа.',
    display_order: 4,
  },
  {
    name: 'Никита',
    role: 'Junior Barber',
    description: 'Аккуратные стрижки и бережное оформление бороды.',
    display_order: 5,
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

const MASTER_HOURS: Record<string, HoursSpec[]> = {
  Александр: hoursForDays([1, 2, 3, 4, 5, 6], '10:00', '20:00'),
  Максим: hoursForDays([1, 2, 3, 4, 5], '09:00', '18:00'),
  Артём: hoursForDays([2, 3, 4, 5, 6], '11:00', '21:00'),
  Даниил: hoursForDays([0, 1, 3, 4, 5, 6], '10:00', '19:00'),
  Никита: hoursForDays([1, 2, 3, 4, 5], '12:00', '20:00'),
};

const MASTER_SERVICE_NAMES: Record<string, readonly string[]> = {
  Александр: ['Мужская стрижка', 'Стрижка + борода'],
  Максим: ['Мужская стрижка', 'Стрижка + борода', 'Оформление бороды'],
  Артём: ['Мужская стрижка', 'Стрижка + борода', 'Оформление бороды'],
  Даниил: ['Мужская стрижка', 'Детская стрижка'],
  Никита: ['Мужская стрижка', 'Оформление бороды', 'Детская стрижка'],
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
  const alexander = db.prepare(`SELECT id FROM masters WHERE name = 'Александр'`).get() as
    | { id: number }
    | undefined;
  const maxim = db.prepare(`SELECT id FROM masters WHERE name = 'Максим'`).get() as
    | { id: number }
    | undefined;
  const haircut = db.prepare(`SELECT id FROM services WHERE name = 'Мужская стрижка'`).get() as
    | { id: number }
    | undefined;

  const blockedCount = db.prepare('SELECT COUNT(*) AS count FROM blocked_slots').get() as {
    count: number;
  };
  if (blockedCount.count === 0 && alexander) {
    db.prepare(
      `
      INSERT INTO blocked_slots (master_id, blocked_date, start_time, end_time, reason)
      VALUES (?, ?, '15:00', '16:00', 'Обед')
    `,
    ).run(alexander.id, friday);
  }

  if (!haircut || !alexander || !maxim) return;

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
    ).run(demoClientId, haircut.id, alexander.id, friday);
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
    ).run(occupiedClientId, haircut.id, maxim.id, friday);
  }
}
