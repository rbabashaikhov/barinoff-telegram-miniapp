import { Link, useLocation } from 'react-router-dom';
import { useBooking } from '../context/BookingContext';
import { formatDateFull, formatPrice } from '../lib/format';
import type { Appointment } from '../types';
import { useEffect } from 'react';

export function SuccessPage() {
  const location = useLocation();
  const { reset } = useBooking();
  const appointment = (location.state as { appointment?: Appointment } | null)?.appointment;

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <div className="page">
      <div className="success-hero">
        <div className="check">✓</div>
        <h1 className="brand" style={{ fontSize: '2rem' }}>
          Запись подтверждена
        </h1>
        <p className="lead">Ждём вас в назначенное время.</p>
      </div>

      {appointment && (
        <div className="summary-card">
          <div className="summary-row">
            <span>Услуга</span>
            <span>{appointment.service.name}</span>
          </div>
          <div className="summary-row">
            <span>Дата</span>
            <span>{formatDateFull(appointment.date)}</span>
          </div>
          <div className="summary-row">
            <span>Время</span>
            <span>
              {appointment.startTime}–{appointment.endTime}
            </span>
          </div>
          <div className="summary-row">
            <span>Стоимость</span>
            <span>{formatPrice(appointment.service.price)}</span>
          </div>
        </div>
      )}

      <Link className="btn btn-primary btn-block" to="/appointments">
        Мои записи
      </Link>
      <Link className="btn btn-secondary btn-block" to="/">
        На главную
      </Link>
    </div>
  );
}
