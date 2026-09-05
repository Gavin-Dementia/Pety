# Known Issues / Bugs

Tracks open problems and, for institutional memory, real bugs already found
and fixed. Deferred items below were consciously set aside during the
initial scaffold pass, not forgotten.

---

## Open — deferred

### 1. Interactive input — automated-verified, human confirmation still open

Click-through-outside-the-sprite and drag-to-pick-up are implemented
(`src/renderer/InputController.ts`, `petWindow.ts`'s `setClickThrough()`).
Verified once via simulated OS-level mouse input (`SetCursorPos` +
`mouse_event` from PowerShell): moved onto the sprite, held+dragged,
released, then located the sprite in a follow-up screenshot by its exact
placeholder color — its X position moved with the simulated drag (~118 of
an intended 150px), confirming hover → click-through-disable → drag-start →
position-update → render all actually fire. Y didn't move in that run,
likely a `SetCursorPos` coalescing artifact rather than a real bug (see
`roadmap.md` Milestone 4) — a real human drag would settle this
definitively.

**To verify:** `npm run dev`, then: hover the sprite and confirm the
cursor icon/behavior changes; drag it across the screen (both axes); move
off the sprite and click a window underneath — it should register on that
window, not the pet.

### 2. Tray icon visibility unconfirmed

`TrayManager` creates a tray icon + menu (show/hide, quit), but it hasn't
been confirmed visible or clickable. Windows hides new tray icons in the
overflow "^" flyout by default, which would look identical to "tray
creation silently failed" from a screenshot alone.

**To verify:** open the overflow flyout, confirm "Window Pet" is there with
a working Show/Hide Pet + Quit menu.

### 3. Packaging icons — Windows icon closed; `package:win` itself still blocked on this machine; macOS icon still open

`build-resources/icon.ico` is now generated
(`scripts/generate-windows-ico.ps1`, packs the placeholder `icon.png` into
a minimal valid ICO using the embedded-PNG format), and `electron-builder`
does get as far as producing a working, correctly-icon'd
`release/win-unpacked/Window Pet.exe` with `assets/` bundled correctly —
confirmed by running it. But `npm run package:win`'s actual NSIS/portable
installer step never runs: electron-builder unconditionally tries to fetch
and extract a `winCodeSign` tool bundle (macOS code-signing libraries,
irrelevant to an unsigned Windows build, but still fetched — setting
`CSC_IDENTITY_AUTO_DISCOVERY=false` did not skip it) and that archive
contains symlinks (`darwin/10.12/lib/libcrypto.dylib` etc.). Extracting
symlinks needs Windows' `SeCreateSymbolicLinkPrivilege`, which this account
doesn't have (no Developer Mode, not running elevated) — `7za.exe` fails
with `Cannot create symbolic link: A required privilege is not held by the
client.` on every retry, forever, for every one of several bundled signing
components in turn. Confirmed as a real, reproducible failure (`exit
code 1`), not just a slow download — a background run that superficially
looked like it "completed" was actually killed by an external timeout
mid-retry-loop, which is worth remembering: don't trust a background task's
reported exit code here without checking the log ends in an actual
success/failure line.

**Real fix, not yet applied (needs the user, requires elevation I don't
have):** enable Windows Developer Mode (Settings → Privacy & security →
For developers) or run the packaging command from an elevated terminal —
either grants the symlink privilege. `icon.icns` (macOS) is separately
still missing — generating it needs `iconutil`/`sips`, only available on
macOS.

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
