import type { PetState } from '../shared/petState';

const ALLOWED_TRANSITIONS: Record<PetState, PetState[]> = {
  idle: ['walk', 'dragged', 'sleep'],
  walk: ['idle', 'dragged'],
  dragged: ['idle', 'sit'],
  sit: ['idle', 'walk', 'dragged'],
  sleep: ['idle', 'dragged'],
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
