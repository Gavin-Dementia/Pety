# Window Pet

A cross-platform desktop companion — a small pixel-art creature that lives on
your desktop, wanders around, and you can pick up and carry. The longer it's
been running, the more it can do. Built with Electron + TypeScript.

<!-- screenshot placeholder -->

## Status

Framework stage, functional. Ships with placeholder programmer art (solid
colored blobs) so the engine can be built and tested before real art exists
— see "Species & art" below for how that's meant to change.

## Features

- Transparent, frameless, always-on-top overlay window; click-through
  outside the pet, draggable when hovered
- System tray: show/hide, quit, and a **Species** submenu to switch
  creatures (persists the choice, relaunches)
- Sprite-sheet animation state machine (idle / walk / dragged / sit /
  sleep / react), all reachable through a hub-and-spoke `idle` state so
  new variants are a content change, not an engine change
- Autonomous behavior: random walk within the screen's work area,
  alternating with idle-like phases
- **Progression**: cumulative app-open runtime (not calendar days since
  install) unlocks more idle-behavior variants and interactions over
  time, defined per-species — see `docs/roadmap.md` Milestone 13
- **Interactions**: a quick click (`poke`) or a held press (`pet`) on the
  sprite, distinguished by gesture duration and each independently
  unlockable — a documented, extensible pattern for adding more gesture
  types later (see `src/renderer/gestureClassifier.ts`)
- **Stats plumbing**: generic named-stat persistence
  (`src/main/statsTracker.ts`) — the storage/IPC layer a future hunger/
  growth system will need, deliberately not wired to any gameplay logic
  yet
- Pluggable "species" content system — bundled species ship in the repo;
  you can also import your own locally without ever touching it (see
  below)

## Getting started

```
npm install
npm run dev
```

This launches the app with hot reload. Before committing, `npm run
typecheck`, `npm run lint`, and `npm run test` should all pass.

## Species & art

Species are self-contained content folders (`species.json` + sprite
sheets) — see `src/shared/speciesSchema.ts` for the exact shape. Two
places they can live:

- **Bundled** — `assets/species/<id>/`, part of this repo, MIT/CC0-only
  (see "Art & IP" below).
- **Local** — `%APPDATA%/window-pet/species/<id>/` on Windows (generally
  `app.getPath('userData')/species/<id>/`), created automatically on
  first run. This folder has **no relationship to the git repository at
  all** — nothing placed there is ever committed or uploaded. It's the
  sanctioned way to use art you can't or don't want to redistribute (a
  personal drawing, something you don't hold redistribution rights to,
  etc.) while still using the app normally.

The tray's **Species** submenu lists both, switching relaunches the app
into your choice. A local species with the same id as a bundled one takes
priority, so you can override bundled content locally too.

## Building a package

```
npm run package:win   # or package:mac / package:linux
```

`build-resources/icon.ico` is generated (`scripts/generate-windows-ico.ps1`).
`package:win`'s installer step is currently blocked on this dev machine by
a Windows privilege issue unrelated to the app itself — see
`docs/bugs.md` #3 for the fix. `build-resources/icon.icns` (macOS) still
needs generating on an actual Mac.

## Art & IP

This project's **code** is MIT-licensed (see `LICENSE`). **Art assets**
are licensed separately (see `LICENSE-ASSETS.md`) and, in the bundled
`assets/species/` tree, are original placeholder art only — the project
does not use and will not accept existing copyrighted character designs
(see `CONTRIBUTING.md` for the full contribution policy). If you have art
you want to use but not publish, the **local species folder** above is
built specifically for that — it never leaves your machine through this
project.

## Documentation

- `docs/setup.md` — full setup/build reference, project structure, common issues
- `docs/roadmap.md` — what's built vs. planned, milestone by milestone
- `docs/bugs.md` — known open issues and a log of real bugs found and fixed
- `src/shared/speciesSchema.ts` — the species/content contract
- `CONTRIBUTING.md` — dev workflow and the art contribution policy
