import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getAdminToken, setAdminToken } from '../api/client';
import { useBusiness } from '../context/BusinessContext';
import { formatPrice, formatStatus, weekdayShort } from '../lib/format';
import type { Appointment, BlockedSlot, Master, Service, WorkingHours } from '../types';

type Tab = 'appointments' | 'masters' | 'services' | 'schedule';

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
  const business = useBusiness();
  const [tab, setTab] = useState<Tab>('appointments');
  const [items, setItems] = useState<Appointment[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [blocked, setBlocked] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsToken, setNeedsToken] = useState(false);
  const [tokenInput, setTokenInput] = useState(getAdminToken());
  const [status, setStatus] = useState('');
  const [masterId, setMasterId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [blockForm, setBlockForm] = useState({
    masterId: '',
    date: '',
    startTime: '12:00',
    endTime: '13:00',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [appointmentsRes, mastersRes, servicesRes, hoursRes, blockedRes] = await Promise.all([
        api.getAdminAppointments({
          status: status || undefined,
          masterId: masterId ? Number(masterId) : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
        api.getAdminMasters(),
        api.getAdminServices(),
        api.getAdminWorkingHours(),
        api.getAdminBlockedSlots(),
      ]);
      setNeedsToken(false);
      setItems(appointmentsRes.data);
      setMasters(mastersRes.data);
      setServices(servicesRes.data);
      setHours(hoursRes.data);
      setBlocked(blockedRes.data);
    } catch (err) {
      const statusCode = typeof err === 'object' && err && 'status' in err ? Number(err.status) : 0;
      if (statusCode === 401) {
        setNeedsToken(true);
        setError('Нужен ADMIN_TOKEN');
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить admin');
      }
    } finally {
      setLoading(false);
    }
  }, [status, masterId, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const masterName = useMemo(() => {
    const map = new Map(masters.map((item) => [item.id, item.name]));
    return (id?: number) => (id ? map.get(id) || `#${id}` : '—');
  }, [masters]);

  async function onCreateBlock() {
    if (!blockForm.masterId || !blockForm.date) return;
    setError(null);
    try {
      await api.createBlockedSlot({
        masterId: Number(blockForm.masterId),
        date: blockForm.date,
        startTime: blockForm.startTime.slice(0, 5),
        endTime: blockForm.endTime.slice(0, 5),
        reason: blockForm.reason || undefined,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать блокировку');
    }
  }

  async function onDeleteBlock(id: number) {
    try {
      await api.deleteBlockedSlot(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось удалить блокировку');
    }
  }

  return (
    <div className="admin-layout">
      <div className="row" style={{ marginBottom: 20 }}>
        <div>
          <p className="eyebrow">Admin · {business.businessName}</p>
          <h1 className="brand" style={{ fontSize: '2rem' }}>
            Операции
          </h1>
        </div>
        <Link className="btn btn-secondary" to="/">
          В приложение
        </Link>
      </div>

      {needsToken && (
        <form
          className="admin-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setAdminToken(tokenInput.trim());
            void load();
          }}
        >
          <input
            type="password"
            placeholder="ADMIN_TOKEN"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Войти
          </button>
        </form>
      )}

      <div className="admin-tabs">
        {(
          [
            ['appointments', 'Записи'],
            ['masters', 'Мастера'],
            ['services', 'Услуги'],
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

      {tab === 'appointments' && (
        <div className="admin-filters">
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Все статусы</option>
            <option value="confirmed">Подтверждена</option>
            <option value="cancelled">Отменена</option>
          </select>
          <select value={masterId} onChange={(event) => setMasterId(event.target.value)}>
            <option value="">Все мастера</option>
            {masters.map((master) => (
              <option key={master.id} value={master.id}>
                {master.name}
              </option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      )}

      {loading && <div className="loading">Загрузка…</div>}
      {error && <div className="error-box">{error}</div>}

      {!loading && !needsToken && tab === 'appointments' && (
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

      {!loading && !needsToken && tab === 'masters' && (
        <div className="stack">
          {masters.map((master) => (
            <article key={master.id} className="admin-card">
              <div className="row">
                <strong>{master.name}</strong>
                <span className={`status-pill ${master.active ? 'confirmed' : 'cancelled'}`}>
                  {master.active ? 'Активен' : 'Скрыт'}
                </span>
              </div>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                {master.role}
              </p>
              <p style={{ margin: '6px 0 0' }}>{master.description}</p>
            </article>
          ))}
        </div>
      )}

      {!loading && !needsToken && tab === 'services' && (
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

      {!loading && !needsToken && tab === 'schedule' && (
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
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((row) => (
                    <tr key={row.id}>
                      <td>{masterName(row.masterId)}</td>
                      <td>{weekdayShort(row.weekday)}</td>
                      <td>
                        {row.startTime}–{row.endTime}
                      </td>
                      <td>{row.active ? 'открыт' : 'выходной'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="admin-card">
            <h2 className="section-title">Блокировки слотов</h2>
            <div className="admin-filters" style={{ marginTop: 12 }}>
              <select
                value={blockForm.masterId}
                onChange={(event) => setBlockForm({ ...blockForm, masterId: event.target.value })}
              >
                <option value="">Мастер</option>
                {masters.map((master) => (
                  <option key={master.id} value={master.id}>
                    {master.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={blockForm.date}
                onChange={(event) => setBlockForm({ ...blockForm, date: event.target.value })}
              />
              <input
                type="time"
                value={blockForm.startTime}
                onChange={(event) => setBlockForm({ ...blockForm, startTime: event.target.value })}
              />
              <input
                type="time"
                value={blockForm.endTime}
                onChange={(event) => setBlockForm({ ...blockForm, endTime: event.target.value })}
              />
              <input
                placeholder="Причина"
                value={blockForm.reason}
                onChange={(event) => setBlockForm({ ...blockForm, reason: event.target.value })}
              />
              <button className="btn btn-secondary" type="button" onClick={() => void onCreateBlock()}>
                Заблокировать
              </button>
            </div>
            <div className="stack" style={{ marginTop: 12 }}>
              {blocked.length === 0 && <p className="muted">Блокировок нет</p>}
              {blocked.map((slot) => (
                <div key={slot.id} className="row">
                  <span>
                    {masterName(slot.masterId)} · {slot.date} · {slot.startTime}–{slot.endTime}
                    {slot.reason ? ` · ${slot.reason}` : ''}
                  </span>
                  <button className="btn-danger" type="button" onClick={() => void onDeleteBlock(slot.id)}>
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  );
}
