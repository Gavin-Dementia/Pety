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
  return requiredBehaviorKeys.every((key) => typeof b[key] === 'number');
}
