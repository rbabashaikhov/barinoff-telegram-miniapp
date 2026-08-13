import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { TopBar } from '../components/TopBar';
import { formatDateFull, formatPrice, formatStatus } from '../lib/format';
import type { Appointment } from '../types';

export function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .getMyAppointments()
      .then((res) => setItems(res.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCancel(id: number) {
    const ok = window.confirm('Отменить запись?');
    if (!ok) return;
    setCancellingId(id);
    try {
      await api.cancelAppointment(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отменить');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="page">
      <TopBar title="Мои записи" backTo="/" />

      {loading && <div className="loading">Загрузка…</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          Предстоящих записей нет.
          <div style={{ marginTop: 16 }}>
            <Link className="btn btn-primary" to="/services">
              Записаться
            </Link>
          </div>
        </div>
      )}

      <div className="stack">
        {items.map((item) => (
          <article
            key={item.id}
            className={`appointment-card${item.status === 'cancelled' ? ' is-cancelled' : ''}`}
          >
            <div className="row">
              <strong>{item.service.name}</strong>
              <span className={`status-pill ${item.status}`}>{formatStatus(item.status)}</span>
            </div>
            <p className="muted" style={{ margin: '8px 0 0' }}>
              {item.master.name}
            </p>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {formatDateFull(item.date)}
            </p>
            <p style={{ margin: '6px 0 0' }}>
              <span className="muted">
                {item.startTime}–{item.endTime}
              </span>
              <span className="appointment-price"> · {formatPrice(item.service.price)}</span>
            </p>
            {item.status === 'confirmed' && (
              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={cancellingId === item.id}
                  onClick={() => onCancel(item.id)}
                >
                  {cancellingId === item.id ? 'Отмена…' : 'Отменить'}
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
