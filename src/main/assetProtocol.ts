import { protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ASSET_PROTOCOL,
  getBundledSpeciesRoot,
  getLocalSpeciesRoot,
  type SpeciesSource,
} from './speciesLoader';

/**
 * Must be called before app.whenReady(). Registers pet-asset:// as a
 * privileged scheme so it behaves like a normal web-safe origin (loadable
 * from the http://localhost Vite dev server page, supports relative
 * fetches), sidestepping Chromium's hard block on file:// image loads from
 * non-file:// pages.
 */
export function registerAssetProtocolScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: ASSET_PROTOCOL,
      privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
    },
  ]);
}

/**
 * Must be called after app.whenReady(). Serves species sprite files from
 * either root, chosen by the URL's host segment
 * (pet-asset://<bundled|local>/<id>/<relative path>) — mirrors
 * speciesLoader's own bundled-vs-local resolution.
 */
export function registerAssetProtocolHandler(): void {
  protocol.handle(ASSET_PROTOCOL, (request) => {
    const url = new URL(request.url);
    const source = url.hostname as SpeciesSource;
    const root = source === 'local' ? getLocalSpeciesRoot() : getBundledSpeciesRoot();
    const resolved = path.normalize(path.join(root, url.pathname));

    if (!resolved.startsWith(path.normalize(root))) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(pathToFileURL(resolved).href);
  });
}
