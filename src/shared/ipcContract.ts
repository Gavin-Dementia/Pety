import type { SpeciesConfig } from './speciesSchema';

export const IPC = {
  SET_CLICK_THROUGH: 'pet:setClickThrough',
  DRAG_START: 'pet:dragStart',
  DRAG_MOVE: 'pet:dragMove',
  DRAG_END: 'pet:dragEnd',
  GET_WORK_AREA: 'pet:getWorkArea',
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

export interface PetAPI {
  setClickThrough(ignore: boolean): void;
  dragStart(): void;
  dragMove(payload: DragMovePayload): void;
  dragEnd(): void;
  getWorkArea(): Promise<Rect>;
  onSpeciesLoaded(callback: (species: LoadSpeciesPayload) => void): void;
  onVisibilityToggled(callback: (visible: boolean) => void): void;
  onQuitRequested(callback: () => void): void;
}
