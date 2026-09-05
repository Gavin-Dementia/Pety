import { app } from 'electron';
import { PetWindowManager } from './petWindow';
import { TrayManager } from './trayManager';
import { registerIpcHandlers, sendSpeciesLoaded } from './ipcHandlers';
import { loadSpecies } from './speciesLoader';
import { registerAssetProtocolScheme, registerAssetProtocolHandler } from './assetProtocol';
import { ProgressionTracker } from './progressionTracker';

registerAssetProtocolScheme();

const windowManager = new PetWindowManager();
const trayManager = new TrayManager();
const progressionTracker = new ProgressionTracker();

function bootstrap(): void {
  registerAssetProtocolHandler();
  progressionTracker.start();
  const window = windowManager.create();
  registerIpcHandlers(windowManager, progressionTracker);

  trayManager.create({
    onToggleVisibility: () => windowManager.toggleVisibility(),
    isVisible: () => windowManager.isVisible(),
    onQuit: () => app.quit(),
  });

  window.webContents.once('did-finish-load', () => {
    const species = loadSpecies();
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
