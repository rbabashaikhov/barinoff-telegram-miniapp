import type {
  Appointment,
  AppConfig,
  BlockedSlot,
  DayAvailability,
  Master,
  Service,
  WorkingHours,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

let initData = '';
let adminToken = '';

if (typeof sessionStorage !== 'undefined') {
  adminToken = sessionStorage.getItem('admin_token') || '';
}

export function setTelegramInitData(value: string): void {
  initData = value;
}

export function setAdminToken(value: string): void {
  adminToken = value;
  if (typeof sessionStorage !== 'undefined') {
    if (value) sessionStorage.setItem('admin_token', value);
    else sessionStorage.removeItem('admin_token');
  }
}

export function getAdminToken(): string {
  return adminToken;
}

class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (initData) {
    headers.set('x-telegram-init-data', initData);
  }
  if (adminToken && path.startsWith('/api/admin')) {
    headers.set('x-admin-token', adminToken);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status);
  }
  return payload as T;
}

export const api = {
  getConfig: () => request<{ data: AppConfig }>('/api/config'),
  getServices: () => request<{ data: Service[] }>('/api/services'),
  getMasters: (serviceId?: number) =>
    request<{ data: Master[] }>(
      serviceId ? `/api/masters?serviceId=${serviceId}` : '/api/masters',
    ),
  getAvailability: (serviceId: number, masterId: number, days = 14) =>
    request<{
      data: { serviceId: number; masterId: number; days: number; calendar: DayAvailability[] };
    }>(`/api/availability?serviceId=${serviceId}&masterId=${masterId}&days=${days}`),
  getSlots: (serviceId: number, masterId: number, date: string) =>
    request<{ data: { serviceId: number; masterId: number; date: string; slots: string[] } }>(
      `/api/availability?serviceId=${serviceId}&masterId=${masterId}&date=${date}`,
    ),
  createAppointment: (body: {
    serviceId: number;
    masterId: number;
    date: string;
    startTime: string;
  }) =>
    request<{ data: Appointment }>('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getMyAppointments: () => request<{ data: Appointment[] }>('/api/appointments/me'),
  cancelAppointment: (id: number) =>
    request<{ data: Appointment }>(`/api/appointments/${id}/cancel`, {
      method: 'PATCH',
    }),
  getAdminAppointments: (query?: {
    status?: string;
    masterId?: number;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const params = new URLSearchParams();
    if (query?.status) params.set('status', query.status);
    if (query?.masterId) params.set('masterId', String(query.masterId));
    if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
    if (query?.dateTo) params.set('dateTo', query.dateTo);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<{ data: Appointment[] }>(`/api/admin/appointments${suffix}`);
  },
  getAdminMasters: () => request<{ data: Master[] }>('/api/admin/masters'),
  getAdminServices: () => request<{ data: Service[] }>('/api/admin/services'),
  getAdminWorkingHours: (masterId?: number) =>
    request<{ data: WorkingHours[] }>(
      masterId ? `/api/admin/working-hours?masterId=${masterId}` : '/api/admin/working-hours',
    ),
  getAdminBlockedSlots: () => request<{ data: BlockedSlot[] }>('/api/admin/blocked-slots'),
  createBlockedSlot: (body: {
    masterId: number;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }) =>
    request<{ data: BlockedSlot }>('/api/admin/blocked-slots', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteBlockedSlot: (id: number) =>
    request<void>(`/api/admin/blocked-slots/${id}`, { method: 'DELETE' }),
};
