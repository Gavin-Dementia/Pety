# Contributing to Window Pet

Thanks for your interest in contributing!

## Dev workflow

```
npm install
npm run dev          # launches the app with hot reload
npm run typecheck
npm run lint
npm run build
```

Before opening a PR, make sure `typecheck`, `lint`, and `build` all pass —
the CI workflow runs the same checks on every push/PR.

Branch from `main`, open a PR against `main`, and describe what changed and
why.

## Adding a new creature ("species")

The engine (`src/main`, `src/renderer`, `src/shared`) is art-agnostic by
design. Adding a new creature is a **content-only** change:

1. Create `assets/species/<your-id>/species.json` following the
   `SpeciesConfig` shape in `src/shared/speciesSchema.ts`.
2. Add your sprite sheets under `assets/species/<your-id>/sprites/`.
3. Fill in `attribution` in your `species.json` with your authorship/license.

No changes to `src/main`, `src/renderer`, or `src/shared` should be needed.

## Art & IP policy — please read

**Do not submit copyrighted third-party character art or assets** —
including but not limited to characters, sprites, or designs from existing
video games, anime, or other franchises — in pull requests, regardless of
whether the source material itself is free to play or non-commercial.

All contributed art must be:

- your own original work, or
- properly licensed/CC0 work you have the right to redistribute,

with authorship and license recorded in the species config's `attribution`
field. See `LICENSE-ASSETS.md` for how asset licensing works in this repo.

PRs that add third-party copyrighted character likenesses will be closed.
