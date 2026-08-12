import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import WebApp from '@twa-dev/sdk';
import App from './App';
import { setTelegramInitData } from './api/client';
import { AppContext, type AppContextValue } from './context/AppContext';
import { BookingProvider } from './context/BookingContext';
import './styles.css';

const DEMO_USER = {
  id: 999000001,
  username: 'demo_client',
  firstName: 'Demo',
  lastName: 'Client',
};

function Root() {
  const [ready, setReady] = useState(false);
  const [context, setContext] = useState<AppContextValue>({
    user: DEMO_USER,
    isDemo: true,
    isTelegram: false,
  });

  useEffect(() => {
    try {
      const tg = WebApp;
      tg.ready();
      tg.expand();

      const initData = tg.initData || '';
      const user = tg.initDataUnsafe?.user;

      if (initData && user?.id) {
        setTelegramInitData(initData);
        setContext({
          user: {
            id: user.id,
            username: user.username,
            firstName: user.first_name,
            lastName: user.last_name,
          },
          isDemo: false,
          isTelegram: true,
        });

        if (tg.themeParams?.bg_color) {
          document.documentElement.style.setProperty(
            '--tg-bg',
            tg.themeParams.bg_color,
          );
        }
      } else {
        setTelegramInitData('');
        setContext({
          user: DEMO_USER,
          isDemo: true,
          isTelegram: false,
        });
      }
    } catch {
      setTelegramInitData('');
      setContext({
        user: DEMO_USER,
        isDemo: true,
        isTelegram: false,
      });
    } finally {
      setReady(true);
    }
  }, []);

  const value = useMemo(() => context, [context]);

  if (!ready) {
    return <div className="app-shell"><div className="loading">Загрузка…</div></div>;
  }

  return (
    <AppContext.Provider value={value}>
      <BookingProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </BookingProvider>
    </AppContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
