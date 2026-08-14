import { describe, expect, it } from 'vitest';
import { barberDemoTour } from './barberTour';
import { chooseTooltipPlacement } from './placement';

describe('tooltip placement', () => {
  it('prefers the side with enough room so the tooltip does not cover the target', () => {
    expect(
      chooseTooltipPlacement({
        targetTop: 500,
        targetBottom: 580,
        tooltipHeight: 160,
        viewportHeight: 700,
        preferred: 'top',
      }),
    ).toBe('top');

    expect(
      chooseTooltipPlacement({
        targetTop: 40,
        targetBottom: 120,
        tooltipHeight: 160,
        viewportHeight: 700,
        preferred: 'top',
      }),
    ).toBe('bottom');
  });
});

describe('barber sales tour', () => {
  it('covers the five selling points with stable hooks', () => {
    expect(barberDemoTour.steps.map((step) => step.target)).toEqual([
      'service-selection',
      'master-selection',
      'available-slots',
      'booking-confirmation',
      'my-appointments',
    ]);
    expect(barberDemoTour.steps).toHaveLength(5);
    expect(barberDemoTour.storageKey).toBe('barber.salesDemoTour.v1');
  });
});
