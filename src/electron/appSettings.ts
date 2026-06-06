export type ShortcutAction = 'mouse' | 'pen' | 'eraser' | 'undo' | 'clear';

export interface ShortcutSettings {
  mouse: string;
  pen: string;
  eraser: string;
  undo: string;
  clear: string;
}

export interface AppSettings {
  launchOnStartup: boolean;
  shortcuts: ShortcutSettings;
}

export const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  mouse: 'Alt+1',
  pen: 'Alt+2',
  eraser: 'Alt+3',
  undo: 'Alt+4',
  clear: 'Alt+C',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  launchOnStartup: false,
  shortcuts: DEFAULT_SHORTCUT_SETTINGS,
};

const SHORTCUT_ACTIONS: ShortcutAction[] = ['mouse', 'pen', 'eraser', 'undo', 'clear'];
const SHORTCUT_PATTERN = /^Alt\+([A-Z0-9])$/;

export function normalizeShortcutInput(value: string): string {
  const normalized = value.toUpperCase().replace(/\s+/g, '');

  if (!normalized) {
    return '';
  }

  if (/^[A-Z0-9]$/.test(normalized)) {
    return `Alt+${normalized}`;
  }

  const compact = normalized.replace(/^ALT\+/, '');
  if (/^[A-Z0-9]$/.test(compact)) {
    return `Alt+${compact}`;
  }

  return '';
}

export function validateShortcutSettings(shortcuts: ShortcutSettings): string[] {
  const seen = new Set<string>();

  for (const action of SHORTCUT_ACTIONS) {
    const accelerator = shortcuts[action];

    if (!SHORTCUT_PATTERN.test(accelerator)) {
      return ['快捷键只支持 Alt + 单个字母或数字'];
    }

    if (seen.has(accelerator)) {
      return ['快捷键不能重复'];
    }

    seen.add(accelerator);
  }

  return [];
}

export function mergeAppSettings(settings?: Partial<AppSettings>): AppSettings {
  return {
    launchOnStartup: settings?.launchOnStartup ?? DEFAULT_APP_SETTINGS.launchOnStartup,
    shortcuts: {
      ...DEFAULT_SHORTCUT_SETTINGS,
      ...settings?.shortcuts,
    },
  };
}

export function getShortcutEntries(shortcuts: ShortcutSettings): Array<{
  action: ShortcutAction;
  accelerator: string;
}> {
  return SHORTCUT_ACTIONS.map((action) => ({
    action,
    accelerator: shortcuts[action],
  }));
}
