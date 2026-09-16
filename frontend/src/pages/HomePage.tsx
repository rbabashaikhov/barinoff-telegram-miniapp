import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { MasterCard } from '../components/MasterCard';
import { ServiceCard } from '../components/ServiceCard';
import { useApp } from '../context/AppContext';
import { useDemoTour } from '../demo-tour/context';
import type { Master, Service } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const { isDemo, user } = useApp();
  const tour = useDemoTour();
  const [services, setServices] = useState<Service[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getServices(), api.getMasters()])
      .then(([servicesRes, mastersRes]) => {
        if (cancelled) return;
        setServices(servicesRes.data.slice(0, 3));
        setMasters(mastersRes.data);
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
      {isDemo && !tour.showChrome && (
        <div className="demo-banner">
          Demo mode · Клиент {user.firstName || user.username}
        </div>
      )}

      <section className="hero-block">
        <img className="hero-logo" src="/brand/logo.png" alt="Barinoff" />
        <p className="lead hero-tagline">
          Мы просто стрижём мужчин и делаем это превосходно.
        </p>

        <div className="barinoff-location">
          <span>Митино</span>
          <strong>Пятницкое шоссе, 21 к1</strong>
          <small>12 минут от метро · +7 977 624&nbsp;24&nbsp;11</small>
        </div>

        <Link className="btn btn-primary btn-block hero-cta" to="/services">
          Записаться
        </Link>
      </section>

      <section className="stack">
        <div className="row">
          <h2 className="section-title">Популярные услуги</h2>
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

      {!loading && !error && masters.length > 0 && (
        <section className="stack">
          <h2 className="section-title">Мастера</h2>
          {masters.map((master) => (
            <MasterCard key={master.id} master={master} onSelect={() => navigate('/services')} />
          ))}
        </section>
      )}

      <section className="about-block">
        <img className="about-photo" src="/brand/about-1.jpg" alt="" aria-hidden="true" />
        <p className="lead">
          Это не просто парикмахерская для мужчин, это место, где Вы сможете подчеркнуть свою
          внешнюю индивидуальность в тёплой дружеской атмосфере.
        </p>
      </section>

      <div className="footer-nav">
        <Link className="btn btn-secondary btn-block" to="/appointments">
          Мои записи
        </Link>
      </div>
    </div>
  );
}
