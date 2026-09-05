import type { SpeciesAnimationDef } from '../shared/speciesSchema';
import type { FrameRect } from './AnimationController';
import type { Vec2, Rect } from './types';

export class PetRenderer {
  private ctx: CanvasRenderingContext2D;
  private imageCache = new Map<string, HTMLImageElement>();

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('PetRenderer: 2D context unavailable');
    this.ctx = ctx;
    this.resizeToWindow();
    window.addEventListener('resize', () => this.resizeToWindow());
  }

  private resizeToWindow(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private getImage(sheetUrl: string): HTMLImageElement {
    let img = this.imageCache.get(sheetUrl);
    if (!img) {
      img = new Image();
      img.src = sheetUrl;
      this.imageCache.set(sheetUrl, img);
    }
    return img;
  }

  /** Returns the on-screen bounds of the sprite at `position`, for hit-testing. */
  getSpriteBounds(def: SpeciesAnimationDef, position: Vec2, scale: number): Rect {
    return {
      x: position.x,
      y: position.y,
      width: def.frameWidth * scale,
      height: def.frameHeight * scale,
    };
  }

  render(def: SpeciesAnimationDef, frame: FrameRect, position: Vec2, scale: number): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const image = this.getImage(def.sheet);
    if (!image.complete || image.naturalWidth === 0) return;

    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      position.x,
      position.y,
      def.frameWidth * scale,
      def.frameHeight * scale,
    );
  }
}
