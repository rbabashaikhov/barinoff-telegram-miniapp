import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { formatPrice, formatStatus } from '../lib/format';
import type { Appointment } from '../types';

function clientName(item: Appointment): string {
  return (
    item.client.name ||
    [item.client.firstName, item.client.lastName].filter(Boolean).join(' ') ||
    '—'
  );
}

function telegramLabel(item: Appointment): string {
  return item.client.username
    ? `@${item.client.username}`
    : String(item.client.telegramUserId);
}

export function AdminPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getAdminAppointments()
      .then((res) => {
        if (!cancelled) setItems(res.data);
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
  }, []);

  return (
    <div className="admin-layout">
      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="brand" style={{ fontSize: '2rem' }}>
            Записи
          </h1>
        </div>
        <Link className="btn btn-secondary" to="/">
          В приложение
        </Link>
      </div>

      {loading && <div className="loading">Загрузка…</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && !error && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Время</th>
                  <th>Мастер</th>
                  <th>Клиент</th>
                  <th>Telegram</th>
                  <th>Услуга</th>
                  <th>Стоимость</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={8} className="muted">
                      Записей пока нет
                    </td>
                  </tr>
                )}
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={item.status === 'cancelled' ? 'is-cancelled' : undefined}
                  >
                    <td>{item.date}</td>
                    <td>
                      {item.startTime}–{item.endTime}
                    </td>
                    <td>{item.master.name}</td>
                    <td>{clientName(item)}</td>
                    <td>{telegramLabel(item)}</td>
                    <td>{item.service.name}</td>
                    <td>{formatPrice(item.service.price)}</td>
                    <td>
                      <span className={`status-pill ${item.status}`}>
                        {formatStatus(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-cards">
            {items.length === 0 && <div className="empty-state">Записей пока нет</div>}
            {items.map((item) => (
              <article
                key={`m-${item.id}`}
                className={`admin-card${item.status === 'cancelled' ? ' is-cancelled' : ''}`}
              >
                <div className="row">
                  <strong>
                    {item.date} · {item.startTime}–{item.endTime}
                  </strong>
                  <span className={`status-pill ${item.status}`}>
                    {formatStatus(item.status)}
                  </span>
                </div>
                <p className="muted" style={{ margin: '8px 0 0' }}>
                  {item.master.name} · {clientName(item)} · {telegramLabel(item)}
                </p>
                <p style={{ margin: '6px 0 0' }}>
                  {item.service.name}
                  <span className="appointment-price"> · {formatPrice(item.service.price)}</span>
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
