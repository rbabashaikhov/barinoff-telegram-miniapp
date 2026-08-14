import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { MasterCard } from '../components/MasterCard';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import type { Master } from '../types';

export function MasterPage() {
  const navigate = useNavigate();
  const { service, master, setMaster } = useBooking();
  const [masters, setMasters] = useState<Master[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!service) return;
    let cancelled = false;
    setLoading(true);
    api
      .getMasters(service.id)
      .then((res) => {
        if (!cancelled) setMasters(res.data);
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

  const selectedId = masters.some((item) => item.id === master?.id) ? master?.id : undefined;

  return (
    <div className="page">
      <TopBar title="Мастер" backTo="/services" />
      <p className="lead">{service.name} · выберите мастера</p>

      {loading && <div className="loading">Загрузка…</div>}
      {error && <div className="error-box">{error}</div>}
      {!loading && masters.length === 0 && (
        <div className="empty-state" data-demo-tour="master-selection">Для этой услуги пока нет мастеров</div>
      )}

      {!loading && masters.length > 0 && (
        <div className="stack" data-demo-tour="master-selection">
          {masters.map((item) => (
            <MasterCard
              key={item.id}
              master={item}
              selected={selectedId === item.id}
              onSelect={(selected) => {
                setMaster(selected);
                navigate('/booking/date');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
