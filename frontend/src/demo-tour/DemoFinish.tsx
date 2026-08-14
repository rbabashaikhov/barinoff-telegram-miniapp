import type { DemoTourDefinition } from './types';

interface DemoFinishProps {
  finish: DemoTourDefinition['finish'];
  showAdmin: boolean;
  onAdmin: () => void;
  onContinue: () => void;
}

export function DemoFinish({ finish, showAdmin, onAdmin, onContinue }: DemoFinishProps) {
  return (
    <div className="demo-sheet-backdrop" role="presentation">
      <div className="demo-sheet" role="dialog" aria-modal="true" aria-labelledby="demo-finish-title">
        <p className="eyebrow">Sales demo</p>
        <h2 id="demo-finish-title">{finish.title}</h2>
        <p className="lead">{finish.lead}</p>
        <ul className="demo-sheet-checks">
          {finish.bullets.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
        {showAdmin && finish.adminHint && (
          <p className="muted" style={{ margin: '0 0 12px' }}>
            {finish.adminHint}
          </p>
        )}
        {finish.crmNote && (
          <p className="muted" style={{ margin: '0 0 12px' }}>
            {finish.crmNote}
          </p>
        )}
        <div className="demo-sheet-actions">
          {showAdmin && (
            <button type="button" className="btn btn-primary btn-block" onClick={onAdmin}>
              {finish.adminLabel}
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-block" onClick={onContinue}>
            {finish.continueLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
