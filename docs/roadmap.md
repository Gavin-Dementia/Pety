# Window Pet Roadmap

This document tracks the planned development stages of the project,
updated against what was actually built (vs. originally planned). The
original 12-milestone plan is in `C:\Users\tugav\.claude\plans\federated-herding-storm.md`;
this file is the living, updated version of it.

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
actually fix — see `bugs.md` item 3 for the full trace. `icon.icns`
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

Unchanged from the original plan: settings UI, multi-species picker,
multi-monitor roaming, per-pixel click-through (bounding-rect approximation
is current behavior), hunger/growth stat persistence, auto-update.

---

## Milestone 13 — Playtime-gated progression (more idle behaviors + interactions over time)

**Status: Core mechanism verified (persistence + tier logic); interaction gating unverified — see `bugs.md` #1/#5**

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

## Open / not yet started

See `bugs.md` for the full list of deferred/open items (interactive
verification — now confirmed blocked on synthetic input, not just
untried — tray visibility, packaging icons, macOS/Linux testing) and
`assets/species/README-ish` gap: the real creature art/IP decision is still
unresolved — see project memory / `CONTRIBUTING.md`'s art policy.

Test coverage: `vitest` covers `PetStateMachine`, `BehaviorController`, and
`ProgressionController` (all pure renderer-side logic). Not covered:
`AnimationController`, `InputController`, anything in `src/main`
(Electron-API-dependent, would need mocking Electron itself — not done
here).

---

## Long-term goals

- A real creature art pipeline once the IP question is resolved (original
  designs vs. sourced open-licensed sprite packs)
- Multi-species picker (tray/settings), so the placeholder isn't the only
  option a user ever sees
- macOS/Linux parity, actually verified on those platforms, not just
  written to match their documented APIs
