import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useBusiness } from '../context/BusinessContext';
import { formatPrice, formatStatus, weekdayShort } from '../lib/format';
import type { Appointment, BlockedSlot, Master, Service, WorkingHours } from '../types';

type Tab = 'appointments' | 'services' | 'masters' | 'schedule';

function clientName(item: Appointment): string {
  return (
    item.client.name ||
    [item.client.firstName, item.client.lastName].filter(Boolean).join(' ') ||
    '—'
  );
}

export function DemoAdminPage() {
  const business = useBusiness();
  const enabled = business.demoMode && business.features.demoAdminPreview;
  const [tab, setTab] = useState<Tab>('appointments');
  const [items, setItems] = useState<Appointment[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [appointmentsRes, mastersRes, servicesRes, hoursRes, blockedRes] = await Promise.all([
        api.getDemoAdminAppointments(),
        api.getDemoAdminMasters(),
        api.getDemoAdminServices(),
        api.getDemoAdminWorkingHours(),
        api.getDemoAdminBlockedSlots(),
      ]);
      setItems(appointmentsRes.data);
      setMasters(mastersRes.data);
      setServices(servicesRes.data);
      setHours(hoursRes.data);
      setBlocked(blockedRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить превью админки');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const masterName = useMemo(() => {
    const map = new Map(masters.map((item) => [item.id, item.name]));
    return (id?: number) => (id ? map.get(id) || `#${id}` : '—');
  }, [masters]);

  if (!enabled) {
    return (
      <div className="admin-layout">
        <p className="eyebrow">Demo admin</p>
        <h1 className="brand" style={{ fontSize: '2rem' }}>
          Превью недоступно
        </h1>
        <p className="lead">Read-only admin preview выключен в конфигурации этого салона.</p>
        <Link className="btn btn-secondary" to="/" data-demo-nav="open-client">
          Открыть клиентское приложение
        </Link>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Demo admin · {business.businessName}</p>
          <h1 className="brand" style={{ fontSize: '2rem' }}>
            Превью админки
          </h1>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Только просмотр. Полная админка защищена и доступна владельцу.
          </p>
        </div>
        <Link className="btn btn-secondary" to="/" data-demo-nav="open-client">
          Открыть клиентское приложение
        </Link>
      </div>

      <div className="demo-admin-banner">Режим превью · данные нельзя изменить</div>

      <article className="admin-card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Приложение готово к интеграции с CRM/ERP через webhook и integration layer.
        </p>
      </article>

      <div className="admin-tabs">
        {(
          [
            ['appointments', 'Записи'],
            ['services', 'Услуги'],
            ['masters', 'Мастера'],
            ['schedule', 'Расписание'],
          ] as Array<[Tab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`admin-tab${tab === id ? ' is-active' : ''}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="loading">Загрузка…</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && tab === 'appointments' && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Время</th>
                  <th>Клиент</th>
                  <th>Услуга</th>
                  <th>Мастер</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>
                      {item.startTime}–{item.endTime}
                    </td>
                    <td>{clientName(item)}</td>
                    <td>{item.service.name}</td>
                    <td>{item.master.name}</td>
                    <td>
                      <span className={`status-pill ${item.status}`}>{formatStatus(item.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-cards">
            {items.map((item) => (
              <article key={`m-${item.id}`} className="admin-card">
                <div className="row">
                  <strong>
                    {item.date} · {item.startTime}–{item.endTime}
                  </strong>
                  <span className={`status-pill ${item.status}`}>{formatStatus(item.status)}</span>
                </div>
                <p className="muted" style={{ margin: '8px 0 0' }}>
                  {item.master.name} · {clientName(item)}
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

      {!loading && tab === 'services' && (
        <div className="stack">
          {services.map((service) => (
            <article key={service.id} className="admin-card">
              <div className="row">
                <strong>{service.name}</strong>
                <span className={`status-pill ${service.active ? 'confirmed' : 'cancelled'}`}>
                  {service.active ? 'Активна' : 'Скрыта'}
                </span>
              </div>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {service.durationMinutes} мин · {formatPrice(service.price)}
              </p>
              <p style={{ margin: '6px 0 0' }}>{service.description}</p>
            </article>
          ))}
        </div>
      )}

      {!loading && tab === 'masters' && (
        <div className="stack">
          {masters.map((master) => (
            <article key={master.id} className="admin-card">
              <div className="row">
                <strong>{master.name}</strong>
                <span className="muted">{master.role}</span>
              </div>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {master.description}
              </p>
              <p style={{ margin: '10px 0 0' }}>
                {(master.serviceIds ?? [])
                  .map((id) => services.find((service) => service.id === id)?.name)
                  .filter(Boolean)
                  .join(', ') || 'Услуги не назначены'}
              </p>
            </article>
          ))}
        </div>
      )}

      {!loading && tab === 'schedule' && (
        <div className="stack">
          <article className="admin-card">
            <h2 className="section-title">Рабочие часы</h2>
            <div className="admin-table-wrap" style={{ marginTop: 12 }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Мастер</th>
                    <th>День</th>
                    <th>Часы</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((row) => (
                    <tr key={row.id}>
                      <td>{masterName(row.masterId)}</td>
                      <td>{weekdayShort(row.weekday)}</td>
                      <td>
                        {row.startTime}–{row.endTime} · {row.active ? 'открыт' : 'выходной'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-cards">
              {hours.map((row) => (
                <article key={`h-${row.id}`} className="admin-card">
                  <strong>{masterName(row.masterId)}</strong>
                  <p className="muted">
                    {weekdayShort(row.weekday)} · {row.startTime}–{row.endTime} ·{' '}
                    {row.active ? 'открыт' : 'выходной'}
                  </p>
                </article>
              ))}
            </div>
          </article>

          <article className="admin-card">
            <h2 className="section-title">Блокировки слотов</h2>
            {blocked.length === 0 ? (
              <p className="muted" style={{ margin: '12px 0 0' }}>
                Сейчас нет заблокированных интервалов.
              </p>
            ) : (
              <div className="stack" style={{ marginTop: 12 }}>
                {blocked.map((slot) => (
                  <div key={slot.id} className="row">
                    <span>
                      {masterName(slot.masterId)} · {slot.date} · {slot.startTime}–{slot.endTime}
                    </span>
                    {slot.reason ? <span className="muted">{slot.reason}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
