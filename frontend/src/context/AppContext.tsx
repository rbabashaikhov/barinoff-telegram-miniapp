import { createContext, useContext } from 'react';

export interface TelegramUserInfo {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface AppContextValue {
  user: TelegramUserInfo;
  isDemo: boolean;
  isTelegram: boolean;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
