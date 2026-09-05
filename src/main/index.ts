import { app } from 'electron';
import { PetWindowManager } from './petWindow';
import { TrayManager } from './trayManager';
import { registerIpcHandlers, sendSpeciesLoaded } from './ipcHandlers';
import { loadSpecies, listAvailableSpecies, ensureLocalSpeciesRoot } from './speciesLoader';
import { registerAssetProtocolScheme, registerAssetProtocolHandler } from './assetProtocol';
import { ProgressionTracker } from './progressionTracker';
import { StatsTracker } from './statsTracker';
import { AppSettings } from './appSettings';

const FALLBACK_SPECIES_ID = 'placeholder';

registerAssetProtocolScheme();

const windowManager = new PetWindowManager();
const trayManager = new TrayManager();
const progressionTracker = new ProgressionTracker();
const statsTracker = new StatsTracker();
const appSettings = new AppSettings();

function bootstrap(): void {
  registerAssetProtocolHandler();
  ensureLocalSpeciesRoot();
  appSettings.load();
  statsTracker.load();
  progressionTracker.start();

  const window = windowManager.create();
  registerIpcHandlers(windowManager, progressionTracker, statsTracker);

  trayManager.create({
    onToggleVisibility: () => windowManager.toggleVisibility(),
    isVisible: () => windowManager.isVisible(),
    onQuit: () => app.quit(),
    listSpecies: () => listAvailableSpecies(),
    getSelectedSpeciesId: () => appSettings.getSelectedSpeciesId(),
    onSelectSpecies: (id) => {
      appSettings.setSelectedSpeciesId(id);
      app.relaunch();
      app.exit(0);
    },
  });

  window.webContents.once('did-finish-load', () => {
    const speciesId = process.env.PET_SPECIES_ID ?? appSettings.getSelectedSpeciesId();
    let species;
    try {
      species = loadSpecies(speciesId);
    } catch (error) {
      // The persisted/requested species may no longer exist (e.g. its local
      // folder was deleted after being selected) — fall back rather than
      // crash on startup, and self-heal the persisted choice so this
      // doesn't recur every launch.
      console.error(`Failed to load species "${speciesId}", falling back to "${FALLBACK_SPECIES_ID}":`, error);
      appSettings.setSelectedSpeciesId(FALLBACK_SPECIES_ID);
      species = loadSpecies(FALLBACK_SPECIES_ID);
    }
    sendSpeciesLoaded(window, species);
  });
}

app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  // Desktop pet has no meaningful "no windows" state on any platform; quitting
  // is driven by the tray's Quit item, not window close.
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  progressionTracker.stop();
});
