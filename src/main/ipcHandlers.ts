import { ipcMain, type BrowserWindow } from 'electron';
import {
  IPC,
  type Rect,
  type SetStatPayload,
  type IncrementStatPayload,
} from '../shared/ipcContract';
import { getHomeWorkArea } from './displayBounds';
import type { PetWindowManager } from './petWindow';
import type { ProgressionTracker } from './progressionTracker';
import type { StatsTracker } from './statsTracker';

export function registerIpcHandlers(
  windowManager: PetWindowManager,
  progressionTracker: ProgressionTracker,
  statsTracker: StatsTracker,
): void {
  ipcMain.on(IPC.SET_CLICK_THROUGH, (_event, ignore: boolean) => {
    windowManager.setClickThrough(ignore);
  });

  ipcMain.handle(IPC.GET_WORK_AREA, (): Rect => getHomeWorkArea());
  ipcMain.handle(IPC.GET_PLAYTIME, (): number => progressionTracker.getTotalPlaytimeMs());

  ipcMain.handle(IPC.GET_STATS, (): Record<string, number> => statsTracker.getAll());
  ipcMain.on(IPC.SET_STAT, (_event, payload: SetStatPayload) => {
    statsTracker.set(payload.key, payload.value);
  });
  ipcMain.on(IPC.INCREMENT_STAT, (_event, payload: IncrementStatPayload) => {
    statsTracker.increment(payload.key, payload.delta);
  });

  // Drag start/move/end are renderer-local (the sprite moves via CSS transform
  // inside the fixed overlay window), so main has nothing to reposition. These
  // handlers exist so the contract has a place to grow into later (e.g. cross-
  // monitor drag) without changing the preload surface.
  ipcMain.on(IPC.DRAG_START, () => {});
  ipcMain.on(IPC.DRAG_MOVE, () => {});
  ipcMain.on(IPC.DRAG_END, () => {});
}

export function sendSpeciesLoaded(window: BrowserWindow, species: unknown): void {
  window.webContents.send(IPC.LOAD_SPECIES, species);
}

export function sendVisibilityToggled(window: BrowserWindow, visible: boolean): void {
  window.webContents.send(IPC.TRAY_SHOW_HIDE, visible);
}
