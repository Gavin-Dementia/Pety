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

  /**
   * Always resets to frame 0, even if `def` is the same object reference as
   * before — this is only ever called from a real PetStateMachine
   * transition (or once at initial load), so re-entering a state should
   * always replay its animation from the start. Without this, re-entering a
   * non-looping animation a second time (e.g. a repeated "react" reaction)
   * would silently no-op and show the already-finished last frame instead
   * of replaying.
   */
  setAnimation(def: SpeciesAnimationDef): void {
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

  /** True once a non-looping animation has reached and is holding its last frame. */
  isFinished(): boolean {
    if (!this.def) return false;
    return !this.def.loop && this.frameIndex >= this.def.frameCount - 1;
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
