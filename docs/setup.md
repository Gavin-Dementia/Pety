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
├── assets/species/<id>/       species.json + sprites/, one dir per creature
├── build-resources/           electron-builder icons (icon.ico/.icns/.png)
├── docs/                      this file, roadmap.md, bugs.md
├── scripts/                   one-off PowerShell generators (placeholder art)
├── src/
│   ├── main/                  Electron main process — only place Node/Electron
│   │                          APIs are imported
│   │   ├── petWindow.ts       transparent/click-through/always-on-top window
│   │   ├── trayManager.ts     tray icon + menu
│   │   ├── speciesLoader.ts   loads/validates species.json
│   │   ├── assetProtocol.ts   pet-asset:// custom protocol (see bugs.md)
│   │   ├── ipcHandlers.ts     ipcMain.handle/.on, per ipcContract.ts
│   │   └── displayBounds.ts   work-area bounds helper
│   ├── preload/                contextBridge.exposeInMainWorld('petAPI', …)
│   ├── renderer/                only ever talks through window.petAPI
│   │   ├── PetStateMachine.ts   idle/walk/dragged/sit/sleep transitions
│   │   ├── AnimationController.ts  sprite-sheet frame playback
│   │   ├── BehaviorController.ts   random-walk AI, bounds, drag interrupt
│   │   ├── InputController.ts      pointer events → hover/drag
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
`file://`.

---

## 7. Common issues

**Sprite doesn't render, no console error**
Almost certainly the `file://`-from-`http://localhost` issue described in
`bugs.md`. Confirm `src/main/assetProtocol.ts`'s handler is actually
registered (`registerAssetProtocolScheme()` before `app.whenReady()`,
`registerAssetProtocolHandler()` after) and that `species.json`'s resolved
`sheet` paths start with `pet-asset://`, not `file://`.

**Tray icon not visible**
Windows collapses new tray icons into the overflow "^" flyout by default —
check there before assuming the tray failed to create.

**`npm run package:win`/`package:mac` fails looking for an icon**
Expected — `build-resources/icon.ico`/`icon.icns` haven't been generated
yet. See `docs/bugs.md`.

**`node`/`npm` not found in a new terminal**
If Node was installed the same way as this dev machine (see §2), confirm
`D:\tools\nodejs` (or wherever you put it) is actually in your **user**
`PATH`, not just exported in a shell that already closed.
