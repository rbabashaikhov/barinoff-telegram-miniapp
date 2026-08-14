import type { DemoTourDefinition } from './types';

interface DemoIntroProps {
  intro: DemoTourDefinition['intro'];
  onStart: () => void;
  onSkip: () => void;
}

export function DemoIntro({ intro, onStart, onSkip }: DemoIntroProps) {
  return (
    <div className="demo-sheet-backdrop" role="presentation">
      <div className="demo-sheet" role="dialog" aria-modal="true" aria-labelledby="demo-intro-title">
        <p className="eyebrow">Sales demo</p>
        <h2 id="demo-intro-title">{intro.title}</h2>
        <p className="lead">{intro.lead}</p>
        <ul className="demo-sheet-list">
          {intro.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div className="demo-sheet-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onStart}>
            {intro.startLabel}
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={onSkip}>
            {intro.skipLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
