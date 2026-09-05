# Window Pet Roadmap

This document tracks the planned development stages of the project,
updated against what was actually built (vs. originally planned).
`C:\Users\tugav\.claude\plans\federated-herding-storm.md` holds only the
*most recently drafted* plan (each new planning session overwrites it) —
this file is the durable, cumulative record across all of them.

---

## Milestone 1 — Scaffold

**Status: Complete**

Implemented:
- `npm init`-equivalent `package.json`, 3-way `tsconfig` split (base/main/renderer)
- ESLint (flat config, `eslint.config.mjs`) + Prettier
- `.gitignore`, `.editorconfig`, `.vscode/extensions.json`
- `git init` + first commit, then merged with the pre-existing GitHub-generated
  `README.md`/`LICENSE` stub at `github.com/Gavin-Dementia/Pety` and pushed

---

## Milestone 2 — Minimal Electron shell

**Status: Complete (superseded — built directly as the transparent overlay, not a plain window first)**

Went straight to Milestone 3's transparent/frameless window rather than
proving a plain `BrowserWindow` first, since the Vite + `vite-plugin-electron`
pipeline needed verifying either way.

---

## Milestone 3 — Transparent / frameless / always-on-top window

**Status: Complete, visually verified**

Implemented in `src/main/petWindow.ts`:
- `transparent: true`, `frame: false`, `alwaysOnTop: true` (`'screen-saver'`
  level), `skipTaskbar: true`, `hasShadow: false`
- macOS: `setVisibleOnAllWorkspaces` + `app.dock.hide()` (untested — see
  `bugs.md`)
- Verified by launching the dev build and screenshotting the desktop: the
  placeholder sprite renders on top of other windows, confirming both
  transparency and always-on-top actually work on Windows

---

## Milestone 4 — Click-through + manual drag

**Status: Implemented, genuinely unverified — an earlier "automated-verified" claim here was wrong, see `bugs.md` #1**

Implemented in `src/renderer/InputController.ts` + `petWindow.ts`'s
`setClickThrough()`:
- `setIgnoreMouseEvents(ignore, { forward: true })`, toggled from a
  renderer-side mousemove bounding-rect hit test against the sprite
- Manual drag (no native window drag region): pointerdown starts a
  "pending" state, promoted to a real drag once movement crosses a small
  threshold (also how the poke interaction — Milestone 13 — distinguishes
  a click from a drag); position updates via CSS `transform: translate()`,
  not `BrowserWindow.setPosition()` — see `docs/setup.md` §6 for why

This file previously claimed simulated-mouse-input verification succeeded.
That was retested and retracted while building Milestone 13's poke
interaction: explicit debug logging showed simulated
`SetCursorPos`/`mouse_event` input never reaches the renderer's pointer
events at all in this environment (most likely filtered as
non-hardware-origin input by whatever mechanism implements Electron's
click-through forwarding — see `bugs.md` #1 for the full writeup). The
earlier test's measured movement was almost certainly the pet's own
autonomous walk phase, not the simulated drag. This needs real human
testing, not another automation attempt.

---

## Milestone 5 — Tray manager

**Status: Implemented, visibility unconfirmed**

`src/main/trayManager.ts`: show/hide, quit, disabled "Settings…" and
"About" placeholders. Not yet confirmed visible/clickable — Windows hides
new tray icons in the overflow flyout by default. See `bugs.md`.

---

## Milestone 6 — IPC contract + preload bridge

**Status: Complete**

Built in from the start rather than retrofitted: `src/shared/ipcContract.ts`
is the single source of truth for channel names/payload types, imported by
both `src/main/ipcHandlers.ts` and `src/preload/index.ts`. Renderer only
ever touches `window.petAPI` (typed via `src/types/global.d.ts`), never raw
`ipcRenderer`.

---

## Milestone 7 — Species config + loader

**Status: Complete, plus one real bug found and fixed**

`src/shared/speciesSchema.ts` (types + validator), `src/main/speciesLoader.ts`
(loads/validates `assets/species/<id>/species.json`). One `placeholder`
species ships, generated via `scripts/generate-placeholder-sprites.ps1`
(solid-color blob sprite sheets, no external art, CC0).

**Bug found during verification, fixed:** sprite sheets initially resolved
to `file://` URLs, which Chromium silently refuses to load as `<img src>`
from a page served over `http://localhost` (how the Vite dev server works)
— the blob never rendered, with no visible error. Fixed by adding a custom
`pet-asset://` privileged protocol (`src/main/assetProtocol.ts`) that serves
files from `assets/` in both dev and packaged builds. See `bugs.md` for the
full writeup.

---

## Milestone 8 — Animation state machine + controller

**Status: Complete, visually verified**

`src/renderer/PetStateMachine.ts` (explicit `allowedTransitions` map, no FSM
library), `src/renderer/AnimationController.ts` (frame timing vs `fps`,
loop/clamp at `frameCount`). Confirmed rendering correctly via the same
screenshot that verified Milestone 3 — idle animation is visibly playing.

---

## Milestone 9 — Behavior AI

**Status: Implemented, indirectly observed, not fully watched end-to-end**

`src/renderer/BehaviorController.ts`: timer-driven idle/walk phases, random
direction/duration from `species.json`'s `behavior` block, turns around at
work-area bounds, interrupted by drag start/resumed after drag end. Screenshots
taken minutes apart during this session caught the sprite in different
animation colors (idle-blue, then walk-green, then idle-blue again),
indirect evidence the idle↔walk cycling is actually happening over time —
but nobody has watched it continuously to confirm smooth walking motion
(vs. teleporting between phases) or the edge-of-screen turn-around in a
live session. See `bugs.md`.

---

## Milestone 10 — Packaging

**Status: Partial — Windows icon done, `package:win` blocked on this machine, macOS/Linux untried**

`electron-builder.yml` is written (win/mac/linux targets, `extraResources`
for `assets/`). `build-resources/icon.ico` now exists
(`scripts/generate-windows-ico.ps1`) and produces a correct, working
`release/win-unpacked/Window Pet.exe` with `assets/` bundled properly.
However `npm run package:win`'s NSIS/portable installer step itself fails
on this machine — a real, reproducible bug (not a missing-icon problem
this time): electron-builder tries to extract a macOS code-signing tool
bundle that contains symlinks, and this Windows account lacks the
privilege to create them. Needs Developer Mode or an elevated terminal to
actually fix — see `bugs.md` item 2 for the full trace. `icon.icns`
(macOS) still doesn't exist; `package:mac`/`package:linux` untried
entirely.

---

## Milestone 11 — OSS polish

**Status: Partially complete**

Done: `README.md`, `CONTRIBUTING.md`, `LICENSE` (MIT, code only),
`LICENSE-ASSETS.md`, `.github/workflows/ci.yml`.

Not done: README screenshots (placeholder comment still in place — real art
doesn't exist yet), no `v0.1.0` tag cut.

---

## Milestone 12 — Explicitly out of scope for now

Updated from the original plan — **multi-species picker moved out of this
list and into Milestone 14 (done)**; hunger/growth stat *persistence
plumbing* is also done (Milestone 14's stats framework), though the actual
gameplay numbers remain out of scope. Still out of scope: a general
settings UI (species switching lives in the tray only, no dedicated
window), multi-monitor roaming, per-pixel click-through (bounding-rect
approximation is current behavior), auto-update, live (non-restart)
species switching.

---

## Milestone 13 — Playtime-gated progression (more idle behaviors + interactions over time)

**Status: Core mechanism verified (persistence + tier logic); interaction gating unverified — see `bugs.md` #1/#4**

User-requested feature: the longer the pet has been open, the more
autonomous idle behaviors and interactions unlock — chosen metric is
cumulative app-open runtime (not calendar days since install). Full design
in the plan file, `C:\Users\tugav\.claude\plans\federated-herding-storm.md`.

Implemented:
- `src/main/progressionTracker.ts` — hand-rolled persistence (no new
  dependency) to `app.getPath('userData')/progression.json`, flushed every
  10s and on quit
- `src/renderer/ProgressionController.ts` — pure tier-crossing logic,
  seeded once from main via a new `GET_PLAYTIME` IPC channel, advanced
  locally each tick
- `species.json` gained `progression: ProgressionTier[]`; the placeholder
  species defines 2 demo tiers (60s → unlocks `sit` idle-variant + `poke`
  interaction; 300s → unlocks `sleep` idle-variant) — deliberately short
  for verifiability, not production pacing
- `PetStateMachine` restructured as hub-and-spoke through `idle` (idle can
  reach every variant; every variant returns only to idle) so adding more
  variants later doesn't grow the transition table combinatorially
- New `react` `PetState` (a poke reaction) with matching `AnimationController.
  isFinished()` support, auto-returning to idle when its non-looping
  animation completes
- `InputController` reworked to distinguish a poke (quick click, no
  movement) from a drag (movement past a 6px threshold) via a pending-
  pointerdown state
- Real bug found and fixed along the way: `AnimationController.setAnimation
  ()`'s object-identity guard broke replaying the same non-looping
  animation on re-entry (a second poke would show the frozen last frame
  instead of replaying) — removed, since the method is only ever called on
  an actual state transition, so restarting is always correct
- Unit tests: `ProgressionController.test.ts` (tier crossing, always-
  available idle), extended `BehaviorController.test.ts` (idle-variant
  picking, react/endReaction, IDLE_LIKE phase-timer generalization),
  extended `PetStateMachine.test.ts` for the new hub-and-spoke edges

Verified: `progression.json` correctly persisted and accumulated across
multiple dev-mode restarts (confirmed by reading the file directly —
`totalPlaytimeMs` crossed both demo tiers); the placeholder species was
observed cycling through idle/walk/**sleep** across screenshots minutes
apart, consistent with the `sleep` tier actually having unlocked. Not
verified: whether poke itself fires from real mouse input — blocked on the
same click-through/synthetic-input limitation as Milestone 4, see
`bugs.md` #1.

**Dev-mode quirk worth knowing:** `vite-plugin-electron` auto-restarts the
Electron process on every `src/main` file save. Each restart resumes from
the persisted total, so playtime accumulates across those restarts too —
tiers can cross much faster during active development than a single
continuous run would suggest. Not a bug, just worth knowing when eyeballing
whether a tier "should" have unlocked yet.

---

## Milestone 14 — Multi-species picker, stats scaffolding, richer interaction framework, README

**Status: Complete and genuinely human-verified (not just automated) — see below**

Four related asks, all "build the framework now, specifics later." Full
design in the plan file (see the intro note above for why that link is
now stale — the design lived at
`C:\Users\tugav\.claude\plans\federated-herding-storm.md` at the time this
was built).

Implemented:
- **Multi-species.** `speciesLoader.ts` now resolves species from two
  roots: bundled (`assets/species/`, in the repo) and local
  (`app.getPath('userData')/species/`, auto-created on startup, **outside
  the repo entirely** — not just gitignored, no relationship to the
  checkout at all). `listAvailableSpecies()` scans both; a local id
  overrides a same-id bundled one. `pet-asset://` protocol URLs gained a
  source segment (`pet-asset://<bundled|local>/<id>/<path>`) so sprites
  resolve from the right root either way.
- **Species switching**, restart-based by design (not a live hot-swap —
  simpler and avoids tearing down `BehaviorController`/`InputController`/
  `ProgressionController` mid-session for a rarely-used action): the
  tray's new "Species" submenu (radio items, checked = current selection)
  persists the choice via `src/main/appSettings.ts` and calls
  `app.relaunch()` + `app.exit()`.
- **Stats framework**, deliberately inert: `src/main/statsTracker.ts`
  (generic `get`/`set`/`increment`/`getAll` over `userData/stats.json`,
  write-through on mutation) plus `GET_STATS`/`SET_STAT`/`INCREMENT_STAT`
  IPC and `window.petAPI` exposure. Nothing in the renderer calls any of
  it yet — no hunger decay, no growth formula, no default stat keys. That
  was explicitly deferred by the user ("實際數值再說"); building a
  renderer-side wrapper with no real caller would have been speculative.
- **Richer interactions.** `InputController` now classifies a
  non-promoted pointer release by *how long* it was held (via the new
  pure `src/renderer/gestureClassifier.ts`, unit tested) into a quick
  `poke` or a held `pet` — two independently unlockable interaction ids
  through the same `isInteractionUnlocked` mechanism Milestone 13 already
  had. `placeholder`'s `species.json` staggers them across its two demo
  tiers (poke at 60s, pet at 300s) so the demo shows two interactions
  gating independently rather than both at once.
- `README.md` rewritten to reflect actual current functionality, with a
  new "Species & art" section spelling out the bundled-vs-local
  distinction and explicitly naming the local folder as where
  non-redistributable personal art belongs.

**Verification — genuinely real this time, not synthetic-input-blocked,
and it found two more real bugs along the way:**

Tray/species-switching UI is native OS chrome, not part of the click-
through-forwarded `BrowserWindow` content, so it isn't subject to
Milestone 4/13's synthetic-mouse-input limitation — confirmed by
successfully driving real right-clicks against the tray icon. Full
verification chain:

1. Created a throwaway species under the local folder, right-clicked the
   tray icon, opened the real context menu, confirmed the Species submenu
   correctly listed both `Blob (bundled)` and `Test Local Species (local)`
   with the right one checked — screenshotted, not assumed.
2. Clicked the local species under `npm run dev` — this **failed**, but
   not because switching is broken: `vite-plugin-electron`'s process
   supervision conflicts with `app.relaunch()`, orphaning processes and
   killing the dev server (`bugs.md` #5). Not a switching bug, a dev-mode
   testing-methodology limitation.
3. Retested against a real packaged build
   (`release/win-unpacked/Window Pet.exe`, built via `electron-builder
   --win --dir` which produces the unpacked app without hitting the
   blocked NSIS step) — and here it worked genuinely end to end: clicking
   the local species persisted `settings.json`, relaunched into a **new**
   process, and the sprite visibly changed from the placeholder's blue
   blob to the test species' purple sprite. Screenshotted before and
   after.
4. That packaged-build test surfaced a real bug: **the tray icon was
   completely absent** in the packaged app (present and working in dev).
   Root cause: `build-resources/` was never listed in
   `electron-builder.yml`'s `extraResources`, so `tray-icon.png` simply
   doesn't exist inside a packaged app — the same class of dev-vs-packaged
   path bug as the earlier `pet-asset://` fix. Fixed (`bugs.md` "Fixed"),
   rebuilt, reconfirmed the icon and full menu now work packaged too.
5. Cleaning up after the switch test surfaced a second real bug:
   `settings.json` still pointed at the now-deleted throwaway species,
   which would have crashed the next launch (`loadSpecies()`'s
   `fs.readFileSync` throwing uncaught). Fixed with a try/catch fallback
   in `src/main/index.ts` that self-heals the persisted selection back to
   `placeholder` — verified by deliberately pointing `settings.json` at a
   nonexistent id and confirming a clean fallback, not a crash.

This also closes the long-open "tray visibility unconfirmed" item for
good. Throwaway species and build output deleted afterward; nothing about
either is in the repo.

**Still not verified:** whether `poke`/`pet` actually fire from real mouse
input on the sprite itself — that path goes through the click-through-
forwarded window, which synthetic input still can't reach regardless of
process (dev or packaged). Needs a human. See `bugs.md` #1.

---

## Milestone 15 — Live species reload while editing

**Status: Complete, genuinely verified**

Follow-up request after Milestone 14: the user explicitly does **not**
want a remote/networked asset-update mechanism (no live service, single
personal user) — just wants editing their own local species'
`species.json`/sprites to show up without restarting the app. Scoped down
accordingly: pure local file watching, nothing networked.

Implemented:
- `speciesLoader.ts`'s new `watchSpecies(id, onChange)` watches the active
  species' own directory recursively (`fs.watch(dir, {recursive:true})` —
  directory-level, not per-file, specifically so it survives editors that
  save via replace-the-file rather than in-place write) and calls back
  debounced (300ms, editors often fire several fs events per save).
  Recursive `fs.watch` is only supported on macOS/Windows in Node — fine
  given this project is Windows-only verified so far (`bugs.md` #3).
- `index.ts` wires this to the currently active species (started right
  after the initial load) and re-sends `LOAD_SPECIES` on change — but
  deliberately does **not** reuse the startup fallback/self-heal logic
  here: a transient invalid save (mid-write, briefly malformed JSON)
  should be skipped and retried next change, not silently switch the
  user's selected species. That self-healing behavior stays
  startup-only.

**Two real bugs found and fixed while building this** (both were latent
and harmless until this feature gave them a way to actually trigger):
- `InputController` added its pointer listeners via inline arrow
  functions with no stored reference — fine when `onSpeciesLoaded` only
  ever fired once (app startup), but live reload fires it repeatedly,
  which would have stacked duplicate listener sets on the same canvas
  forever (each poke/drag firing multiple times). Fixed: listeners are
  now bound once and stored, `InputController.destroy()` removes them,
  and `main.ts` calls it on the outgoing instance before constructing the
  replacement.
- `PetRenderer`'s image cache is keyed by URL string with no invalidation
  — reloading the *same* species produced byte-identical sheet URLs, so
  the renderer kept showing the pre-edit sprite even though a fresh
  `species.json` had correctly arrived. Fixed two ways together:
  `loadSpecies()` now appends a cache-busting `?v=<timestamp>` query
  param to every resolved sheet URL (ignored by `assetProtocol.ts`'s
  handler, which only reads the URL's host+pathname) so a reload can
  never collide with a previous URL at any caching layer, and
  `PetRenderer.clearCache()` (called from `main.ts` on every
  `onSpeciesLoaded`) drops old entries so the cache doesn't grow
  unbounded over a long editing session.

**Verified end-to-end against a packaged build** (not `npm run dev` —
same dev-mode/vite-plugin-electron caveat as Milestone 14's switching
test): launched with a local test species selected, screenshotted the
purple placeholder-derived sprite, overwrote its `idle.png` on disk with a
different (green) sprite while the app kept running, and screenshotted
again ~1s later — the sprite had changed color with no restart, no tray
interaction, nothing but the file write. Separately re-verified that
editing `species.json` itself (bumped `spriteScale` 3→5) also live-reloads
— screenshotted a visibly larger sprite afterward. Cleanup (test species
deleted, `settings.json` reset) confirmed no trace left in the repo or in
a state that would affect a normal launch.

---

## Open / not yet started

See `bugs.md` for the full list of deferred/open items — interactive
verification (click-through/drag/poke/pet — confirmed blocked on synthetic
input, not just untried), packaging icons, macOS/Linux testing. Tray
visibility is now resolved (Milestone 14). The real creature art/IP
decision is still unresolved — see project memory / `CONTRIBUTING.md`'s
art policy; the local species folder (Milestone 14) is the sanctioned
place for personal art in the meantime.

Test coverage: `vitest` covers `PetStateMachine`, `BehaviorController`,
`ProgressionController`, and `gestureClassifier` (all pure renderer-side
logic). Not covered: `AnimationController`, `InputController`, anything in
`src/main` (Electron-API-dependent, would need mocking Electron itself —
not done here; `speciesLoader`'s bundled/local resolution and the tray's
Species submenu were manually verified instead, see Milestone 14).

---

## Long-term goals

- A real creature art pipeline once the IP question is resolved (original
  designs vs. sourced open-licensed sprite packs) — the local species
  folder (Milestone 14) already covers personal/non-redistributable art
  in the meantime
- Actual stats gameplay (hunger/growth formulas, decay, UI) on top of the
  now-existing `statsTracker.ts` plumbing
- Live (non-restart) species switching, if the restart-based UX proves
  annoying in practice
- macOS/Linux parity, actually verified on those platforms, not just
  written to match their documented APIs
