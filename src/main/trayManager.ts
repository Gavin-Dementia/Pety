import { app, Menu, Tray, nativeImage } from 'electron';
import path from 'node:path';
import type { SpeciesListing } from './speciesLoader';

/**
 * build-resources/ is only used by electron-builder's own icon config at
 * build time by default — it is NOT bundled into a packaged app's
 * resources unless explicitly listed (see electron-builder.yml's
 * extraResources), so this can't just use a path relative to __dirname
 * the way dev mode happens to get away with (dist/ and build-resources/
 * are siblings in the repo, but not in a packaged app's layout).
 */
function getBuildResourcesRoot(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'build-resources')
    : path.join(app.getAppPath(), 'build-resources');
}

export class TrayManager {
  private tray: Tray | null = null;

  create(options: {
    onToggleVisibility: () => void;
    isVisible: () => boolean;
    onQuit: () => void;
    listSpecies: () => SpeciesListing[];
    getSelectedSpeciesId: () => string;
    onSelectSpecies: (id: string) => void;
  }): Tray {
    const iconPath = path.join(getBuildResourcesRoot(), 'tray-icon.png');
    const icon = nativeImage.createFromPath(iconPath);
    const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
    tray.setToolTip('Window Pet');

    const rebuildMenu = () => {
      const selectedId = options.getSelectedSpeciesId();
      const speciesSubmenu = options.listSpecies().map((species) => ({
        label: `${species.displayName} (${species.source})`,
        type: 'radio' as const,
        checked: species.id === selectedId,
        click: () => options.onSelectSpecies(species.id),
      }));

      const menu = Menu.buildFromTemplate([
        {
          label: options.isVisible() ? 'Hide Pet' : 'Show Pet',
          click: () => {
            options.onToggleVisibility();
            rebuildMenu();
          },
        },
        { type: 'separator' },
        {
          label: 'Species',
          submenu:
            speciesSubmenu.length > 0
              ? speciesSubmenu
              : [{ label: 'No species found', enabled: false }],
        },
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
