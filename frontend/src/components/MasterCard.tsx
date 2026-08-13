import type { Master } from '../types';

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface MasterCardProps {
  master: Master;
  selected?: boolean;
  onSelect?: (master: Master) => void;
}

export function MasterCard({ master, selected, onSelect }: MasterCardProps) {
  return (
    <button
      type="button"
      className={`master-card${selected ? ' selected' : ''}`}
      onClick={() => onSelect?.(master)}
    >
      <span className="master-avatar" aria-hidden>
        {initials(master.name)}
      </span>
      <span className="master-copy">
        <strong>{master.name}</strong>
        <span className="master-role">{master.role}</span>
        <span className="master-desc">{master.description}</span>
      </span>
    </button>
  );
}
