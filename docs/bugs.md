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
register on that window, not the pet; quick-click (no drag) on the sprite
once `poke` is unlocked (see item 5 below) and confirm a brief reaction
animation plays, auto-returning to idle when it finishes.

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

### 5. Progression system — unlock logic verified via code+tests+persistence, interaction gating unverified (see item 1)

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

**Not verified:** whether `poke` actually triggers the `react` animation
end-to-end via real mouse input — blocked on item 1 above (synthetic mouse
simulation can't exercise this at all, confirmed, not just "not yet
tried"). A human needs to quick-click the sprite after the 60s mark and
confirm the reaction plays and auto-returns to idle.

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
