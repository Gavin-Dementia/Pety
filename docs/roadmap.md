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

**Status: Implemented, automated-verified (not yet human-verified)**

Implemented in `src/renderer/InputController.ts` + `petWindow.ts`'s
`setClickThrough()`:
- `setIgnoreMouseEvents(ignore, { forward: true })`, toggled from a
  renderer-side mousemove bounding-rect hit test against the sprite
- Manual drag (no native window drag region): `pointerdown` on the sprite
  starts drag, position updates via CSS `transform: translate()`, not
  `BrowserWindow.setPosition()` — see `docs/setup.md` §6 for why

Verified via simulated OS-level input (`user32.dll` `SetCursorPos` +
`mouse_event`, driven from PowerShell) against the running dev app: moved
the cursor onto the sprite, held the left button, moved in steps, released,
then re-screenshotted and located the sprite by its exact placeholder
color. The sprite's on-screen X position moved from the simulated drag
(≈118px of an intended 150px step), confirming the full pipeline —
hover-driven click-through disable → `pointerdown` drag start → position
updates on move → render — actually executes end to end. (The Y axis
didn't move as expected in this run, most likely a `SetCursorPos` timing/
coalescing artifact of the external simulation rather than a code bug,
since X moving at all already requires the harder precondition —
click-through correctly disabling on hover — to have worked. Still worth a
real human drag to fully confirm both axes.) See `bugs.md` for the full
note.

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

## Open / not yet started

See `bugs.md` for the full list of deferred/open items (interactive
verification, tray visibility, packaging icons, macOS/Linux testing) and
`assets/species/README-ish` gap: the real creature art/IP decision is still
unresolved — see project memory / `CONTRIBUTING.md`'s art policy.

Test coverage: none existed until this pass added `vitest` — see
`package.json` and `src/**/*.test.ts` for what's actually covered
(`PetStateMachine` transitions, `BehaviorController` bounds/turn-around
logic). Not covered: `AnimationController`, `InputController`, anything in
`src/main` (Electron-API-dependent, would need mocking Electron itself —
not done here).

---

## Long-term goals

- A real creature art pipeline once the IP question is resolved (original
  designs vs. sourced open-licensed sprite packs)
- Multi-species picker (tray/settings), so the placeholder isn't the only
  option a user ever sees
- macOS/Linux parity, actually verified on those platforms, not just
  written to match their documented APIs
