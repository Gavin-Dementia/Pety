# Known Issues / Bugs

Tracks open problems and, for institutional memory, real bugs already found
and fixed. Deferred items below were consciously set aside during the
initial scaffold pass, not forgotten.

---

## Open — deferred

### 1. Interactive input not yet tested

Click-through-outside-the-sprite and drag-to-pick-up are implemented
(`src/renderer/InputController.ts`, `petWindow.ts`'s `setClickThrough()`)
but no human has actually hovered/dragged the running app to confirm they
work. Code review + the static render verification (Milestone 3/8 in
`roadmap.md`) are the only checks so far.

**To verify:** `npm run dev`, then: hover the sprite and confirm the
cursor icon/behavior changes; drag it across the screen; move off the
sprite and click a window underneath — it should register on that window,
not the pet.

### 2. Tray icon visibility unconfirmed

`TrayManager` creates a tray icon + menu (show/hide, quit), but it hasn't
been confirmed visible or clickable. Windows hides new tray icons in the
overflow "^" flyout by default, which would look identical to "tray
creation silently failed" from a screenshot alone.

**To verify:** open the overflow flyout, confirm "Window Pet" is there with
a working Show/Hide Pet + Quit menu.

### 3. Packaging icons missing

`build-resources/icon.ico` (Windows) and `icon.icns` (macOS) don't exist —
only a placeholder `icon.png` (`scripts/generate-app-icons.ps1`).
`electron-builder.yml` references both. `npm run package:win`/`package:mac`
will fail until they're generated (from real art, or a converted version of
the placeholder as a stopgap).

### 4. macOS / Linux never actually run

Every macOS-specific call (`setVisibleOnAllWorkspaces`, `app.dock.hide()`)
and Linux tray behavior note (`StatusNotifierItem` support varies by
desktop environment) is written to match documented Electron behavior, not
verified on those platforms. This machine is Windows-only.

---

## Fixed

### `file://` sprite images silently failed to load in dev

**Symptom:** the transparent overlay window was confirmed present and
correctly sized (via `EnumWindows`), but nothing rendered on screen —
no console error, no exception, just a blank transparent window.

**Root cause:** `speciesLoader.ts` originally resolved each animation's
`sheet` path to a `file://` URL via `pathToFileURL()`. In dev, the renderer
loads from `http://localhost:5173` (the Vite dev server) — and Chromium
hard-blocks `<img src="file://...">` loads from a non-`file://` page for
security reasons. The failure is silent: the `Image` object just never
fires `load`, so `AnimationController`/`PetRenderer` had nothing to draw
and no error surfaced anywhere.

**Fix:** added a custom privileged protocol, `pet-asset://`
(`src/main/assetProtocol.ts`), registered via
`protocol.registerSchemesAsPrivileged()` before `app.whenReady()` (with
`standard: true, secure: true, supportFetchAPI: true, corsEnabled: true`)
and served via `protocol.handle()` after ready, mapping
`pet-asset://species/<id>/<path>` to files under `assets/`.
`speciesLoader.ts` now resolves sheet paths to `pet-asset://` URLs instead
of `file://`. Works identically in dev (loaded via `http://localhost`) and
in a packaged app (loaded via a `file://`-rooted `index.html`), so there's
no dev-vs-prod branch to keep in sync.

**Verified:** screenshotted the running dev app after the fix — the
placeholder blob renders correctly, on top of other windows, confirming
both the asset load and the transparent/always-on-top window behavior at
once.
