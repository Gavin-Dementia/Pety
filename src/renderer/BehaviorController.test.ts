import { describe, it, expect, vi, afterEach } from 'vitest';
import { PetStateMachine } from './PetStateMachine';
import { BehaviorController } from './BehaviorController';
import type { SpeciesBehaviorDef } from '../shared/speciesSchema';
import type { Rect } from './types';

const bounds: Rect = { x: 0, y: 0, width: 100, height: 100 };
const spriteWidth = 10; // minX = 0, maxX = 90

function makeBehavior(overrides: Partial<SpeciesBehaviorDef> = {}): SpeciesBehaviorDef {
  return {
    walkSpeedPxPerSec: 100,
    idleMinMs: 0,
    idleMaxMs: 0,
    walkMinMs: 1000,
    walkMaxMs: 1000,
    spriteScale: 1,
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BehaviorController', () => {
  it('starts idle at the given position', () => {
    const sm = new PetStateMachine();
    const controller = new BehaviorController(sm, makeBehavior(), { x: 50, y: 50 });
    expect(sm.getState()).toBe('idle');
    expect(controller.getPosition()).toEqual({ x: 50, y: 50 });
  });

  it('clamps to the left bound and flips direction when walking off-screen', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // direction = -1 (walk left)
    const sm = new PetStateMachine();
    const controller = new BehaviorController(sm, makeBehavior(), { x: 50, y: 50 });

    // idleMinMs/idleMaxMs are 0, so this first tick immediately expires the
    // idle phase and enters 'walk' (direction chosen from the mocked random).
    controller.update(1, bounds, spriteWidth);
    expect(sm.getState()).toBe('walk');

    // Large enough step to overshoot the left bound.
    controller.update(2000, bounds, spriteWidth);
    expect(controller.getPosition().x).toBe(0);
  });

  it('clamps to the right bound when walking toward it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // direction = 1 (walk right)
    const sm = new PetStateMachine();
    const controller = new BehaviorController(sm, makeBehavior(), { x: 50, y: 50 });

    controller.update(1, bounds, spriteWidth);
    expect(sm.getState()).toBe('walk');

    controller.update(2000, bounds, spriteWidth);
    expect(controller.getPosition().x).toBe(90); // bounds.width - spriteWidth
  });

  it('does not move while dragged, even with a large deltaMs', () => {
    const sm = new PetStateMachine();
    const controller = new BehaviorController(sm, makeBehavior(), { x: 50, y: 50 });

    controller.interruptForDrag();
    expect(sm.getState()).toBe('dragged');

    controller.update(5000, bounds, spriteWidth);
    expect(controller.getPosition()).toEqual({ x: 50, y: 50 });
  });

  it('resumes idle after a drag ends', () => {
    const sm = new PetStateMachine();
    const controller = new BehaviorController(sm, makeBehavior(), { x: 50, y: 50 });

    controller.interruptForDrag();
    controller.resumeAfterDrag();
    expect(sm.getState()).toBe('idle');
  });

  it('setPosition overrides the tracked position (used by drag)', () => {
    const sm = new PetStateMachine();
    const controller = new BehaviorController(sm, makeBehavior(), { x: 50, y: 50 });

    controller.setPosition({ x: 12, y: 34 });
    expect(controller.getPosition()).toEqual({ x: 12, y: 34 });
  });

  it('picks an unlocked idle variant and still eventually starts walking', () => {
    // idleMin/Max and walkMin/Max collapsed to fixed values so the random
    // draw only decides which variant beginIdlePhase() picks, not durations.
    vi.spyOn(Math, 'random').mockReturnValue(0.6); // pool ['idle','sit'] -> index 1 -> 'sit'
    const sm = new PetStateMachine();
    const controller = new BehaviorController(
      sm,
      makeBehavior({ idleMinMs: 1000, idleMaxMs: 1000, walkMinMs: 1000, walkMaxMs: 1000 }),
      { x: 50, y: 50 },
      () => ['sit'],
    );
    expect(sm.getState()).toBe('sit');

    // The phase timer must keep counting down while sit-ing (IDLE_LIKE), not
    // just while plain 'idle' — otherwise it would sit forever.
    controller.update(1500, bounds, spriteWidth);
    expect(sm.getState()).toBe('walk');
  });

  it('react() transitions to react from idle, endReaction() returns to a fresh idle phase', () => {
    const sm = new PetStateMachine();
    const controller = new BehaviorController(sm, makeBehavior(), { x: 50, y: 50 });
    expect(sm.getState()).toBe('idle');

    controller.react();
    expect(sm.getState()).toBe('react');

    controller.endReaction();
    expect(sm.getState()).toBe('idle');
  });

  it('react() is a no-op while walking or dragged', () => {
    const sm = new PetStateMachine();
    const controller = new BehaviorController(
      sm,
      makeBehavior({ idleMinMs: 0, idleMaxMs: 0 }),
      { x: 50, y: 50 },
    );
    controller.update(1, bounds, spriteWidth);
    expect(sm.getState()).toBe('walk');
    controller.react();
    expect(sm.getState()).toBe('walk');

    controller.interruptForDrag();
    expect(sm.getState()).toBe('dragged');
    controller.react();
    expect(sm.getState()).toBe('dragged');
  });
});
