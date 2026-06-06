import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '../../src/electron/appSettings';
import { SystemSettingsPanel } from '../../src/toolbar/SystemSettingsPanel';

describe('SystemSettingsPanel', () => {
  it('renders a quit app button in the system settings panel', () => {
    const html = renderToStaticMarkup(
      <SystemSettingsPanel
        themeMode="dark"
        settings={DEFAULT_APP_SETTINGS}
        shortcutDrafts={DEFAULT_APP_SETTINGS.shortcuts}
        errorMessage=""
        onLaunchOnStartupChange={() => undefined}
        onShortcutChange={() => undefined}
        onQuitApp={() => undefined}
      />,
    );

    expect(html).toContain('退出程序');
  });
});
