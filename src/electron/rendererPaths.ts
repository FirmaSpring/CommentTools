import { join } from 'node:path';

export type RendererView = 'canvas' | 'toolbar' | 'settings';

type RendererUrlTarget = {
  kind: 'url';
  value: string;
};

type RendererFileTarget = {
  kind: 'file';
  value: string;
  query?: Record<string, string>;
};

export type RendererTarget = RendererUrlTarget | RendererFileTarget;

export function getRendererTarget(
  appPath: string,
  view: RendererView,
  devServerUrl?: string,
): RendererTarget {
  const normalizedDevServerUrl = devServerUrl?.replace(/\/$/, '');

  if (normalizedDevServerUrl) {
    if (view === 'canvas') {
      return {
        kind: 'url',
        value: `${normalizedDevServerUrl}/src/canvas/index.html`,
      };
    }

    return {
      kind: 'url',
      value: `${normalizedDevServerUrl}/src/toolbar/index.html?view=${view}`,
    };
  }

  if (view === 'canvas') {
    return {
      kind: 'file',
      value: join(appPath, 'dist', 'src', 'canvas', 'index.html'),
    };
  }

  return {
    kind: 'file',
    value: join(appPath, 'dist', 'src', 'toolbar', 'index.html'),
    query: {
      view,
    },
  };
}
