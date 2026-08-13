import type { AppointmentWithDetails, TelegramUser } from '../types.js';

export type AppEventType =
  | 'booking.created'
  | 'booking.updated'
  | 'booking.cancelled'
  | 'customer.created';

export interface BookingCreatedEvent {
  type: 'booking.created';
  payload: AppointmentWithDetails;
}

export interface BookingUpdatedEvent {
  type: 'booking.updated';
  payload: AppointmentWithDetails;
}

export interface BookingCancelledEvent {
  type: 'booking.cancelled';
  payload: AppointmentWithDetails;
}

export interface CustomerCreatedEvent {
  type: 'customer.created';
  payload: {
    clientId: number;
    user: TelegramUser;
  };
}

export type AppEvent =
  | BookingCreatedEvent
  | BookingUpdatedEvent
  | BookingCancelledEvent
  | CustomerCreatedEvent;

export type EventHandler<T extends AppEvent = AppEvent> = (event: T) => void | Promise<void>;
