export type PointerReleaseGesture = 'click' | 'longpress';

/**
 * Classifies a pointer release that was never promoted to a drag (i.e.
 * movement stayed under InputController's drag-promotion threshold the
 * whole time). Pure and DOM-free specifically so it's unit-testable
 * without a browser environment.
 */
export function classifyPointerRelease(
  heldMs: number,
  longPressThresholdMs: number,
): PointerReleaseGesture {
  return heldMs >= longPressThresholdMs ? 'longpress' : 'click';
}

/**
 * True if `now` lands within `windowMs` of the previous qualifying click
 * (`lastClickTime`, or null if there wasn't one yet). Pure — InputController
 * owns tracking/updating lastClickTime itself, this just answers the
 * threshold question so it's unit-testable without a DOM.
 */
export function isDoubleClick(
  now: number,
  lastClickTime: number | null,
  windowMs: number,
): boolean {
  return lastClickTime !== null && now - lastClickTime <= windowMs;
}
