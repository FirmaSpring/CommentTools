import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_SHORTCUT_SETTINGS,
  getShortcutEntries,
  mergeAppSettings,
  normalizeShortcutInput,
  validateShortcutSettings,
} from '../../src/electron/appSettings';

describe('appSettings', () => {
  it('exposes the requested default shortcut mapping', () => {
    expect(DEFAULT_SHORTCUT_SETTINGS).toEqual({
      mouse: 'Alt+1',
      pen: 'Alt+2',
      eraser: 'Alt+3',
      undo: 'Alt+4',
      clear: 'Alt+C',
    });
    expect(DEFAULT_APP_SETTINGS.launchOnStartup).toBe(false);
  });

  it('normalizes shortcut input into Alt plus one uppercase key', () => {
    expect(normalizeShortcutInput('c')).toBe('Alt+C');
    expect(normalizeShortcutInput('Alt+4')).toBe('Alt+4');
    expect(normalizeShortcutInput(' alt + z ')).toBe('Alt+Z');
  });

  it('rejects invalid or multi-key shortcuts', () => {
    expect(normalizeShortcutInput('')).toBe('');
    expect(normalizeShortcutInput('Shift+1')).toBe('');
    expect(normalizeShortcutInput('Alt+AB')).toBe('');
    expect(normalizeShortcutInput('F1')).toBe('');
  });

  it('detects duplicate shortcuts before registration', () => {
    expect(
      validateShortcutSettings({
        ...DEFAULT_SHORTCUT_SETTINGS,
        clear: 'Alt+1',
      }),
    ).toEqual(['快捷键不能重复']);
  });

  it('merges persisted settings with defaults and returns shortcut entries for registration', () => {
    const merged = mergeAppSettings({
      launchOnStartup: true,
      shortcuts: {
        mouse: 'Alt+9',
      },
    });

    expect(merged).toEqual({
      launchOnStartup: true,
      shortcuts: {
        mouse: 'Alt+9',
        pen: 'Alt+2',
        eraser: 'Alt+3',
        undo: 'Alt+4',
        clear: 'Alt+C',
      },
    });
    expect(getShortcutEntries(merged.shortcuts)).toEqual([
      { action: 'mouse', accelerator: 'Alt+9' },
      { action: 'pen', accelerator: 'Alt+2' },
      { action: 'eraser', accelerator: 'Alt+3' },
      { action: 'undo', accelerator: 'Alt+4' },
      { action: 'clear', accelerator: 'Alt+C' },
    ]);
  });
});
