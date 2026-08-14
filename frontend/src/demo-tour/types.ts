export type TourPlacement = 'top' | 'bottom' | 'auto';

export type TourAction = 'select-demo-service' | 'prepare-slots' | 'prepare-confirmation';

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  route?: string;
  placement?: TourPlacement;
  action?: TourAction;
  waitMs?: number;
}

export interface DemoTourDefinition {
  id: string;
  storageKey: string;
  steps: TourStep[];
  intro: {
    title: string;
    lead: string;
    bullets: string[];
    startLabel: string;
    skipLabel: string;
  };
  finish: {
    title: string;
    lead: string;
    bullets: string[];
    adminLabel: string;
    continueLabel: string;
    adminHint?: string;
    crmNote?: string;
  };
}
