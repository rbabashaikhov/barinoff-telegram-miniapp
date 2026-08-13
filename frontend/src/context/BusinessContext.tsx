import { createContext, useContext } from 'react';
import type { AppConfig } from '../types';

export const DEFAULT_APP_CONFIG: AppConfig = {
  businessName: 'Atelier Cut',
  businessType: 'barbershop',
  appTitle: 'Service Booking',
  appDescription: 'Онлайн-запись. Выберите услугу, мастера и удобное время.',
  timezone: 'Europe/Moscow',
  demoMode: true,
  adminProtected: false,
};

export const BusinessContext = createContext<AppConfig>(DEFAULT_APP_CONFIG);

export function useBusiness(): AppConfig {
  return useContext(BusinessContext);
}
