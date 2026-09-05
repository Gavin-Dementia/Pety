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
