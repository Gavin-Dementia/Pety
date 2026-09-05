import type { PetState } from '../shared/petState';
import type { ProgressionTier } from '../shared/speciesSchema';

/**
 * Tracks playtime-gated unlocks client-side. Seeded once from main's
 * authoritative persisted total (via petAPI.getPlaytimeMs()), then advanced
 * locally by each tick's deltaMs — cheap, and any drift versus main's
 * persisted value self-corrects on the next app restart when it reseeds.
 */
export class ProgressionController {
  private readonly tiers: ProgressionTier[];
  private playtimeMs: number;

  constructor(tiers: ProgressionTier[], initialPlaytimeMs: number) {
    this.tiers = [...tiers].sort((a, b) => a.unlockAtMs - b.unlockAtMs);
    this.playtimeMs = initialPlaytimeMs;
  }

  advance(deltaMs: number): void {
    this.playtimeMs += deltaMs;
  }

  getPlaytimeMs(): number {
    return this.playtimeMs;
  }

  private unlockedTiers(): ProgressionTier[] {
    return this.tiers.filter((tier) => this.playtimeMs >= tier.unlockAtMs);
  }

  /** Always includes 'idle', regardless of tiers. */
  getUnlockedIdleVariants(): PetState[] {
    const fromTiers = this.unlockedTiers().flatMap((tier) => tier.unlockedBehaviorStates);
    return [...new Set<PetState>(['idle', ...fromTiers])];
  }

  isInteractionUnlocked(id: string): boolean {
    return this.unlockedTiers().some((tier) => tier.unlockedInteractions.includes(id));
  }
}
