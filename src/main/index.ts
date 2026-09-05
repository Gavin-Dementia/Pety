import { app, type BrowserWindow } from 'electron';
import { PetWindowManager } from './petWindow';
import { TrayManager } from './trayManager';
import { registerIpcHandlers, sendSpeciesLoaded } from './ipcHandlers';
import {
  loadSpecies,
  listAvailableSpecies,
  ensureLocalSpeciesRoot,
  watchSpecies,
} from './speciesLoader';
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
let unwatchSpecies: (() => void) | null = null;

/**
 * Loads the requested species, falling back (and self-healing the
 * persisted selection) if it no longer exists — e.g. its local folder was
 * deleted, or (for reloads) a species.json edit briefly leaves it invalid
 * mid-save.
 */
function loadSpeciesWithFallback(id: string) {
  try {
    return loadSpecies(id);
  } catch (error) {
    console.error(`Failed to load species "${id}", falling back to "${FALLBACK_SPECIES_ID}":`, error);
    if (id !== FALLBACK_SPECIES_ID) appSettings.setSelectedSpeciesId(FALLBACK_SPECIES_ID);
    return loadSpecies(FALLBACK_SPECIES_ID);
  }
}

/**
 * Watches the active species' own folder and re-sends it on any change —
 * lets a user iterate on their local species' species.json/sprites without
 * restarting the app. Not a remote-update mechanism (deliberately out of
 * scope, see docs/roadmap.md) — purely local file watching for editing
 * convenience.
 *
 * Deliberately does NOT use loadSpeciesWithFallback/touch the persisted
 * selection here: a save that's briefly invalid mid-write (partial JSON,
 * an editor's atomic-replace window) should just be skipped and retried
 * on the next change, not silently switch the user's selected species —
 * that self-healing behavior is only appropriate at startup.
 */
function watchActiveSpecies(window: BrowserWindow, speciesId: string): void {
  unwatchSpecies?.();
  unwatchSpecies = watchSpecies(speciesId, () => {
    try {
      sendSpeciesLoaded(window, loadSpecies(speciesId));
    } catch (error) {
      console.error(`Species "${speciesId}" reload failed, keeping the last good version:`, error);
    }
  });
}

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
    sendSpeciesLoaded(window, loadSpeciesWithFallback(speciesId));
    watchActiveSpecies(window, speciesId);
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
  unwatchSpecies?.();
});
