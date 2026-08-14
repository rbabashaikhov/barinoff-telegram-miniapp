export interface Service {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface Master {
  id: number;
  name: string;
  role: string;
  description: string;
  active: boolean;
  displayOrder: number;
  serviceIds?: number[];
}

export interface Appointment {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
  service: {
    id: number;
    name: string;
    price: number;
    durationMinutes: number;
  };
  master: {
    id: number;
    name: string;
    role: string;
  };
  client: {
    telegramUserId: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    name?: string;
  };
}

export interface DayAvailability {
  date: string;
  weekday: number;
  slots: string[];
  available: boolean;
}

export interface BookingDraft {
  service: Service | null;
  master: Master | null;
  date: string | null;
  startTime: string | null;
}

export interface AppConfig {
  businessName: string;
  businessType: string;
  appTitle: string;
  appDescription: string;
  timezone: string;
  demoMode: boolean;
  adminProtected: boolean;
  features: {
    demoTour: boolean;
    demoAdminPreview: boolean;
  };
}

export interface WorkingHours {
  id: number;
  masterId?: number;
  weekday: number;
  startTime: string;
  endTime: string;
  active: boolean;
}

export interface BlockedSlot {
  id: number;
  masterId?: number;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
}
