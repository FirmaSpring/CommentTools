import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import type { AppSettings, ShortcutAction, ShortcutSettings } from '../src/electron/appSettings';
import {
  DEFAULT_APP_SETTINGS,
  getShortcutEntries,
  mergeAppSettings,
  validateShortcutSettings,
} from '../src/electron/appSettings';
import { getDisableAutoLaunchArgs, getEnableAutoLaunchArgs } from '../src/electron/autoLaunch';
import {
  createCanvasWindowOptions,
  createSettingsWindowOptions,
  createToolbarWindowOptions,
} from '../src/electron/windowConfig';
import { getRendererTarget } from '../src/electron/rendererPaths';

type ToolbarStateSyncPayload = {
  source: 'toolbar' | 'settings';
  expanded: boolean;
  activeTool: string;
  openPanel?: 'pen' | 'eraser' | 'settings' | null;
  showSubmenu: boolean;
  showSystemSettings?: boolean;
  color: string;
  rgbColor: { r: number; g: number; b: number };
  size: number;
  trail: number;
  trailColor: string;
  assistMode: boolean;
  themeMode: 'dark' | 'light';
};

type SettingsUpdateResult = {
  ok: boolean;
  settings?: AppSettings;
  message?: string;
};

const execFileAsync = promisify(execFile);
const APP_SETTINGS_FILE_NAME = 'app-settings.json';
const APP_ICON_RELATIVE_PATH = 'assets/icons/brush-app-icon.png';
const EMERGENCY_SHORTCUTS = ['Escape', 'CommandOrControl+Shift+X'] as const;

let canvasWindow: BrowserWindow | null = null;
let toolbarWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let appSettings: AppSettings = DEFAULT_APP_SETTINGS;
const registeredUserShortcuts = new Set<string>();

function getSettingsFilePath(): string {
  return join(app.getPath('userData'), APP_SETTINGS_FILE_NAME);
}

function getAppIconPath(): string {
  return join(app.getAppPath(), APP_ICON_RELATIVE_PATH);
}

function getDevServerUrl(): string | undefined {
  if (app.isPackaged) {
    return undefined;
  }

  return process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173';
}

function loadRenderer(window: BrowserWindow, view: 'canvas' | 'toolbar' | 'settings') {
  const target = getRendererTarget(app.getAppPath(), view, getDevServerUrl());

  if (target.kind === 'url') {
    window.loadURL(target.value);
    return;
  }

  window.loadFile(target.value, target.query ? { query: target.query } : undefined);
}

function shouldShowSettingsWindow(payload: ToolbarStateSyncPayload) {
  const shouldShowToolSettings =
    payload.showSubmenu === true &&
    (payload.openPanel === 'pen' ||
      payload.openPanel === 'eraser' ||
      payload.activeTool === 'pen' ||
      payload.activeTool === 'eraser');
  const shouldShowSystemSettings =
    payload.showSystemSettings === true || payload.openPanel === 'settings';

  return payload.expanded !== false && (shouldShowToolSettings || shouldShowSystemSettings);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

function loadAppSettings(): AppSettings {
  try {
    const filePath = getSettingsFilePath();
    const raw = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<AppSettings>;
    return mergeAppSettings(raw);
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

function saveAppSettings() {
  const filePath = getSettingsFilePath();
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(appSettings, null, 2), 'utf8');
}

function broadcastAppSettings() {
  toolbarWindow?.webContents.send('app-settings:sync', appSettings);
  settingsWindow?.webContents.send('app-settings:sync', appSettings);
}

async function setLaunchOnStartup(enabled: boolean) {
  const args = enabled ? getEnableAutoLaunchArgs(process.execPath) : getDisableAutoLaunchArgs();
  await execFileAsync('reg', args, { windowsHide: true });
}

function notifyShortcutAction(action: ShortcutAction | 'undo' | 'clear') {
  toolbarWindow?.webContents.send('shortcut-action', action);
  settingsWindow?.webContents.send('shortcut-action', action);
}

function applyToolChange(tool: 'mouse' | 'pen' | 'eraser' | 'text') {
  if (tool === 'mouse') {
    canvasWindow?.setIgnoreMouseEvents(true, { forward: true });
  } else {
    canvasWindow?.setIgnoreMouseEvents(false);
  }

  canvasWindow?.webContents.send('active-tool', tool);
}

function handleShortcutAction(action: ShortcutAction) {
  if (action === 'undo' || action === 'clear') {
    canvasWindow?.webContents.send('canvas-command', action);
    settingsWindow?.hide();
    notifyShortcutAction(action);
    return;
  }

  applyToolChange(action);
  settingsWindow?.hide();
  notifyShortcutAction(action);
}

function unregisterUserShortcuts() {
  registeredUserShortcuts.forEach((accelerator) => {
    globalShortcut.unregister(accelerator);
  });
  registeredUserShortcuts.clear();
}

function registerUserShortcuts() {
  unregisterUserShortcuts();

  getShortcutEntries(appSettings.shortcuts).forEach(({ action, accelerator }) => {
    const isRegistered = globalShortcut.register(accelerator, () => {
      handleShortcutAction(action);
    });

    if (!isRegistered) {
      throw new Error(`无法注册快捷键 ${accelerator}`);
    }

    registeredUserShortcuts.add(accelerator);
  });
}

function registerEmergencyShortcuts() {
  EMERGENCY_SHORTCUTS.forEach((accelerator) => {
    globalShortcut.register(accelerator, () => {
      forceSafeMouseMode();
    });
  });
}

function syncShortcutSettings(shortcuts: ShortcutSettings): SettingsUpdateResult {
  const validationErrors = validateShortcutSettings(shortcuts);
  if (validationErrors.length > 0) {
    return {
      ok: false,
      message: validationErrors[0],
      settings: appSettings,
    };
  }

  const previousSettings = appSettings;
  appSettings = mergeAppSettings({
    ...appSettings,
    shortcuts,
  });

  try {
    registerUserShortcuts();
    saveAppSettings();
    broadcastAppSettings();
    return { ok: true, settings: appSettings };
  } catch (error) {
    appSettings = previousSettings;
    registerUserShortcuts();
    return {
      ok: false,
      message: getErrorMessage(error),
      settings: appSettings,
    };
  }
}

async function syncLaunchOnStartup(enabled: boolean): Promise<SettingsUpdateResult> {
  try {
    await setLaunchOnStartup(enabled);
    appSettings = {
      ...appSettings,
      launchOnStartup: enabled,
    };
    saveAppSettings();
    broadcastAppSettings();
    return { ok: true, settings: appSettings };
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error),
      settings: appSettings,
    };
  }
}

function forceSafeMouseMode() {
  canvasWindow?.setIgnoreMouseEvents(true, { forward: true });
  canvasWindow?.webContents.send('active-tool', 'mouse');
  toolbarWindow?.webContents.send('reset-toolbar-ui-state');
  settingsWindow?.webContents.send('reset-toolbar-ui-state');
  settingsWindow?.hide();
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const display = {
    width: primaryDisplay.bounds.width,
    height: primaryDisplay.bounds.height,
  };

  canvasWindow = new BrowserWindow({
    ...createCanvasWindowOptions(display),
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    icon: getAppIconPath(),
    backgroundColor: '#00000000',
  });

  canvasWindow.setAlwaysOnTop(true, 'screen-saver');
  canvasWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  canvasWindow.setIgnoreMouseEvents(true, { forward: true });
  loadRenderer(canvasWindow, 'canvas');
  canvasWindow.once('ready-to-show', () => {
    canvasWindow?.showInactive();
  });

  toolbarWindow = new BrowserWindow({
    ...createToolbarWindowOptions(display),
    x: primaryDisplay.bounds.x + createToolbarWindowOptions(display).x,
    y: primaryDisplay.bounds.y + createToolbarWindowOptions(display).y,
    icon: getAppIconPath(),
    backgroundColor: '#00000000',
  });

  toolbarWindow.setAlwaysOnTop(true, 'screen-saver');
  toolbarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  toolbarWindow.setIgnoreMouseEvents(true, { forward: true });
  loadRenderer(toolbarWindow, 'toolbar');
  toolbarWindow.once('ready-to-show', () => {
    toolbarWindow?.showInactive();
    broadcastAppSettings();
  });

  settingsWindow = new BrowserWindow({
    ...createSettingsWindowOptions(display),
    x: primaryDisplay.bounds.x + createSettingsWindowOptions(display).x,
    y: primaryDisplay.bounds.y + createSettingsWindowOptions(display).y,
    show: false,
    icon: getAppIconPath(),
    backgroundColor: '#00000000',
  });

  settingsWindow.setAlwaysOnTop(true, 'screen-saver');
  settingsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  settingsWindow.setIgnoreMouseEvents(true, { forward: true });
  loadRenderer(settingsWindow, 'settings');
}

app.whenReady().then(() => {
  appSettings = loadAppSettings();
  createWindow();
  registerEmergencyShortcuts();
  registerUserShortcuts();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.handle('app-settings:get', () => appSettings);

ipcMain.handle('app-settings:update-shortcuts', (_event, shortcuts: ShortcutSettings) => {
  return syncShortcutSettings(shortcuts);
});

ipcMain.handle('app-settings:update-launch-on-startup', (_event, enabled: boolean) => {
  return syncLaunchOnStartup(enabled);
});

ipcMain.on('app:quit', () => {
  app.quit();
});

// IPC 通信：工具切换与鼠标穿透控制
ipcMain.on('tool-changed', (_event, tool: 'mouse' | 'pen' | 'eraser' | 'text') => {
  applyToolChange(tool);
});

ipcMain.on(
  'setting-changed',
  (
    _event,
    setting: {
      type: 'color' | 'size' | 'trail' | 'trailColor' | 'assistMode';
      value: string | number | boolean;
    },
  ) => {
    canvasWindow?.webContents.send('setting-changed', setting);
  },
);

ipcMain.on('canvas-command', (_event, command: 'undo' | 'clear') => {
  canvasWindow?.webContents.send('canvas-command', command);
});

ipcMain.on('toolbar-ignore-mouse', (_event, ignore: boolean) => {
  toolbarWindow?.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on('settings-ignore-mouse', (_event, ignore: boolean) => {
  settingsWindow?.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on('toolbar-state-sync', (event, payload: ToolbarStateSyncPayload) => {
  if (toolbarWindow && event.sender !== toolbarWindow.webContents) {
    toolbarWindow.webContents.send('toolbar-state-sync', payload);
  }

  if (settingsWindow && event.sender !== settingsWindow.webContents) {
    settingsWindow.webContents.send('toolbar-state-sync', payload);
  }

  if (shouldShowSettingsWindow(payload)) {
    settingsWindow?.showInactive();
  } else {
    settingsWindow?.hide();
  }
});
