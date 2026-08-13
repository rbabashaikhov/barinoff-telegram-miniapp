import type { Appointment, DayAvailability, Master, Service } from '../types';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

let initData = '';

export function setTelegramInitData(value: string): void {
  initData = value;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (initData) {
    headers.set('x-telegram-init-data', initData);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload as T;
}

export const api = {
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
  getAdminAppointments: () => request<{ data: Appointment[] }>('/api/admin/appointments'),
};
