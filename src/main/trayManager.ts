import { app, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';

export class TrayManager {
  private tray: Tray | null = null;

  create(options: {
    onToggleVisibility: () => void;
    isVisible: () => boolean;
    onQuit: () => void;
  }): Tray {
    const iconPath = path.join(__dirname, '../../build-resources/tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    tray.setToolTip('Window Pet');

    const rebuildMenu = () => {
      const menu = Menu.buildFromTemplate([
        {
          label: options.isVisible() ? 'Hide Pet' : 'Show Pet',
          click: () => {
            options.onToggleVisibility();
            rebuildMenu();
          },
        },
        { type: 'separator' },
        { label: 'Settings…', enabled: false },
        { type: 'separator' },
        { label: `About Window Pet (v${app.getVersion()})`, enabled: false },
        { label: 'Quit', click: () => options.onQuit() },
      ]);
      tray.setContextMenu(menu);
    };

    rebuildMenu();
    this.tray = tray;
    return tray;
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }
}
