import type { PetState } from '../shared/petState';

// Hub-and-spoke through 'idle': every state that isn't 'idle' can only
// return to 'idle' (or, for 'walk'/'dragged', their own special cases).
// Idle-variant behaviors (sit/sleep/react) are reached by hopping from
// 'idle', never directly from each other — see docs/roadmap.md's
// progression milestone for why (keeps this table small as more variants
// get added later purely as species content).
const ALLOWED_TRANSITIONS: Record<PetState, PetState[]> = {
  idle: ['walk', 'dragged', 'sleep', 'sit', 'react'],
  walk: ['idle', 'dragged'],
  dragged: ['idle', 'sit'],
  sit: ['idle', 'walk', 'dragged'],
  sleep: ['idle', 'dragged'],
  react: ['idle'],
};

type StateChangeListener = (next: PetState, previous: PetState) => void;

export class PetStateMachine {
  private current: PetState = 'idle';
  private listeners: StateChangeListener[] = [];

  getState(): PetState {
    return this.current;
  }

  /** Returns true if the transition happened, false if it was not allowed. */
  transition(next: PetState): boolean {
    if (next === this.current) return false;
    if (!ALLOWED_TRANSITIONS[this.current].includes(next)) return false;

    const previous = this.current;
    this.current = next;
    for (const listener of this.listeners) listener(next, previous);
    return true;
  }

  onChange(listener: StateChangeListener): void {
    this.listeners.push(listener);
  }
}
