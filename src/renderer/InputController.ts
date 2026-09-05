import type { PetRenderer } from './PetRenderer';
import type { BehaviorController } from './BehaviorController';
import type { SpeciesAnimationDef } from '../shared/speciesSchema';
import { pointInRect, type Vec2 } from './types';
import { classifyPointerRelease } from './gestureClassifier';

const DRAG_PROMOTION_THRESHOLD_PX = 6;
const LONG_PRESS_THRESHOLD_MS = 400;

interface PendingPointerDown {
  startPos: Vec2;
  startTime: number;
}

/**
 * The window starts fully click-through (setIgnoreMouseEvents(true, {forward:
 * true})), which still forwards mousemove so we can detect hover over the
 * sprite and flip click-through off, letting the next mousedown land on us
 * to start a drag. This is the region-based approximation described in the
 * plan (vs. per-pixel alpha sampling, a documented future enhancement).
 *
 * pointerdown doesn't immediately start a drag — it's ambiguous until the
 * pointer either moves past DRAG_PROMOTION_THRESHOLD_PX (promotes to a
 * drag) or releases without moving that far. A release that was never
 * promoted is classified by how long it was held (see
 * gestureClassifier.ts) into a quick "poke" or a held "pet" — two
 * independently unlockable interactions (via isInteractionUnlocked),
 * both currently triggering the same reaction; more gesture types
 * (double-click, right-click) would follow this same pattern.
 */
export class InputController {
  private isDragging = false;
  private dragOffset: Vec2 = { x: 0, y: 0 };
  private pending: PendingPointerDown | null = null;
  private isHovering = false;
  private currentAnimation: SpeciesAnimationDef | null = null;
  private currentScale = 1;

  // Bound once so destroy() can remove exactly the listeners attach() added
  // — an inline arrow passed straight to addEventListener can't be removed
  // later, which would leak a duplicate listener set on every species
  // reload (see main.ts's onSpeciesLoaded, which recreates this class).
  private readonly boundOnPointerMove = (e: PointerEvent) => this.onPointerMove(e);
  private readonly boundOnPointerDown = (e: PointerEvent) => this.onPointerDown(e);
  private readonly boundOnPointerUp = () => this.onPointerUp();

  constructor(
    private canvas: HTMLCanvasElement,
    private renderer: PetRenderer,
    private behavior: BehaviorController,
    private isInteractionUnlocked: (id: string) => boolean = () => false,
  ) {
    canvas.addEventListener('pointermove', this.boundOnPointerMove);
    canvas.addEventListener('pointerdown', this.boundOnPointerDown);
    window.addEventListener('pointerup', this.boundOnPointerUp);
  }

  /** Removes this instance's event listeners. Call before discarding it. */
  destroy(): void {
    this.canvas.removeEventListener('pointermove', this.boundOnPointerMove);
    this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown);
    window.removeEventListener('pointerup', this.boundOnPointerUp);
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
    this.pending = { startPos: this.getPointerPos(e), startTime: performance.now() };
  }

  private onPointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.behavior.resumeAfterDrag();
      window.petAPI.dragEnd();
      return;
    }

    if (this.pending) {
      const heldMs = performance.now() - this.pending.startTime;
      this.pending = null;

      const gesture = classifyPointerRelease(heldMs, LONG_PRESS_THRESHOLD_MS);
      const interactionId = gesture === 'longpress' ? 'pet' : 'poke';
      if (this.isInteractionUnlocked(interactionId)) {
        this.behavior.react();
      }
    }
  }
}
