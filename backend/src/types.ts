export type AppointmentStatus = 'confirmed' | 'cancelled';

export interface Service {
  id: number;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  active: number;
}

export interface Client {
  id: number;
  telegram_user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

export interface Appointment {
  id: number;
  client_id: number;
  service_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface WorkingHours {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  active: number;
}

export interface BlockedSlot {
  id: number;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
}

export interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface AuthContext {
  telegramUser: TelegramUser;
  isDemo: boolean;
}

export interface AppointmentWithDetails extends Appointment {
  service_name: string;
  service_price: number;
  service_duration_minutes: number;
  client_telegram_user_id: number;
  client_username: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
}
