import { describe, it, expect, vi } from 'vitest';
import { PetStateMachine } from './PetStateMachine';

describe('PetStateMachine', () => {
  it('starts in idle', () => {
    const sm = new PetStateMachine();
    expect(sm.getState()).toBe('idle');
  });

  it('allows a listed transition', () => {
    const sm = new PetStateMachine();
    expect(sm.transition('walk')).toBe(true);
    expect(sm.getState()).toBe('walk');
  });

  it('rejects a transition not in the allowed table', () => {
    const sm = new PetStateMachine();
    sm.transition('walk');
    // walk -> sit is not in ALLOWED_TRANSITIONS (idle is the hub for variants)
    expect(sm.transition('sit')).toBe(false);
    expect(sm.getState()).toBe('walk');
  });

  it('rejects transitioning to the same state', () => {
    const sm = new PetStateMachine();
    expect(sm.transition('idle')).toBe(false);
    expect(sm.getState()).toBe('idle');
  });

  it('notifies listeners only on a successful transition', () => {
    const sm = new PetStateMachine();
    const listener = vi.fn();
    sm.onChange(listener);

    expect(sm.transition('idle')).toBe(false); // same-state transition not allowed
    expect(listener).not.toHaveBeenCalled();

    expect(sm.transition('walk')).toBe(true);
    expect(listener).toHaveBeenCalledWith('walk', 'idle');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports the full drag/resume cycle used by BehaviorController', () => {
    const sm = new PetStateMachine();
    expect(sm.transition('dragged')).toBe(true);
    expect(sm.transition('sit')).toBe(true); // dragged -> sit is allowed
    expect(sm.transition('idle')).toBe(true);
    expect(sm.getState()).toBe('idle');
  });

  it('allows idle as the hub to every progression variant (sit/sleep/react)', () => {
    for (const variant of ['sit', 'sleep', 'react'] as const) {
      const sm = new PetStateMachine();
      expect(sm.transition(variant)).toBe(true);
      expect(sm.getState()).toBe(variant);
    }
  });

  it('react can only return to idle', () => {
    const sm = new PetStateMachine();
    sm.transition('react');
    expect(sm.transition('walk')).toBe(false);
    expect(sm.transition('idle')).toBe(true);
  });
});
