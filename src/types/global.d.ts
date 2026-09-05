import type { PetAPI } from '../shared/ipcContract';

declare global {
  interface Window {
    petAPI: PetAPI;
  }
}

export {};
