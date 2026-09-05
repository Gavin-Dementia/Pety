import { describe, it, expect } from 'vitest';
import { ProgressionController } from './ProgressionController';
import type { ProgressionTier } from '../shared/speciesSchema';

const tiers: ProgressionTier[] = [
  {
    id: 'tier1',
    unlockAtMs: 1000,
    unlockedBehaviorStates: ['sit'],
    unlockedInteractions: ['poke'],
  },
  {
    id: 'tier2',
    unlockAtMs: 5000,
    unlockedBehaviorStates: ['sleep'],
    unlockedInteractions: [],
  },
];

describe('ProgressionController', () => {
  it('always includes idle even with zero playtime and no tiers', () => {
    const p = new ProgressionController([], 0);
    expect(p.getUnlockedIdleVariants()).toEqual(['idle']);
    expect(p.isInteractionUnlocked('poke')).toBe(false);
  });

  it('does not unlock a tier before its threshold', () => {
    const p = new ProgressionController(tiers, 500);
    expect(p.getUnlockedIdleVariants()).toEqual(['idle']);
    expect(p.isInteractionUnlocked('poke')).toBe(false);
  });

  it('unlocks tier1 exactly at its threshold', () => {
    const p = new ProgressionController(tiers, 1000);
    expect(p.getUnlockedIdleVariants().sort()).toEqual(['idle', 'sit']);
    expect(p.isInteractionUnlocked('poke')).toBe(true);
  });

  it('accumulates unlocks across multiple crossed tiers', () => {
    const p = new ProgressionController(tiers, 6000);
    expect(p.getUnlockedIdleVariants().sort()).toEqual(['idle', 'sit', 'sleep']);
  });

  it('advance() crosses a tier threshold over time', () => {
    const p = new ProgressionController(tiers, 900);
    expect(p.getUnlockedIdleVariants()).toEqual(['idle']);
    p.advance(150);
    expect(p.getPlaytimeMs()).toBe(1050);
    expect(p.getUnlockedIdleVariants().sort()).toEqual(['idle', 'sit']);
  });

  it('is order-independent for tier definition order', () => {
    const shuffled = [tiers[1], tiers[0]];
    const p = new ProgressionController(shuffled, 6000);
    expect(p.getUnlockedIdleVariants().sort()).toEqual(['idle', 'sit', 'sleep']);
  });
});
