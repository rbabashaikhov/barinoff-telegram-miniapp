import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DemoChrome } from './demo-tour/DemoChrome';
import { useDemoTour } from './demo-tour/context';
import { isSalesDemoAdminPath } from './demo-tour/eligibility';
import { AdminPage } from './pages/AdminPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { ConfirmPage } from './pages/ConfirmPage';
import { DatePage } from './pages/DatePage';
import { DemoAdminPage } from './pages/DemoAdminPage';
import { HomePage } from './pages/HomePage';
import { MasterPage } from './pages/MasterPage';
import { ServicesPage } from './pages/ServicesPage';
import { SuccessPage } from './pages/SuccessPage';
import { TimePage } from './pages/TimePage';

export default function App() {
  const location = useLocation();
  const isAdmin = isSalesDemoAdminPath(location.pathname);
  const tour = useDemoTour();

  return (
    <div className={isAdmin ? undefined : 'app-shell'}>
      {tour.showChrome && (
        <DemoChrome
          showTour={tour.demoTourEnabled}
          showAdmin={tour.demoAdminPreviewEnabled}
          onStartTour={tour.start}
        />
      )}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/booking/master" element={<MasterPage />} />
        <Route path="/booking/date" element={<DatePage />} />
        <Route path="/booking/time" element={<TimePage />} />
        <Route path="/booking/confirm" element={<ConfirmPage />} />
        <Route path="/booking/success" element={<SuccessPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/demo/admin" element={<DemoAdminPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
