import type { Service } from '../types';
import { formatDuration, formatPrice } from '../lib/format';

interface ServiceCardProps {
  service: Service;
  selected?: boolean;
  onSelect?: (service: Service) => void;
}

export function ServiceCard({ service, selected, onSelect }: ServiceCardProps) {
  return (
    <button
      type="button"
      className={`service-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect?.(service)}
    >
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="meta">
        <span>{formatPrice(service.price)}</span>
        <span>{formatDuration(service.durationMinutes)}</span>
      </div>
    </button>
  );
}
