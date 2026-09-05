# Window Pet

A cross-platform desktop companion — a small pixel-art creature that lives on
your desktop, wanders around, and you can pick up and carry. Built with
Electron + TypeScript.

<!-- screenshot placeholder -->

## Status

Early framework stage. Currently ships with placeholder programmer art (solid
colored blobs) so the engine — window/tray/animation/behavior — can be built
and tested before real art exists. See "Art & IP" below.

## Features

- Transparent, frameless, always-on-top overlay window
- Click-through outside the pet's sprite; draggable when hovered
- System tray with show/hide and quit
- Sprite-sheet animation state machine (idle / walk / dragged / sit)
- Simple autonomous "AI": random walk within the screen's work area
- Pluggable "species" content system — add a new creature without touching
  engine code (see `CONTRIBUTING.md`)

## Getting started

```
npm install
npm run dev
```

This launches the app with hot reload. `npm run typecheck` and `npm run lint`
should both pass before committing.

## Building a package

```
npm run package:win   # or package:mac / package:linux
```

Packaging requires `build-resources/icon.ico` (Windows) and
`build-resources/icon.icns` (macOS) — generate these from
`build-resources/icon.png` before running the mac/Windows package scripts.

## Art & IP

This project's **code** is MIT-licensed (see `LICENSE`). Its **art assets**
are licensed separately (see `LICENSE-ASSETS.md`) and are, right now,
original placeholder art only. The project intentionally does not use any
existing copyrighted character designs, and pull requests that add
third-party copyrighted character art will not be accepted — see
`CONTRIBUTING.md` for the full policy. New creatures are meant to be added as
original or properly licensed content through the species system in
`assets/species/`.

## Architecture

See `src/main`, `src/preload`, `src/renderer`, and `src/shared` for the
Electron process split, and `src/shared/speciesSchema.ts` for the
content/extension contract.
