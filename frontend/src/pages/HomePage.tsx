import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ServiceCard } from '../components/ServiceCard';
import { useApp } from '../context/AppContext';
import type { Service } from '../types';

export function HomePage() {
  const { isDemo, user } = useApp();
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .getServices()
      .then((res) => {
        if (!cancelled) setServices(res.data.slice(0, 3));
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
      {isDemo && (
        <div className="demo-banner">
          Demo mode · Клиент {user.firstName || user.username}
        </div>
      )}

      <section className="hero-block">
        <p className="eyebrow">Barbershop</p>
        <h1 className="brand">Atelier Cut</h1>
        <p className="lead">Онлайн-запись к барберу. Выберите услугу, мастера и удобное время.</p>
        <Link className="btn btn-primary btn-block hero-cta" to="/services">
          Записаться
        </Link>
      </section>

      <section className="stack">
        <div className="row">
          <h2 className="section-title">Услуги</h2>
          <Link className="btn btn-ghost" to="/services">
            Все →
          </Link>
        </div>

        {loading && <div className="loading">Загрузка…</div>}
        {error && <div className="error-box">{error}</div>}
        {!loading &&
          !error &&
          services.map((service) => <ServiceCard key={service.id} service={service} />)}
      </section>

      <div className="footer-nav">
        <Link className="btn btn-secondary btn-block" to="/appointments">
          Мои записи
        </Link>
      </div>
    </div>
  );
}
