function boolEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return value === 'true' || value === '1';
}

function numberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
const allowDemoMode =
  process.env.ALLOW_DEMO_MODE === 'true' ||
  nodeEnv !== 'production' ||
  !telegramBotToken;

export type CrmAdapterName = 'local' | 'webhook' | 'mock';

function crmAdapterName(value: string | undefined): CrmAdapterName {
  if (value === 'webhook' || value === 'mock' || value === 'local') {
    return value;
  }
  return 'local';
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.API_PORT || process.env.PORT || 3000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  databasePath: process.env.DATABASE_PATH || '',
  publicDir: process.env.PUBLIC_DIR || '',
  telegramBotToken,
  allowDemoMode,
  timezone: process.env.TZ || 'Europe/Moscow',
  business: {
    name: process.env.BUSINESS_NAME || 'Atelier Cut',
    type: process.env.BUSINESS_TYPE || 'barbershop',
    title: process.env.APP_TITLE || 'Service Booking',
    description:
      process.env.APP_DESCRIPTION ||
      'Онлайн-запись. Выберите услугу, мастера и удобное время.',
  },
  admin: {
    token: (process.env.ADMIN_TOKEN || '').trim(),
  },
  features: {
    demoTour: boolEnv(process.env.FEATURE_DEMO_TOUR, true),
    demoAdminPreview: boolEnv(process.env.FEATURE_DEMO_ADMIN_PREVIEW, true),
  },
  crm: {
    adapter: crmAdapterName(process.env.CRM_ADAPTER),
    webhookUrl: process.env.CRM_WEBHOOK_URL || '',
    webhookSecret: process.env.CRM_WEBHOOK_SECRET || '',
    timeoutMs: numberEnv(process.env.CRM_WEBHOOK_TIMEOUT_MS, 5000),
    syncOnStartup: boolEnv(process.env.CRM_SYNC_ON_STARTUP, false),
  },
  rateLimit: {
    windowMs: numberEnv(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
    max: numberEnv(process.env.RATE_LIMIT_MAX, 20),
  },
};

export function publicAppConfig() {
  return {
    businessName: config.business.name,
    businessType: config.business.type,
    appTitle: config.business.title,
    appDescription: config.business.description,
    timezone: config.timezone,
    demoMode: config.allowDemoMode,
    adminProtected: config.isProduction || Boolean(config.admin.token),
    features: {
      demoTour: config.features.demoTour,
      demoAdminPreview: config.features.demoAdminPreview,
    },
  };
}

export function isDemoAdminPreviewEnabled(
  cfg: {
    allowDemoMode: boolean;
    features: { demoAdminPreview: boolean };
  } = config,
): boolean {
  return cfg.allowDemoMode && cfg.features.demoAdminPreview;
}
