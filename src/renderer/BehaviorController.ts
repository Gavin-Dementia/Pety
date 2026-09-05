import type { PetState } from '../shared/petState';
import type { SpeciesBehaviorDef } from '../shared/speciesSchema';
import type { PetStateMachine } from './PetStateMachine';
import type { Rect, Vec2 } from './types';

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// States BehaviorController treats as "waiting" (phase timer counts down,
// eventually starts a walk phase) rather than "moving" (walk) or
// externally driven (dragged/react).
const IDLE_LIKE: readonly PetState[] = ['idle', 'sit', 'sleep'];

/**
 * Timer-driven autonomous "AI": alternates idle-like/walk phases, moves the
 * pet within the work-area bounds, turning around at edges. Disabled while
 * the pet is being dragged or reacting to a poke; resumes (via a fresh
 * idle-like phase) once released/finished.
 */
export class BehaviorController {
  private position: Vec2;
  private direction: 1 | -1 = 1;
  private phaseRemainingMs = 0;

  constructor(
    private stateMachine: PetStateMachine,
    private behavior: SpeciesBehaviorDef,
    startPosition: Vec2,
    private getUnlockedIdleVariants: () => PetState[] = () => ['idle'],
  ) {
    this.position = { ...startPosition };
    this.beginIdlePhase();
  }

  getPosition(): Vec2 {
    return this.position;
  }

  setPosition(position: Vec2): void {
    this.position = position;
  }

  /**
   * Hubs through 'idle' (always a legal transition per PetStateMachine's
   * table), then, if a variant other than plain idle gets picked, hops
   * there. 'idle' is weighted into the pick pool twice so unlocking sit/
   * sleep doesn't make the pet constantly switch poses.
   */
  private beginIdlePhase(): void {
    this.phaseRemainingMs = randomBetween(this.behavior.idleMinMs, this.behavior.idleMaxMs);
    this.stateMachine.transition('idle');

    const variants = this.getUnlockedIdleVariants();
    const pool: PetState[] = ['idle', ...variants];
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (chosen !== 'idle') this.stateMachine.transition(chosen);
  }

  private beginWalkPhase(): void {
    this.phaseRemainingMs = randomBetween(this.behavior.walkMinMs, this.behavior.walkMaxMs);
    this.direction = Math.random() < 0.5 ? -1 : 1;
    this.stateMachine.transition('walk');
  }

  /** Call once per frame while not being dragged or reacting. */
  update(deltaMs: number, bounds: Rect, spriteWidth: number): void {
    const state = this.stateMachine.getState();
    const isIdleLike = IDLE_LIKE.includes(state);
    if (!isIdleLike && state !== 'walk') return;

    this.phaseRemainingMs -= deltaMs;

    if (state === 'walk') {
      const deltaPx = this.behavior.walkSpeedPxPerSec * (deltaMs / 1000) * this.direction;
      let nextX = this.position.x + deltaPx;

      const minX = bounds.x;
      const maxX = bounds.x + bounds.width - spriteWidth;
      if (nextX <= minX) {
        nextX = minX;
        this.direction = 1;
      } else if (nextX >= maxX) {
        nextX = maxX;
        this.direction = -1;
      }
      this.position = { ...this.position, x: nextX };
    }

    if (this.phaseRemainingMs <= 0) {
      if (isIdleLike) this.beginWalkPhase();
      else this.beginIdlePhase();
    }
  }

  /** Called when a drag interaction begins; halts autonomous movement. */
  interruptForDrag(): void {
    this.stateMachine.transition('dragged');
  }

  /** Called when a drag interaction ends; resumes autonomous behavior. */
  resumeAfterDrag(): void {
    this.stateMachine.transition('idle');
    this.beginIdlePhase();
  }

  /** Triggered by a poke; only fires from an idle-like state. */
  react(): void {
    const state = this.stateMachine.getState();
    if (!IDLE_LIKE.includes(state)) return;
    if (state !== 'idle') this.stateMachine.transition('idle');
    this.stateMachine.transition('react');
  }

  /** Called once the react animation finishes playing (see main.ts's tick loop). */
  endReaction(): void {
    this.stateMachine.transition('idle');
    this.beginIdlePhase();
  }
}
