export interface Service {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
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
  date: string | null;
  startTime: string | null;
}
