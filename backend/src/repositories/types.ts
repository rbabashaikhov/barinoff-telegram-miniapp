import type {
  AppointmentStatus,
  AppointmentWithDetails,
  BlockedSlot,
  BusyInterval,
  Master,
  Service,
  TelegramUser,
  WorkingHours,
} from '../types.js';

export interface ServicesRepository {
  listActive(): Service[];
  listAll(): Service[];
  getById(id: number): Service | undefined;
  getActiveById(id: number): Service | undefined;
}

export interface MastersRepository {
  listActive(serviceId?: number): Master[];
  listAll(): Master[];
  getById(id: number): Master | undefined;
  getActiveById(id: number): Master | undefined;
  offersService(masterId: number, serviceId: number): boolean;
}

export interface ClientsRepository {
  upsert(user: TelegramUser): { id: number; created: boolean };
}

export interface AppointmentListFilters {
  status?: AppointmentStatus;
  masterId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface AppointmentsRepository {
  getById(id: number): AppointmentWithDetails | undefined;
  listByTelegramUser(
    telegramUserId: number,
    options: { includePast: boolean; today: string; nowTime: string },
  ): AppointmentWithDetails[];
  listAdmin(filters?: AppointmentListFilters): AppointmentWithDetails[];
  listBusy(date: string, masterId: number): BusyInterval[];
  insert(params: {
    clientId: number;
    serviceId: number;
    masterId: number;
    date: string;
    startTime: string;
    endTime: string;
  }): AppointmentWithDetails;
  cancel(id: number): AppointmentWithDetails;
}

export interface WorkingHoursRepository {
  listAll(): WorkingHours[];
  listByMaster(masterId: number): WorkingHours[];
  getForWeekday(masterId: number, weekday: number): WorkingHours | null;
}

export interface BlockedSlotsRepository {
  list(filters?: { masterId?: number; date?: string }): BlockedSlot[];
  listBusy(date: string, masterId: number): BusyInterval[];
  create(params: {
    masterId: number;
    date: string;
    startTime: string;
    endTime: string;
    reason?: string | null;
  }): BlockedSlot;
  delete(id: number): boolean;
}

export interface Repositories {
  services: ServicesRepository;
  masters: MastersRepository;
  clients: ClientsRepository;
  appointments: AppointmentsRepository;
  workingHours: WorkingHoursRepository;
  blockedSlots: BlockedSlotsRepository;
  transaction<T>(fn: () => T): T;
}
