import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC,
  type PetAPI,
  type Rect,
  type LoadSpeciesPayload,
  type SetStatPayload,
  type IncrementStatPayload,
} from '../shared/ipcContract';

const petAPI: PetAPI = {
  setClickThrough(ignore: boolean) {
    ipcRenderer.send(IPC.SET_CLICK_THROUGH, ignore);
  },
  dragStart() {
    ipcRenderer.send(IPC.DRAG_START);
  },
  dragMove(payload) {
    ipcRenderer.send(IPC.DRAG_MOVE, payload);
  },
  dragEnd() {
    ipcRenderer.send(IPC.DRAG_END);
  },
  getWorkArea(): Promise<Rect> {
    return ipcRenderer.invoke(IPC.GET_WORK_AREA);
  },
  getPlaytimeMs(): Promise<number> {
    return ipcRenderer.invoke(IPC.GET_PLAYTIME);
  },
  getStats(): Promise<Record<string, number>> {
    return ipcRenderer.invoke(IPC.GET_STATS);
  },
  setStat(payload: SetStatPayload) {
    ipcRenderer.send(IPC.SET_STAT, payload);
  },
  incrementStat(payload: IncrementStatPayload) {
    ipcRenderer.send(IPC.INCREMENT_STAT, payload);
  },
  onSpeciesLoaded(callback: (species: LoadSpeciesPayload) => void) {
    ipcRenderer.on(IPC.LOAD_SPECIES, (_event, species: LoadSpeciesPayload) => callback(species));
  },
  onVisibilityToggled(callback: (visible: boolean) => void) {
    ipcRenderer.on(IPC.TRAY_SHOW_HIDE, (_event, visible: boolean) => callback(visible));
  },
  onQuitRequested(callback: () => void) {
    ipcRenderer.on(IPC.QUIT_REQUESTED, () => callback());
  },
};

contextBridge.exposeInMainWorld('petAPI', petAPI);
