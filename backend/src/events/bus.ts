import { logger } from '../logger.js';
import type { AppEvent, AppEventType, EventHandler } from './types.js';

type HandlerMap = {
  [K in AppEventType]?: Array<EventHandler<Extract<AppEvent, { type: K }>>>;
};

export class EventBus {
  private handlers: HandlerMap = {};

  on<T extends AppEventType>(
    type: T,
    handler: EventHandler<Extract<AppEvent, { type: T }>>,
  ): () => void {
    const list = (this.handlers[type] as Array<typeof handler> | undefined) ?? [];
    list.push(handler);
    this.handlers[type] = list as HandlerMap[T];
    return () => {
      this.handlers[type] = (this.handlers[type] as Array<typeof handler>).filter(
        (item) => item !== handler,
      ) as HandlerMap[T];
    };
  }

  async emit(event: AppEvent): Promise<void> {
    const list = this.handlers[event.type] ?? [];
    await Promise.allSettled(
      list.map(async (handler) => {
        try {
          await (handler as EventHandler)(event);
        } catch (error) {
          logger.error('Event handler failed', {
            type: event.type,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }),
    );
  }

  clear(): void {
    this.handlers = {};
  }
}

export const eventBus = new EventBus();
