import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('toolbar styles', () => {
  it('shares theme variables with the standalone settings window root', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/toolbar/Toolbar.css'),
      'utf8',
    );

    expect(css).toMatch(/\.widget-container,\s*\.settings-window-shell\s*\{/);
    expect(css).toMatch(
      /\.widget-container\.theme-light,\s*\.settings-window-shell\.theme-light\s*\{/,
    );
  });

  it('keeps the standalone settings panel visually almost attached to the toolbar', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/toolbar/Toolbar.css'),
      'utf8',
    );

    expect(css).toMatch(/\.settings-window-shell\s*\{[\s\S]*padding:\s*8px 2px 8px 8px;/);
  });
});
