# Known Issues / Bugs

Tracks open problems and, for institutional memory, real bugs already found
and fixed. Deferred items below were consciously set aside during the
initial scaffold pass, not forgotten.

---

## Open — deferred

### 1. Interactive input — earlier "verified" claim retracted; real human testing still needed

**Correction to this file's own history:** an earlier pass here claimed
click-through + drag were "automated-verified" via simulated OS-level mouse
input (`SetCursorPos`/`mouse_event` from PowerShell), based on the sprite's
X position changing after a simulated drag. That conclusion was wrong. While
building the poke interaction (below), the same simulation technique was
tested with explicit debug logging temporarily wired from the renderer's
`console.log` through to the main process's stdout (`webContents.on(
'console-message', ...)`) — and confirmed **zero pointer events of any
kind** (not even `pointermove`) ever reach the renderer via
`SetCursorPos`/`mouse_event`, across many variations (single jump, gradual
multi-step approach, from a stationary start, etc.).

The earlier "successful" drag test almost certainly measured
`BehaviorController`'s autonomous walk-phase movement, not the simulated
drag — which also explains why that test's Y axis never moved (walk-phase
movement is X-only by design; a real drag would move both axes together).
That was a real methodology mistake, worth naming plainly rather than
quietly fixing.

**Likely root cause:** Electron's click-through `setIgnoreMouseEvents(true,
{forward: true})` most plausibly forwards mouse input via a low-level
system hook (since a `WS_EX_TRANSPARENT`-style window normally receives no
mouse messages via standard routing at all), and that hook path very
plausibly filters out synthetic/injected input as a security measure
against exactly this kind of automated click-through spoofing. This isn't
confirmed against Electron/Chromium source, just the best explanation
fitting the evidence.

**Conclusion:** click-through, hover, drag, and the new poke interaction
cannot be verified by this kind of automated mouse simulation in this
environment. They need a real human at the mouse. Debug tip for next time:
temporarily add the `console-message` forwarding shown above in
`petWindow.ts` plus `console.log` calls in `InputController.ts` to see
renderer-side event flow in the terminal without attaching DevTools.

**To verify (needs a human):** `npm run dev`, then: hover the sprite and
confirm the cursor icon/behavior changes; drag it across the screen (both
axes); move off the sprite and click a window underneath — it should
register on that window, not the pet; quick-click (`poke`), double-click
(`doubleclick`), or press-and-hold (`pet`) on the sprite once each is
unlocked (see item 5 below) and confirm a brief reaction animation plays,
auto-returning to idle when it finishes — and that a genuine double-click
doesn't also separately register as two `poke`s. Note: this item is
specifically about the click-through-forwarded `BrowserWindow` content —
the tray and its Species submenu are native OS UI, not affected by this
limitation, and *have* been genuinely verified (see "Fixed" below and item
5).

### 2. Packaging icons — Windows icon closed; `package:win` itself still blocked on this machine; macOS icon still open

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

### 3. macOS / Linux never actually run

Every macOS-specific call (`setVisibleOnAllWorkspaces`, `app.dock.hide()`)
and Linux tray behavior note (`StatusNotifierItem` support varies by
desktop environment) is written to match documented Electron behavior, not
verified on those platforms. This machine is Windows-only.

### 4. Progression system — unlock logic verified via code+tests+persistence, interaction gating unverified (see item 1)

The playtime-gated progression system (`ProgressionTracker`,
`ProgressionController`, `species.json`'s `progression` array) has real,
positive evidence it works:

- `progression.json` under `app.getPath('userData')` (on this machine:
  `%APPDATA%/window-pet/progression.json`) correctly persisted and
  accumulated `totalPlaytimeMs` across multiple dev-mode app restarts —
  confirmed by reading the file directly (`{"totalPlaytimeMs":430344}`)
  after several `vite-plugin-electron`-triggered auto-restarts, well past
  both demo tiers (60s, 300s).
- The placeholder species visibly cycled through `idle` (blue) → `walk`
  (green) → `sleep` (gray) across several screenshots minutes apart,
  consistent with `sleep` becoming an eligible idle-variant pick only once
  tier2 (300s) was actually crossed.
- Unit tests (`ProgressionController.test.ts`,
  `BehaviorController.test.ts`) cover tier-crossing logic and the
  idle-variant pick mechanism directly.

**Not verified:** whether `poke`/`pet` actually trigger the `react`
animation end-to-end via real mouse input on the sprite — blocked on item 1
above (synthetic mouse simulation can't exercise this at all, confirmed,
not just "not yet tried"). A human needs to try both gestures after their
respective tiers unlock and confirm the reaction plays and auto-returns to
idle.

### 5. Species switching untestable under `npm run dev` — must test against a packaged build

While verifying Milestone 14's restart-based species switching (tray click
→ `appSettings.setSelectedSpeciesId()` → `app.relaunch()` + `app.exit()`),
the first attempt under `npm run dev` produced 4 orphaned `electron.exe`
processes and a dead `node`/vite process (log ended with `ERROR: The
process "18904" not found.`), with no sprite rendering afterward.
Likely cause: `vite-plugin-electron` supervises/restarts the Electron
process itself on file changes, and that supervision conflicts with
Electron's own `app.relaunch()` spawning an independent OS process — the
new process inherited the dev-server URL via environment but the dev
server had already gone down.

**Not a bug in the switching mechanism itself** — confirmed by testing
against `release/win-unpacked/Window Pet.exe` (a real packaged build, no
vite dev-server dependency) instead, where it worked correctly end to end,
see "Fixed" below. Just means: **don't test relaunch-based features under
`npm run dev`**; build (`npm run build && npx electron-builder --win
--dir`, which produces `win-unpacked` without hitting the blocked
NSIS-installer step from item 2) and run the packaged exe directly.

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

### Tray icon visibility — now genuinely confirmed (previously an open item)

**Symptom:** no way to confirm the tray icon/menu existed or worked short
of a human looking at it — screenshots alone can't distinguish "icon
created but hidden in the overflow flyout" from "tray creation silently
failed."

**Resolution:** turns out tray/menu interaction is native OS UI, not part
of the click-through-forwarded `BrowserWindow` (unlike the sprite itself —
see item 1), so it's *not* subject to the synthetic-input limitation.
Located the icon in the taskbar overflow flyout by exact pixel color match
(`(90,160,230)`, the tray icon's fill color), then drove real
`SetCursorPos`/`mouse_event` right-clicks against it successfully —
confirming synthetic input works fine for normal native controls; it's
specifically Electron's click-through-forwarding path that filters it.
Screenshotted the actual native context menu (Hide Pet / Species / About /
Quit) and its Species submenu, correctly listing species with the right
one checked. No longer an open item.

### Tray icon failed to load silently in a packaged build

**Symptom:** found while verifying species switching against
`release/win-unpacked/Window Pet.exe` — the tray icon was completely
absent from the taskbar overflow (not even a generic placeholder icon),
though the app otherwise ran fine and the sprite rendered correctly.

**Root cause:** `trayManager.ts` resolved the icon via `path.join(__dirname,
'../../build-resources/tray-icon.png')` — correct in dev, where `dist/`
and `build-resources/` are siblings in the repo, but `electron-builder.yml`
never listed `build-resources/` under `extraResources` (only `assets/`
was), so it simply doesn't exist anywhere inside a packaged app. `nativeImage.
createFromPath()` on a nonexistent path returns an empty image, which the
existing `icon.isEmpty() ? nativeImage.createEmpty() : icon` fallback
silently accepted — no crash, no error, just an invisible/absent tray
icon. The exact same class of bug as the earlier `file://`/`pet-asset://`
issue: a path that happens to work in dev and silently doesn't in a
packaged build.

**Fix:** added `build-resources` to `electron-builder.yml`'s
`extraResources`, and gave `trayManager.ts` a `getBuildResourcesRoot()`
helper mirroring `speciesLoader.ts`'s existing dev-vs-packaged pattern
(`app.isPackaged ? process.resourcesPath : app.getAppPath()`).

**Verified:** rebuilt `win-unpacked`, relaunched, confirmed the tray icon
(and its full menu) now appear correctly in the packaged build too.

### Persisted-but-missing species crashed startup instead of falling back

**Symptom:** found while cleaning up after a species-switch test — deleted
a local species folder that `settings.json` still pointed to as the
selected species, and the next launch would have crashed
(`loadSpecies()`'s `fs.readFileSync` throwing `ENOENT`, uncaught).

**Fix:** `src/main/index.ts` now wraps the startup `loadSpecies(speciesId)`
call in try/catch; on failure it logs the error, resets the persisted
selection back to the bundled `placeholder` species (self-healing, so this
doesn't recur every launch), and loads that instead.

**Verified:** pointed `settings.json` at a nonexistent species id and
launched the packaged build directly — confirmed the console logged
`Failed to load species "nonexistent-species", falling back to
"placeholder": Error: ENOENT: ...`, `settings.json` self-healed back to
`{"selectedSpeciesId":"placeholder"}`, and the placeholder sprite rendered
normally. No crash.

### InputController listener leak, latent until Milestone 15 gave it a way to actually fire

**Symptom:** none yet observed in practice — found by inspection while
designing live species reload (Milestone 15), which would have exposed it
immediately (every reload firing progressively more duplicate pokes/drags).

**Root cause:** `InputController`'s constructor passed inline arrow
functions straight to `addEventListener`, with no reference kept to ever
`removeEventListener` them. Harmless as long as `main.ts`'s
`onSpeciesLoaded` handler (which constructs a fresh `InputController`)
only ever fired once per app lifetime — true before Milestone 15, false
after.

**Fix:** listeners are now bound once and stored on the instance; a new
`InputController.destroy()` removes exactly those. `main.ts` calls
`input?.destroy()` on the outgoing instance before constructing its
replacement in `onSpeciesLoaded`.

**Verified:** indirectly, via Milestone 15's live-reload testing working
correctly across multiple successive reloads (sprite swap, then a
`species.json` edit) without any duplicated/multiplied reaction behavior.
No dedicated regression test for "N reloads → still exactly one listener
set" — worth adding if reload-heavy editing sessions become common.

### PetRenderer's image cache never invalidated, hiding live species-file edits

**Symptom:** found while verifying Milestone 15 — overwrote a running
local species' `idle.png` with a visibly different sprite; `species.json`
correctly reloaded and re-sent (confirmed via the fix above working), but
the on-screen sprite never changed.

**Root cause:** `PetRenderer`'s `imageCache` `Map` is keyed by the sheet's
URL string alone, with no eviction. Since `loadSpecies()` previously
produced the exact same URL for the same species on every call, the
cached `HTMLImageElement` (and its already-decoded, now-stale bitmap) was
reused indefinitely — reloading the species config did nothing for
already-cached sprites.

**Fix, two parts together:** `loadSpecies()` now appends a cache-busting
`?v=<Date.now()>` query parameter to every resolved sheet URL (harmless —
`assetProtocol.ts`'s handler only reads the URL's host and pathname, never
the query string), so a reload can never produce a URL that collides with
a previous one at any caching layer, browser-level or our own. Separately,
`PetRenderer.clearCache()` (called from `main.ts` on every
`onSpeciesLoaded`) drops all cached entries on every load, so the map
doesn't grow unbounded over a long local-editing session.

**Verified:** screenshotted a running packaged build showing the
placeholder-derived purple test sprite, overwrote its `idle.png` on disk,
screenshotted again ~1s later — sprite visibly changed to the new (green)
image, no restart. Confirmed twice more: a `species.json`-only edit
(`spriteScale` 3→5) also reflected live (visibly larger sprite).
