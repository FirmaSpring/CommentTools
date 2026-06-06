import { describe, expect, it } from 'vitest';
import {
  getToolSettingSections,
  hexToRgbColor,
  rgbColorToHex,
  shouldShowSystemSettingsPanel,
  shouldShowToolSubmenu,
} from '../../src/toolbar/toolbarSettings';

describe('toolbarSettings', () => {
  it('returns rgb and assist settings for pen', () => {
    expect(getToolSettingSections('pen')).toEqual([
      'palette',
      'rgb',
      'size',
      'trail',
      'trailColor',
      'assistMode',
    ]);
  });

  it('returns eraser controls including clearAll', () => {
    expect(getToolSettingSections('eraser')).toEqual([
      'size',
      'clearAll',
    ]);
  });

  it('returns no settings for text recognition button', () => {
    expect(getToolSettingSections('text')).toEqual([]);
  });

  it('returns launch and shortcut settings for the settings button', () => {
    expect(getToolSettingSections('settings')).toEqual([
      'launchOnStartup',
      'shortcuts',
    ]);
  });

  it('only shows submenu for pen and eraser', () => {
    expect(shouldShowToolSubmenu('pen')).toBe(true);
    expect(shouldShowToolSubmenu('eraser')).toBe(true);
    expect(shouldShowToolSubmenu('text')).toBe(false);
    expect(shouldShowToolSubmenu('settings')).toBe(false);
  });

  it('opens the standalone system settings panel only for the settings button', () => {
    expect(shouldShowSystemSettingsPanel('settings')).toBe(true);
    expect(shouldShowSystemSettingsPanel('pen')).toBe(false);
  });

  it('converts between hex and rgb values for the inline picker', () => {
    expect(hexToRgbColor('#ff4d6d')).toEqual({ r: 255, g: 77, b: 109 });
    expect(rgbColorToHex({ r: 56, g: 189, b: 248 })).toBe('#38bdf8');
  });

  it('clamps rgb input before converting to hex', () => {
    expect(rgbColorToHex({ r: -12, g: 280, b: 12.4 })).toBe('#00ff0c');
  });
});
