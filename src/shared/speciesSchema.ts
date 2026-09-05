import type { PetState } from './petState';

/**
 * A single animation's sprite-sheet definition. Frames are laid out left-to-right
 * in one row of `sheet`, each `frameWidth x frameHeight` pixels.
 */
export interface SpeciesAnimationDef {
  sheet: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  fps: number;
  loop: boolean;
}

export interface SpeciesBehaviorDef {
  walkSpeedPxPerSec: number;
  idleMinMs: number;
  idleMaxMs: number;
  walkMinMs: number;
  walkMaxMs: number;
  spriteScale: number;
}

export interface SpeciesAttribution {
  author: string;
  license: string;
  sourceUrl?: string;
}

/**
 * A playtime-gated unlock: once cumulative app-open runtime reaches
 * unlockAtMs, unlockedBehaviorStates become eligible idle-phase variants
 * (see BehaviorController.beginIdlePhase) and unlockedInteractions become
 * available (see InputController's isInteractionUnlocked checks, e.g. the
 * "poke" interaction id). Tiers are content, not engine config — new ones
 * need no code changes.
 */
export interface ProgressionTier {
  id: string;
  unlockAtMs: number;
  unlockedBehaviorStates: PetState[];
  unlockedInteractions: string[];
}

/**
 * The content contract for a creature. New creatures are added purely as new
 * files under assets/species/<id>/ plus one of these config objects — no
 * engine code changes required. This is the intended extension point for
 * swapping in real art later.
 */
export interface SpeciesConfig {
  id: string;
  displayName: string;
  version: string;
  animations: Partial<Record<PetState, SpeciesAnimationDef>>;
  behavior: SpeciesBehaviorDef;
  attribution?: SpeciesAttribution;
  progression?: ProgressionTier[];
}

export function isSpeciesConfig(value: unknown): value is SpeciesConfig {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.displayName !== 'string') return false;
  if (typeof v.version !== 'string') return false;
  if (typeof v.animations !== 'object' || v.animations === null) return false;
  if (typeof v.behavior !== 'object' || v.behavior === null) return false;
  const b = v.behavior as Record<string, unknown>;
  const requiredBehaviorKeys: (keyof SpeciesBehaviorDef)[] = [
    'walkSpeedPxPerSec',
    'idleMinMs',
    'idleMaxMs',
    'walkMinMs',
    'walkMaxMs',
    'spriteScale',
  ];
  if (!requiredBehaviorKeys.every((key) => typeof b[key] === 'number')) return false;

  if (v.progression !== undefined) {
    if (!Array.isArray(v.progression)) return false;
    const validTier = (t: unknown): boolean => {
      if (typeof t !== 'object' || t === null) return false;
      const tier = t as Record<string, unknown>;
      return (
        typeof tier.id === 'string' &&
        typeof tier.unlockAtMs === 'number' &&
        Array.isArray(tier.unlockedBehaviorStates) &&
        Array.isArray(tier.unlockedInteractions)
      );
    };
    if (!v.progression.every(validTier)) return false;
  }

  return true;
}
