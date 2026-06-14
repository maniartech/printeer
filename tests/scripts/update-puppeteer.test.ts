/**
 * Unit coverage for the Puppeteer updater's pure decision logic.
 * (The IO/rollback orchestration is exercised by the script itself in CI.)
 */

import { describe, it, expect } from 'vitest';
import { compareVersions, planUpgrade } from '../../scripts/update-puppeteer.mjs';

describe('update-puppeteer planner', () => {
  it('compareVersions orders semver correctly', () => {
    expect(compareVersions('19.5.2', '25.1.0')).toBe(-1);
    expect(compareVersions('25.1.0', '19.5.2')).toBe(1);
    expect(compareVersions('25.1.0', '25.1.0')).toBe(0);
    expect(compareVersions('^19.5.2', '19.5.10')).toBe(-1); // strips caret, numeric compare
    expect(compareVersions('2.0.0', '10.0.0')).toBe(-1); // not lexicographic
  });

  it('planUpgrade returns upgrade when behind latest', () => {
    expect(planUpgrade('19.5.2', '25.1.0')).toMatchObject({ action: 'upgrade', to: '25.1.0' });
  });

  it('planUpgrade is idempotent when already current (noop)', () => {
    expect(planUpgrade('25.1.0', '25.1.0').action).toBe('noop');
    expect(planUpgrade('25.2.0', '25.1.0').action).toBe('noop'); // ahead of latest
  });

  it('planUpgrade reports an error when latest is unknown', () => {
    expect(planUpgrade('19.5.2', '').action).toBe('error');
  });
});
