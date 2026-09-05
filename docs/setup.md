# Setup Guide

Detailed setup and build instructions for Window Pet.

---

## 1. System requirements

| Requirement | Minimum |
|---|---|
| OS | Windows 10/11, macOS, or Linux (only Windows tested so far — see `bugs.md`) |
| Node.js | 22 LTS+ (developed against 24.20.0 "Krypton") |
| npm | ships with Node |

---

## 2. Node.js

Standard installers work fine (nodejs.org, `winget install
OpenJS.NodeJS.LTS`, nvm, etc.) — install however you normally would.

This particular dev machine deliberately does **not** use a standard
installer: Node lives at `D:\tools\nodejs` (a plain extracted zip, no
installer, no registry writes from the extraction itself) with that
directory added to the current **user's** `PATH` environment variable —
findable and editable at any time via Windows Settings → *Edit environment
variables for your account* (or `sysdm.cpl` → Advanced → Environment
Variables → User variables → `Path`). This is a normal, fully visible
Windows setting, not a hidden one — it only affects this Windows user
account, not the system-wide `PATH`, and can be removed the same way it was
added. New terminals pick it up automatically since it's a real persisted
environment variable, not a per-session shell export.

Verify:

```bash
node --version
npm --version
```

---

## 3. Clone the repository

```bash
git clone https://github.com/Gavin-Dementia/Pety.git
cd Pety
```

No submodules, no external SDK.

---

## 4. Install and run

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite dev server and launches Electron with hot
reload (`vite-plugin-electron`). The app has no window chrome/taskbar
entry by design (`skipTaskbar: true`) — look for a small colored blob
somewhere on screen; it may be behind other windows since it's fully
click-through except over the sprite itself.

Other scripts:

```bash
npm run typecheck   # tsc --noEmit, main+preload and renderer configs
npm run lint         # eslint src
npm run test         # vitest run
npm run build        # production build to dist/
npm run package:win  # requires build-resources/icon.ico — see bugs.md
```

---

## 5. Project structure

```
pety/
├── assets/species/<id>/       bundled species: species.json + sprites/
├── build-resources/           electron-builder icons (icon.ico/.icns/.png)
├── docs/                      this file, roadmap.md, bugs.md
├── scripts/                   one-off PowerShell generators (placeholder art)
├── src/
│   ├── main/                  Electron main process — only place Node/Electron
│   │                          APIs are imported
│   │   ├── petWindow.ts       transparent/click-through/always-on-top window
│   │   ├── trayManager.ts     tray icon + menu, incl. Species submenu
│   │   ├── speciesLoader.ts   bundled+local species discovery/loading
│   │   ├── assetProtocol.ts   pet-asset:// custom protocol (see bugs.md)
│   │   ├── progressionTracker.ts  cumulative playtime persistence
│   │   ├── statsTracker.ts    generic named-stat persistence (framework only)
│   │   ├── appSettings.ts     small persisted settings store (selected species)
│   │   ├── ipcHandlers.ts     ipcMain.handle/.on, per ipcContract.ts
│   │   └── displayBounds.ts   work-area bounds helper
│   ├── preload/                contextBridge.exposeInMainWorld('petAPI', …)
│   ├── renderer/                only ever talks through window.petAPI
│   │   ├── PetStateMachine.ts   idle/walk/dragged/sit/sleep/react transitions
│   │   ├── AnimationController.ts  sprite-sheet frame playback
│   │   ├── BehaviorController.ts   random-walk AI, bounds, drag/react
│   │   ├── ProgressionController.ts  tier-crossing logic (pure)
│   │   ├── InputController.ts      pointer events → hover/drag/poke/pet
│   │   ├── gestureClassifier.ts    pure click-vs-longpress classification
│   │   └── PetRenderer.ts          canvas draw
│   ├── shared/                  types both main and renderer agree on
│   │   ├── ipcContract.ts
│   │   ├── speciesSchema.ts
│   │   └── petState.ts
│   └── types/global.d.ts        window.petAPI typing
└── electron-builder.yml
```

---

## 6. Design notes worth knowing before editing

**Big transparent window, not a small moving one.** `PetWindowManager`
creates one `BrowserWindow` covering the whole work area; the sprite moves
via CSS `transform: translate()` inside it, not via repeated
`BrowserWindow.setPosition()` calls. Smoother, fewer native window calls.
If you're tempted to move the window itself instead, see the plan doc's
"Window behavior" section for why that was rejected.

**Click-through is a bounding-rect approximation, not per-pixel.** The
renderer tracks the sprite's current rect and toggles
`setIgnoreMouseEvents` when the cursor crosses it — cheap, no per-pixel
alpha sampling. Good enough for the current blob sprite; may need revisiting
once real (non-rectangular) art exists.

**`pet-asset://` exists specifically to dodge a Chromium restriction**, not
for architectural purity — see `bugs.md`'s writeup. If you add new asset
types (audio, fonts), route them through the same protocol rather than
`file://`. Its host segment (`pet-asset://<bundled|local>/<id>/<path>`)
picks which species root to resolve from — see §8.

---

## 7. Persisted files (userData)

Everything the app persists lives under `app.getPath('userData')` —
`%APPDATA%/window-pet/` on this Windows dev machine, the platform-standard
equivalent elsewhere. None of it is part of the git repo.

| File / folder | Written by | Contents |
|---|---|---|
| `species/<id>/` | you, manually | local-only species — see README's "Species & art". While that species is the active one, edits to it live-reload automatically (no restart) — see §9. |
| `progression.json` | `progressionTracker.ts` | `{"totalPlaytimeMs": number}`, flushed every 10s + on quit |
| `stats.json` | `statsTracker.ts` | generic `{[key: string]: number}`, write-through on mutation; empty until something actually calls `setStat`/`incrementStat` (nothing does yet — framework only) |
| `settings.json` | `appSettings.ts` | `{"selectedSpeciesId": string}` currently, write-through on `set` |

---

## 8. Live species reload while editing

While the app is running, the **active** species' own folder (bundled or
local — whichever it actually loaded from) is watched recursively; any
change to `species.json` or anything under `sprites/` triggers an
automatic reload (debounced ~300ms) with no restart needed. This is pure
local file watching (`src/main/speciesLoader.ts`'s `watchSpecies()`) —
deliberately **not** a networked/remote update mechanism (there's no
manifest, no server, nothing downloaded), since this project has no live
service and no need for one.

Practical implications:
- Edit sprites or `species.json` for whichever species you're currently
  running (check the tray's Species submenu for which one that is) and
  see it reflected within about a second.
- A save that briefly leaves `species.json` invalid mid-write (some
  editors do this) is silently skipped and retried on the next change —
  it will **not** switch you back to the placeholder species or touch
  `settings.json`. That self-heal-on-failure behavior is startup-only
  (see `docs/bugs.md`'s "Persisted-but-missing species" entry).
- Switching to a *different* species (via the tray) still restarts the
  app, as before — this only covers editing the one you're already
  running.

---

## 9. Common issues

**Sprite doesn't render, no console error**
Almost certainly the `file://`-from-`http://localhost` issue described in
`bugs.md`. Confirm `src/main/assetProtocol.ts`'s handler is actually
registered (`registerAssetProtocolScheme()` before `app.whenReady()`,
`registerAssetProtocolHandler()` after) and that `species.json`'s resolved
`sheet` paths start with `pet-asset://`, not `file://`.

**Tray icon not visible**
Confirmed working (verified by right-clicking it and opening the Species
submenu) — but Windows collapses new tray icons into the overflow "^"
flyout by default, so check there first before assuming anything's wrong.

**`npm run package:win`/`package:mac` fails looking for an icon**
Expected — `build-resources/icon.ico`/`icon.icns` haven't been generated
yet. See `docs/bugs.md`.

**`node`/`npm` not found in a new terminal**
If Node was installed the same way as this dev machine (see §2), confirm
`D:\tools\nodejs` (or wherever you put it) is actually in your **user**
`PATH`, not just exported in a shell that already closed.

**Progression tiers seem to unlock faster than expected during dev**
`vite-plugin-electron` auto-restarts the Electron process on every
`src/main` file save. `ProgressionTracker` resumes from its persisted
total on each restart, so playtime accumulates across those restarts too —
not a bug, just means active development crosses tiers faster than one
continuous run would. See `docs/roadmap.md` Milestone 13.

**Debugging renderer-side logic without attaching DevTools**
Temporarily add `window.webContents.on('console-message', (_e, _level,
message) => console.log('[renderer]', message))` after creating the
window in `petWindow.ts`, plus `console.log` calls wherever you're
debugging in `src/renderer/*.ts` — renderer console output then shows up
directly in the terminal running `npm run dev`. Remove before committing;
this is how the Milestone 13 click-through/synthetic-input limitation
(`docs/bugs.md` #1) was actually diagnosed instead of guessed at.
