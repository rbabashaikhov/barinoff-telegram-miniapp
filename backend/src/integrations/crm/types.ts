export interface CrmResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export interface CrmCustomerInput {
  telegramUserId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  localClientId: number;
}

export interface CrmBookingInput {
  localAppointmentId: number;
  status: 'confirmed' | 'cancelled';
  date: string;
  startTime: string;
  endTime: string;
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
  customer: CrmCustomerInput;
}

export interface CrmServiceInput {
  id: number;
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
}

export interface CrmMasterInput {
  id: number;
  name: string;
  role: string;
  description: string;
  active: boolean;
}

export interface CrmAdapter {
  readonly id: 'local' | 'webhook' | 'mock';
  createOrUpdateCustomer(input: CrmCustomerInput): Promise<CrmResult>;
  createBooking(input: CrmBookingInput): Promise<CrmResult>;
  updateBooking(input: CrmBookingInput): Promise<CrmResult>;
  cancelBooking(input: CrmBookingInput): Promise<CrmResult>;
  syncServices(services: CrmServiceInput[]): Promise<CrmResult>;
  syncMasters(masters: CrmMasterInput[]): Promise<CrmResult>;
}

export interface WebhookEnvelope<T = unknown> {
  event: string;
  occurredAt: string;
  business: {
    name: string;
    type: string;
  };
  data: T;
}
