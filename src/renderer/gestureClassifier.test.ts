import { describe, it, expect } from 'vitest';
import { classifyPointerRelease } from './gestureClassifier';

describe('classifyPointerRelease', () => {
  it('classifies a short hold as a click', () => {
    expect(classifyPointerRelease(0, 400)).toBe('click');
    expect(classifyPointerRelease(399, 400)).toBe('click');
  });

  it('classifies exactly the threshold as a longpress', () => {
    expect(classifyPointerRelease(400, 400)).toBe('longpress');
  });

  it('classifies a long hold as a longpress', () => {
    expect(classifyPointerRelease(2000, 400)).toBe('longpress');
  });
});
