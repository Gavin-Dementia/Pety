import type { SpeciesBehaviorDef } from '../shared/speciesSchema';
import type { PetStateMachine } from './PetStateMachine';
import type { Rect, Vec2 } from './types';

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Timer-driven autonomous "AI": alternates idle/walk phases, moves the pet
 * within the work-area bounds, turning around at edges. Disabled while the
 * pet is being dragged; resumes (via a fresh idle phase) once released.
 */
export class BehaviorController {
  private position: Vec2;
  private direction: 1 | -1 = 1;
  private phaseRemainingMs = 0;

  constructor(
    private stateMachine: PetStateMachine,
    private behavior: SpeciesBehaviorDef,
    startPosition: Vec2,
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

  private beginIdlePhase(): void {
    this.phaseRemainingMs = randomBetween(this.behavior.idleMinMs, this.behavior.idleMaxMs);
    this.stateMachine.transition('idle');
  }

  private beginWalkPhase(): void {
    this.phaseRemainingMs = randomBetween(this.behavior.walkMinMs, this.behavior.walkMaxMs);
    this.direction = Math.random() < 0.5 ? -1 : 1;
    this.stateMachine.transition('walk');
  }

  /** Call once per frame while not being dragged. */
  update(deltaMs: number, bounds: Rect, spriteWidth: number): void {
    const state = this.stateMachine.getState();
    if (state !== 'idle' && state !== 'walk') return;

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
      if (state === 'idle') this.beginWalkPhase();
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
}
