import { app } from 'electron';
import { PetWindowManager } from './petWindow';
import { TrayManager } from './trayManager';
import { registerIpcHandlers, sendSpeciesLoaded } from './ipcHandlers';
import { loadSpecies } from './speciesLoader';
import { registerAssetProtocolScheme, registerAssetProtocolHandler } from './assetProtocol';

registerAssetProtocolScheme();

const windowManager = new PetWindowManager();
const trayManager = new TrayManager();

function bootstrap(): void {
  registerAssetProtocolHandler();
  const window = windowManager.create();
  registerIpcHandlers(windowManager);

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
