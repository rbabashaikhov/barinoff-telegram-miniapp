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

export function seed(db: Database.Database): void {
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
    db.exec(`
      INSERT INTO master_services (master_id, service_id)
      SELECT m.id, s.id
      FROM masters m
      CROSS JOIN services s
      WHERE m.active = 1 AND s.active = 1
    `);
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
}
