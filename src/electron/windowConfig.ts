export interface DisplaySize {
  width: number;
  height: number;
}

export interface ToolbarBounds {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface SettingsBounds {
  width: number;
  height: number;
  x: number;
  y: number;
}

export function getToolbarBounds(display: DisplaySize): ToolbarBounds {
  const width = 96;
  const height = 500;
  const rightGap = 12;

  return {
    width,
    height,
    x: display.width - width - rightGap,
    y: Math.round((display.height - height) / 2),
  };
}

export function getSettingsBounds(display: DisplaySize): SettingsBounds {
  const toolbarBounds = getToolbarBounds(display);
  const width = 280;
  const height = 520;
  const gap = 0;

  return {
    width,
    height,
    x: toolbarBounds.x - width - gap,
    y: Math.round((display.height - height) / 2),
  };
}

export function createCanvasWindowOptions(display: DisplaySize) {
  return {
    width: display.width,
    height: display.height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  };
}

export function createToolbarWindowOptions(display: DisplaySize) {
  const bounds = getToolbarBounds(display);

  return {
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  };
}

export function createSettingsWindowOptions(display: DisplaySize) {
  const bounds = getSettingsBounds(display);

  return {
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  };
}
