import { describe, expect, it } from 'vitest';
import {
  getCanvasCursor,
  getCanvasCursorSvg,
  getCursorHotspot,
  getDefaultThemeMode,
  getFloatingBallSize,
  getToolCursorSvg,
  getToolbarPanelWidth,
  getPenSettingKeys,
  getToolCursor,
  getToolbarTools,
  toggleThemeMode,
} from '../../src/toolbar/toolbarModel';

describe('toolbarModel', () => {
  it('keeps toolbar tools in the required order', () => {
    const tools = getToolbarTools();

    expect(tools.map((tool) => tool.id)).toEqual([
      'mouse',
      'pen',
      'eraser',
      'undo',
      'clear',
      'theme',
      'text',
      'settings',
      'collapse',
    ]);
    expect(tools.find((tool) => tool.id === 'theme')?.label).toBe('明暗模式');
  });

  it('includes trail color in pen settings', () => {
    expect(getPenSettingKeys()).toEqual(['color', 'size', 'trail', 'trailColor']);
  });

  it('uses a compact floating ball and a slightly larger toolbar panel', () => {
    expect(getFloatingBallSize()).toBe(28);
    expect(getToolbarPanelWidth()).toBe(56);
  });

  it('toggles between dark and light theme modes', () => {
    expect(getDefaultThemeMode()).toBe('dark');
    expect(toggleThemeMode('dark')).toBe('light');
    expect(toggleThemeMode('light')).toBe('dark');
  });

  it('provides white svg cursors with black outlines for pen and eraser modes', () => {
    expect(getToolCursor('pen')).toContain('data:image/svg+xml');
    expect(getToolCursor('eraser')).toContain('data:image/svg+xml');
    expect(getToolCursor('mouse')).toBe('default');
    expect(getToolCursorSvg('pen')).toContain('#ffffff');
    expect(getToolCursorSvg('pen')).toContain('#111111');
    expect(getToolCursorSvg('eraser')).toContain('<circle');
    expect(getToolCursor('pen')).toContain('6 24');
    expect(getCursorHotspot('pen', 32)).toEqual({ x: 6, y: 24 });
  });

  it('scales the eraser cursor circle with the selected size', () => {
    expect(getCanvasCursorSvg('eraser', 8)).toContain('width="24"');
    expect(getCanvasCursorSvg('eraser', 24)).toContain('width="48"');
    expect(getCanvasCursor('eraser', 24)).toContain('data:image/svg+xml');
  });
});
