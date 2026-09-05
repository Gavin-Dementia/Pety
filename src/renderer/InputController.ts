import type { PetRenderer } from './PetRenderer';
import type { BehaviorController } from './BehaviorController';
import type { SpeciesAnimationDef } from '../shared/speciesSchema';
import { pointInRect, type Vec2 } from './types';

const DRAG_PROMOTION_THRESHOLD_PX = 6;

interface PendingPointerDown {
  startPos: Vec2;
}

/**
 * The window starts fully click-through (setIgnoreMouseEvents(true, {forward:
 * true})), which still forwards mousemove so we can detect hover over the
 * sprite and flip click-through off, letting the next mousedown land on us
 * to start a drag. This is the region-based approximation described in the
 * plan (vs. per-pixel alpha sampling, a documented future enhancement).
 *
 * pointerdown doesn't immediately start a drag — it's ambiguous with a poke
 * (a quick click) until the pointer either moves past
 * DRAG_PROMOTION_THRESHOLD_PX (promotes to a drag) or releases without
 * moving that far (a poke, if the "poke" interaction is unlocked).
 */
export class InputController {
  private isDragging = false;
  private dragOffset: Vec2 = { x: 0, y: 0 };
  private pending: PendingPointerDown | null = null;
  private isHovering = false;
  private currentAnimation: SpeciesAnimationDef | null = null;
  private currentScale = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: PetRenderer,
    private behavior: BehaviorController,
    private isInteractionUnlocked: (id: string) => boolean = () => false,
  ) {
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointerup', () => this.onPointerUp());
  }

  setCurrentAnimation(def: SpeciesAnimationDef, scale: number): void {
    this.currentAnimation = def;
    this.currentScale = scale;
  }

  private getPointerPos(e: PointerEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onPointerMove(e: PointerEvent): void {
    const pointer = this.getPointerPos(e);

    if (this.isDragging) {
      const next = { x: pointer.x - this.dragOffset.x, y: pointer.y - this.dragOffset.y };
      this.behavior.setPosition(next);
      window.petAPI.dragMove(next);
      return;
    }

    if (this.pending) {
      const dx = pointer.x - this.pending.startPos.x;
      const dy = pointer.y - this.pending.startPos.y;
      if (Math.hypot(dx, dy) >= DRAG_PROMOTION_THRESHOLD_PX) {
        this.promoteToDrag(pointer);
      }
      return;
    }

    if (!this.currentAnimation) return;
    const bounds = this.renderer.getSpriteBounds(
      this.currentAnimation,
      this.behavior.getPosition(),
      this.currentScale,
    );
    const hovering = pointInRect(pointer, bounds);
    if (hovering !== this.isHovering) {
      this.isHovering = hovering;
      window.petAPI.setClickThrough(!hovering);
    }
  }

  private promoteToDrag(pointer: Vec2): void {
    const position = this.behavior.getPosition();
    this.dragOffset = { x: pointer.x - position.x, y: pointer.y - position.y };
    this.isDragging = true;
    this.pending = null;
    this.behavior.interruptForDrag();
    window.petAPI.dragStart();
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.isHovering || !this.currentAnimation) return;
    this.pending = { startPos: this.getPointerPos(e) };
  }

  private onPointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.behavior.resumeAfterDrag();
      window.petAPI.dragEnd();
      return;
    }

    if (this.pending) {
      this.pending = null;
      if (this.isInteractionUnlocked('poke')) {
        this.behavior.react();
      }
    }
  }
}
