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
    // idle -> sit is not in ALLOWED_TRANSITIONS
    expect(sm.transition('sit')).toBe(false);
    expect(sm.getState()).toBe('idle');
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

    expect(sm.transition('sit')).toBe(false); // idle -> sit not allowed
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
});
