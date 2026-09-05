import type { SpeciesAnimationDef } from '../shared/speciesSchema';

export interface FrameRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export class AnimationController {
  private def: SpeciesAnimationDef | null = null;
  private frameIndex = 0;
  private elapsedMs = 0;

  setAnimation(def: SpeciesAnimationDef): void {
    if (this.def === def) return;
    this.def = def;
    this.frameIndex = 0;
    this.elapsedMs = 0;
  }

  /** Advance playback by `deltaMs`. Call once per render tick. */
  update(deltaMs: number): void {
    if (!this.def) return;
    const msPerFrame = 1000 / this.def.fps;
    this.elapsedMs += deltaMs;

    while (this.elapsedMs >= msPerFrame) {
      this.elapsedMs -= msPerFrame;
      const nextIndex = this.frameIndex + 1;
      if (nextIndex >= this.def.frameCount) {
        this.frameIndex = this.def.loop ? 0 : this.def.frameCount - 1;
      } else {
        this.frameIndex = nextIndex;
      }
    }
  }

  getCurrentFrameRect(): FrameRect | null {
    if (!this.def) return null;
    return {
      sx: this.frameIndex * this.def.frameWidth,
      sy: 0,
      sw: this.def.frameWidth,
      sh: this.def.frameHeight,
    };
  }
}
