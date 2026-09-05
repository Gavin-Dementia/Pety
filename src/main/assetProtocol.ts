import { protocol, net } from 'electron';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ASSET_PROTOCOL, getAssetsRoot } from './speciesLoader';

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

/** Must be called after app.whenReady(). Serves files under assets/. */
export function registerAssetProtocolHandler(): void {
  const assetsRoot = getAssetsRoot();

  protocol.handle(ASSET_PROTOCOL, (request) => {
    const url = new URL(request.url);
    const relativePath = path.join(url.hostname, url.pathname);
    const resolved = path.normalize(path.join(assetsRoot, relativePath));

    if (!resolved.startsWith(path.normalize(assetsRoot))) {
      return new Response('Forbidden', { status: 403 });
    }

    return net.fetch(pathToFileURL(resolved).href);
  });
}
