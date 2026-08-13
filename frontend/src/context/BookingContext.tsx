import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Master, Service } from '../types';

interface BookingState {
  service: Service | null;
  master: Master | null;
  date: string | null;
  startTime: string | null;
  setService: (service: Service) => void;
  setMaster: (master: Master) => void;
  setDate: (date: string) => void;
  setStartTime: (time: string) => void;
  reset: () => void;
}

const BookingContext = createContext<BookingState | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [service, setServiceState] = useState<Service | null>(null);
  const [master, setMasterState] = useState<Master | null>(null);
  const [date, setDateState] = useState<string | null>(null);
  const [startTime, setStartTimeState] = useState<string | null>(null);

  const value = useMemo<BookingState>(
    () => ({
      service,
      master,
      date,
      startTime,
      setService: (next) => {
        setServiceState(next);
        setMasterState(null);
        setDateState(null);
        setStartTimeState(null);
      },
      setMaster: (next) => {
        setMasterState(next);
        setDateState(null);
        setStartTimeState(null);
      },
      setDate: (next) => {
        setDateState(next);
        setStartTimeState(null);
      },
      setStartTime: setStartTimeState,
      reset: () => {
        setServiceState(null);
        setMasterState(null);
        setDateState(null);
        setStartTimeState(null);
      },
    }),
    [service, master, date, startTime],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking(): BookingState {
  const ctx = useContext(BookingContext);
  if (!ctx) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return ctx;
}
