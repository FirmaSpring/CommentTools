import { describe, expect, it } from 'vitest';
import {
  createCanvasWindowOptions,
  createSettingsWindowOptions,
  createToolbarWindowOptions,
  getSettingsBounds,
  getToolbarBounds,
} from '../../src/electron/windowConfig';

describe('windowConfig', () => {
  it('creates a non-fullscreen canvas overlay that does not steal focus', () => {
    const options = createCanvasWindowOptions({ width: 1920, height: 1080 });

    expect(options.fullscreen).toBeUndefined();
    expect(options.width).toBe(1920);
    expect(options.height).toBe(1080);
    expect(options.focusable).toBe(false);
    expect(options.skipTaskbar).toBe(true);
    expect(options.alwaysOnTop).toBe(true);
    expect(options.transparent).toBe(true);
  });

  it('creates a toolbar window without acrylic background material', () => {
    const options = createToolbarWindowOptions({ width: 1920, height: 1080 });

    expect(options.focusable).toBe(false);
    expect(options.skipTaskbar).toBe(true);
    expect(options.transparent).toBe(true);
    expect(options.backgroundMaterial).toBeUndefined();
  });

  it('positions the toolbar as a compact standalone window near the right edge', () => {
    expect(getToolbarBounds({ width: 1920, height: 1080 })).toEqual({
      width: 96,
      height: 500,
      x: 1812,
      y: 290,
    });
  });

  it('positions the settings window as a separate topmost panel to the left of the toolbar', () => {
    expect(getSettingsBounds({ width: 1920, height: 1080 })).toEqual({
      width: 280,
      height: 520,
      x: 1532,
      y: 280,
    });
  });

  it('creates a settings window without relying on a fullscreen overlay mask', () => {
    const options = createSettingsWindowOptions({ width: 1920, height: 1080 });

    expect(options.focusable).toBe(false);
    expect(options.skipTaskbar).toBe(true);
    expect(options.alwaysOnTop).toBe(true);
    expect(options.transparent).toBe(true);
  });
});
