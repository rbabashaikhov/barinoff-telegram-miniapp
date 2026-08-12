import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { dayNumber, weekdayShort } from '../lib/format';
import type { DayAvailability } from '../types';

export function DatePage() {
  const navigate = useNavigate();
  const { service, date, setDate } = useBooking();
  const [calendar, setCalendar] = useState<DayAvailability[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    setLoading(true);
    api
      .getAvailability(service.id, 14)
      .then((res) => {
        if (!cancelled) setCalendar(res.data.calendar);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [service]);

  if (!service) {
    return <Navigate to="/services" replace />;
  }

  return (
    <div className="page">
      <TopBar title="Дата" backTo="/services" />
      <p className="lead">
        {service.name} · выберите день
      </p>

      {loading && <div className="loading">Загрузка дат…</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && !error && (
        <div className="date-scroller">
          {calendar.map((day) => (
            <button
              key={day.date}
              type="button"
              className={`date-chip${date === day.date ? ' selected' : ''}`}
              disabled={!day.available}
              onClick={() => setDate(day.date)}
            >
              <span className="dow">{weekdayShort(day.weekday)}</span>
              <span className="dom">{dayNumber(day.date)}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={!date}
        onClick={() => navigate('/booking/time')}
      >
        Далее
      </button>
    </div>
  );
}
