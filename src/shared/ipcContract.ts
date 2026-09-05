import type { SpeciesConfig } from './speciesSchema';

export const IPC = {
  SET_CLICK_THROUGH: 'pet:setClickThrough',
  DRAG_START: 'pet:dragStart',
  DRAG_MOVE: 'pet:dragMove',
  DRAG_END: 'pet:dragEnd',
  GET_WORK_AREA: 'pet:getWorkArea',
  GET_PLAYTIME: 'pet:getPlaytime',
  GET_STATS: 'pet:getStats',
  SET_STAT: 'pet:setStat',
  INCREMENT_STAT: 'pet:incrementStat',
  LOAD_SPECIES: 'species:load',
  TRAY_SHOW_HIDE: 'tray:toggleVisibility',
  QUIT_REQUESTED: 'app:quitRequested',
} as const;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragMovePayload {
  x: number;
  y: number;
}

export type LoadSpeciesPayload = SpeciesConfig;

export interface SetStatPayload {
  key: string;
  value: number;
}

export interface IncrementStatPayload {
  key: string;
  delta: number;
}

export interface PetAPI {
  setClickThrough(ignore: boolean): void;
  dragStart(): void;
  dragMove(payload: DragMovePayload): void;
  dragEnd(): void;
  getWorkArea(): Promise<Rect>;
  getPlaytimeMs(): Promise<number>;
  /**
   * Generic named-stat persistence — framework only, not wired into any
   * gameplay logic yet. See src/main/statsTracker.ts.
   */
  getStats(): Promise<Record<string, number>>;
  setStat(payload: SetStatPayload): void;
  incrementStat(payload: IncrementStatPayload): void;
  onSpeciesLoaded(callback: (species: LoadSpeciesPayload) => void): void;
  onVisibilityToggled(callback: (visible: boolean) => void): void;
  onQuitRequested(callback: () => void): void;
}
