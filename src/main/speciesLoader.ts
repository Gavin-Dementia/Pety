import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { isSpeciesConfig, type SpeciesConfig } from '../shared/speciesSchema';

export const ASSET_PROTOCOL = 'pet-asset';

export type SpeciesSource = 'bundled' | 'local';

export interface SpeciesListing {
  id: string;
  displayName: string;
  source: SpeciesSource;
}

/** Repo-tracked species, shipped with the app. */
export function getBundledSpeciesRoot(): string {
  // Dev: assets/ lives at the project root. Packaged: electron-builder copies it
  // next to resources (see electron-builder.yml extraResources).
  const assetsRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(app.getAppPath(), 'assets');
  return path.join(assetsRoot, 'species');
}

/**
 * User-imported species, entirely outside the git repo (this directory
 * has no relationship to the project checkout at all, unlike a
 * .gitignore'd folder inside it) — the sanctioned place for personal art
 * that should never be uploaded. See docs/setup.md.
 */
export function getLocalSpeciesRoot(): string {
  return path.join(app.getPath('userData'), 'species');
}

/** Call once at startup so the local species folder exists to drop files into. */
export function ensureLocalSpeciesRoot(): void {
  fs.mkdirSync(getLocalSpeciesRoot(), { recursive: true });
}

function listSpeciesInRoot(root: string, source: SpeciesSource): SpeciesListing[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const listings: SpeciesListing[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const configPath = path.join(root, entry.name, 'species.json');
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (isSpeciesConfig(parsed)) {
        listings.push({ id: parsed.id, displayName: parsed.displayName, source });
      }
    } catch {
      // Not a valid species folder — skip it silently rather than crash the tray.
    }
  }
  return listings;
}

/** Bundled + local species, local-overrides-bundled on a matching id. */
export function listAvailableSpecies(): SpeciesListing[] {
  const bundled = listSpeciesInRoot(getBundledSpeciesRoot(), 'bundled');
  const local = listSpeciesInRoot(getLocalSpeciesRoot(), 'local');

  const byId = new Map<string, SpeciesListing>();
  for (const listing of bundled) byId.set(listing.id, listing);
  for (const listing of local) byId.set(listing.id, listing); // local wins
  return [...byId.values()];
}

function findSpeciesDir(id: string): { dir: string; source: SpeciesSource } {
  const localDir = path.join(getLocalSpeciesRoot(), id);
  if (fs.existsSync(path.join(localDir, 'species.json'))) {
    return { dir: localDir, source: 'local' };
  }
  const bundledDir = path.join(getBundledSpeciesRoot(), id);
  return { dir: bundledDir, source: 'bundled' };
}

/**
 * Loads <root>/<id>/species.json (local root takes precedence over
 * bundled on a matching id), validates it, and resolves each animation's
 * sprite-sheet path to a pet-asset:// URL the renderer can load directly.
 */
export function loadSpecies(id: string): SpeciesConfig {
  const { dir, source } = findSpeciesDir(id);
  const configPath = path.join(dir, 'species.json');

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
        { ...def, sheet: `${ASSET_PROTOCOL}://${source}/${id}/${def.sheet}` },
      ]),
    ),
  };

  return resolved;
}
