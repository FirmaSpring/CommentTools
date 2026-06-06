import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('emergencyShortcuts', () => {
  it('registers emergency shortcuts directly in the main process entry', () => {
    const source = readFileSync(resolve(process.cwd(), 'electron/main.ts'), 'utf8');

    expect(source).toContain("const EMERGENCY_SHORTCUTS = ['Escape', 'CommandOrControl+Shift+X'] as const;");
    expect(source).toContain('globalShortcut.register(accelerator');
    expect(source).toContain('forceSafeMouseMode();');
  });

  it('handles a quit app IPC event in the main process entry', () => {
    const source = readFileSync(resolve(process.cwd(), 'electron/main.ts'), 'utf8');

    expect(source).toContain("ipcMain.on('app:quit'");
    expect(source).toContain('app.quit();');
  });
});
