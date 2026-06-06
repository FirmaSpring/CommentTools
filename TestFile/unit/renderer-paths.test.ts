import { describe, expect, it } from 'vitest';
import { getRendererTarget } from '../../src/electron/rendererPaths';

describe('rendererPaths', () => {
  it('returns dev server urls while running in development', () => {
    expect(getRendererTarget('D:/App', 'canvas', 'http://localhost:5173')).toEqual({
      kind: 'url',
      value: 'http://localhost:5173/src/canvas/index.html',
    });

    expect(getRendererTarget('D:/App', 'settings', 'http://localhost:5173/')).toEqual({
      kind: 'url',
      value: 'http://localhost:5173/src/toolbar/index.html?view=settings',
    });
  });

  it('returns packaged html files when no dev server url is available', () => {
    const canvasTarget = getRendererTarget('D:/App', 'canvas');
    expect(canvasTarget.kind).toBe('file');
    if (canvasTarget.kind === 'file') {
      expect(canvasTarget.value.endsWith('dist\\src\\canvas\\index.html')).toBe(true);
    }

    const toolbarTarget = getRendererTarget('D:/App', 'toolbar');
    expect(toolbarTarget.kind).toBe('file');
    if (toolbarTarget.kind === 'file') {
      expect(toolbarTarget.value.endsWith('dist\\src\\toolbar\\index.html')).toBe(true);
      expect(toolbarTarget.query).toEqual({
        view: 'toolbar',
      });
    }
  });
});
