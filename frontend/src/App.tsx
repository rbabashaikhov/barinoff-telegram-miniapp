import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AdminPage } from './pages/AdminPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ConfirmPage } from './pages/ConfirmPage';
import { DatePage } from './pages/DatePage';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { SuccessPage } from './pages/SuccessPage';
import { TimePage } from './pages/TimePage';

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className={isAdmin ? undefined : 'app-shell'}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/booking/date" element={<DatePage />} />
        <Route path="/booking/time" element={<TimePage />} />
        <Route path="/booking/confirm" element={<ConfirmPage />} />
        <Route path="/booking/success" element={<SuccessPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
