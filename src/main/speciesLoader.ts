import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { isSpeciesConfig, type SpeciesConfig } from '../shared/speciesSchema';

const DEFAULT_SPECIES_ID = process.env.PET_SPECIES_ID ?? 'placeholder';

export const ASSET_PROTOCOL = 'pet-asset';

export function getAssetsRoot(): string {
  // Dev: assets/ lives at the project root. Packaged: electron-builder copies it
  // next to resources (see electron-builder.yml extraResources).
  return app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(app.getAppPath(), 'assets');
}

/**
 * Loads assets/species/<id>/species.json, validates it, and resolves each
 * animation's sprite-sheet path to an absolute file:// URL the renderer can
 * load directly (renderer never touches the filesystem itself).
 */
export function loadSpecies(id: string = DEFAULT_SPECIES_ID): SpeciesConfig {
  const speciesDir = path.join(getAssetsRoot(), 'species', id);
  const configPath = path.join(speciesDir, 'species.json');

  const raw = fs.readFileSync(configPath, 'utf-8');
  const parsed: unknown = JSON.parse(raw);

  if (!isSpeciesConfig(parsed)) {
    throw new Error(`Invalid species config at ${configPath}`);
  }

  const resolved: SpeciesConfig = {
    ...parsed,
    animations: Object.fromEntries(
      Object.entries(parsed.animations).map(([state, def]) => [
        state,
        { ...def, sheet: `${ASSET_PROTOCOL}://species/${id}/${def.sheet}` },
      ]),
    ),
  };

  return resolved;
}
