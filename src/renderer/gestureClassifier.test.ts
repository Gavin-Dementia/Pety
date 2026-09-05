import { describe, it, expect } from 'vitest';
import { classifyPointerRelease, isDoubleClick } from './gestureClassifier';

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

describe('isDoubleClick', () => {
  it('is false when there was no previous click', () => {
    expect(isDoubleClick(1000, null, 300)).toBe(false);
  });

  it('is true within the window', () => {
    expect(isDoubleClick(1200, 1000, 300)).toBe(true);
  });

  it('is true at exactly the window boundary', () => {
    expect(isDoubleClick(1300, 1000, 300)).toBe(true);
  });

  it('is false just past the window', () => {
    expect(isDoubleClick(1301, 1000, 300)).toBe(false);
  });
});
