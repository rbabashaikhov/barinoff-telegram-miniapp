import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatDateFull, formatDuration, formatPrice } from '../lib/format';

export function ConfirmPage() {
  const navigate = useNavigate();
  const { service, date, startTime } = useBooking();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!service || !date || !startTime) {
    return <Navigate to="/services" replace />;
  }

  async function onConfirm() {
    if (!service || !date || !startTime) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createAppointment({
        serviceId: service.id,
        date,
        startTime,
      });
      navigate('/booking/success', { state: { appointment: res.data } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать запись');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <TopBar title="Подтверждение" backTo="/booking/time" />

      <div className="summary-card">
        <div className="summary-row">
          <span>Услуга</span>
          <span>{service.name}</span>
        </div>
        <div className="summary-row">
          <span>Дата</span>
          <span>{formatDateFull(date)}</span>
        </div>
        <div className="summary-row">
          <span>Время</span>
          <span>{startTime}</span>
        </div>
        <div className="summary-row">
          <span>Длительность</span>
          <span>{formatDuration(service.durationMinutes)}</span>
        </div>
        <div className="summary-row">
          <span>Стоимость</span>
          <span>{formatPrice(service.price)}</span>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={submitting}
        onClick={onConfirm}
      >
        {submitting ? 'Создаём…' : 'Подтвердить запись'}
      </button>
    </div>
  );
}
