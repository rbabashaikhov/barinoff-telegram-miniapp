import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { formatDateFull } from '../lib/format';

export function TimePage() {
  const navigate = useNavigate();
  const { service, master, date, startTime, setStartTime } = useBooking();
  const [slots, setSlots] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!service || !master || !date) return;
    let cancelled = false;
    setLoading(true);
    api
      .getSlots(service.id, master.id, date)
      .then((res) => {
        if (!cancelled) setSlots(res.data.slots);
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
  }, [service, master, date]);

  if (!service || !master || !date) {
    return <Navigate to="/services" replace />;
  }

  return (
    <div className="page page-with-sticky">
      <TopBar title="Время" backTo="/booking/date" />
      <p className="lead">
        {master.name} · {formatDateFull(date)}
      </p>

      {loading && <div className="loading">Загрузка слотов…</div>}
      {error && <div className="error-box">{error}</div>}
      {!loading && !error && slots.length === 0 && (
        <div className="empty-state" data-demo-tour="available-slots">На этот день свободных слотов нет</div>
      )}

      {!loading && slots.length > 0 && (
        <div className="slots-scroll" data-demo-tour="available-slots">
          <div className="slots-grid">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                className={`slot-btn${startTime === slot ? ' selected' : ''}`}
                onClick={() => setStartTime(slot)}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sticky-cta">
        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={!startTime}
          onClick={() => navigate('/booking/confirm')}
        >
          Далее
        </button>
      </div>
    </div>
  );
}
