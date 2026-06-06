import { describe, expect, it } from 'vitest';
import {
  getToolbarHoverCursor,
  getToolbarMouseLeaveDelay,
  shouldIgnoreToolbarMouse,
} from '../../src/toolbar/toolbarHitTest';

describe('toolbarHitTest', () => {
  it('ignores mouse events for transparent overlay area', () => {
    expect(shouldIgnoreToolbarMouse(false)).toBe(true);
  });

  it('captures mouse events only for visible toolbar controls', () => {
    expect(shouldIgnoreToolbarMouse(true)).toBe(false);
  });

  it('keeps toolbar interactive briefly when the pointer just left the edge buffer', () => {
    expect(getToolbarMouseLeaveDelay()).toBe(90);
    expect(shouldIgnoreToolbarMouse(false, true)).toBe(false);
  });

  it('keeps a compact toolbar window interactive so the cursor does not flicker on icon edges', () => {
    expect(shouldIgnoreToolbarMouse(false, false, true)).toBe(false);
  });

  it('uses a stable pointer cursor across the whole toolbar interactive area', () => {
    expect(getToolbarHoverCursor(false)).toBe('default');
    expect(getToolbarHoverCursor(true)).toBe('pointer');
  });
});
