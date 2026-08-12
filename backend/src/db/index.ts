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

/** weekday: 0 = Sunday … 6 = Saturday (JS Date.getDay) */
const WORKING_HOURS: Array<{
  weekday: number;
  start_time: string;
  end_time: string;
  active: number;
}> = [
  { weekday: 0, start_time: '10:00', end_time: '20:00', active: 0 },
  { weekday: 1, start_time: '10:00', end_time: '20:00', active: 1 },
  { weekday: 2, start_time: '10:00', end_time: '20:00', active: 1 },
  { weekday: 3, start_time: '10:00', end_time: '20:00', active: 1 },
  { weekday: 4, start_time: '10:00', end_time: '20:00', active: 1 },
  { weekday: 5, start_time: '10:00', end_time: '20:00', active: 1 },
  { weekday: 6, start_time: '10:00', end_time: '20:00', active: 1 },
];

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

  const hoursCount = db
    .prepare('SELECT COUNT(*) AS count FROM working_hours')
    .get() as { count: number };

  if (hoursCount.count === 0) {
    const insertHours = db.prepare(`
      INSERT INTO working_hours (weekday, start_time, end_time, active)
      VALUES (@weekday, @start_time, @end_time, @active)
    `);

    const insertMany = db.transaction(() => {
      for (const row of WORKING_HOURS) {
        insertHours.run(row);
      }
    });
    insertMany();
  }
}
