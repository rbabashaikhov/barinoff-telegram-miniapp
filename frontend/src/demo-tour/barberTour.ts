import type { DemoTourDefinition } from './types';

export const BARBER_DEMO_TOUR_STORAGE_KEY = 'barber.salesDemoTour.v1';

export const DEMO_SERVICE_NAME = 'Моделирование бороды';

export const barberDemoTour: DemoTourDefinition = {
  id: 'barber-sales-demo',
  storageKey: BARBER_DEMO_TOUR_STORAGE_KEY,
  intro: {
    title: 'Посмотреть, как работает онлайн-запись?',
    lead: 'За 30 секунд покажем:',
    bullets: [
      'выбор услуги',
      'запись к конкретному мастеру',
      'свободное время по его расписанию',
      'подтверждение записи',
      'управление записями',
    ],
    startLabel: 'Начать тур',
    skipLabel: 'Пропустить',
  },
  finish: {
    title: 'Готово',
    lead: 'В демо вы увидели:',
    bullets: [
      'выбор услуги',
      'выбор мастера',
      'актуальные свободные слоты',
      'подтверждение записи',
      'клиентские записи',
    ],
    adminLabel: 'Посмотреть кабинет администратора',
    continueLabel: 'Продолжить как клиент',
    adminHint: 'Также можно посмотреть, как салон управляет расписанием и записями.',
    crmNote: 'Приложение готово к интеграции с CRM/ERP через webhook и integration layer.',
  },
  steps: [
    {
      id: 'service',
      target: 'service-selection',
      route: '/services',
      title: 'Выбор услуги',
      description: 'Клиент выбирает нужную услугу — например стрижку, бороду или комплекс.',
      action: 'select-demo-service',
    },
    {
      id: 'master',
      target: 'master-selection',
      route: '/booking/master',
      title: 'Выбор мастера',
      description: 'Для каждой услуги доступны только мастера, которые её выполняют.',
      action: 'select-demo-service',
    },
    {
      id: 'slots',
      target: 'available-slots',
      route: '/booking/time',
      title: 'Свободное время',
      description:
        'Слоты рассчитываются по расписанию конкретного мастера, его блокировкам и уже существующим записям.',
      action: 'prepare-slots',
      placement: 'top',
    },
    {
      id: 'confirm',
      target: 'booking-confirmation',
      route: '/booking/confirm',
      title: 'Подтверждение',
      description: 'Перед записью клиент видит услугу, мастера, дату и время и подтверждает визит.',
      action: 'prepare-confirmation',
    },
    {
      id: 'appointments',
      target: 'my-appointments',
      route: '/appointments',
      title: 'Мои записи',
      description: 'Клиент может видеть свои записи и отменить визит, пока это ещё доступно.',
    },
  ],
};
