import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ServiceCard } from '../components/ServiceCard';
import { TopBar } from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import type { Service } from '../types';

export function ServicesPage() {
  const navigate = useNavigate();
  const { setService } = useBooking();
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getServices()
      .then((res) => {
        if (!cancelled) setServices(res.data);
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
    <div className="page">
      <TopBar title="Услуги" backTo="/" />
      {loading && <div className="loading">Загрузка…</div>}
      {error && <div className="error-box">{error}</div>}
      {!loading && (
        <div className="stack" data-demo-tour="service-selection">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelect={(selected) => {
                setService(selected);
                navigate('/booking/master');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
