import type { DrawingTool } from '../canvas/canvasState';

export type ToolbarAction = DrawingTool | 'text' | 'undo' | 'clear' | 'theme' | 'settings' | 'collapse';
export type ToolbarThemeMode = 'dark' | 'light';

export interface ToolbarToolDefinition {
  id: ToolbarAction;
  label: string;
}

const TOOLBAR_TOOLS: ToolbarToolDefinition[] = [
  { id: 'mouse', label: '鼠标' },
  { id: 'pen', label: '笔' },
  { id: 'eraser', label: '橡皮' },
  { id: 'undo', label: '撤回' },
  { id: 'clear', label: '清屏' },
  { id: 'theme', label: '明暗模式' },
  { id: 'text', label: '字体自识别' },
  { id: 'settings', label: '系统设置' },
  { id: 'collapse', label: '收起' },
];

const PEN_SETTING_KEYS = ['color', 'size', 'trail', 'trailColor'] as const;
const FLOATING_BALL_SIZE = 28;
const TOOLBAR_PANEL_WIDTH = 56;
const DEFAULT_THEME_MODE: ToolbarThemeMode = 'dark';

export function getToolbarTools(): ToolbarToolDefinition[] {
  return TOOLBAR_TOOLS;
}

export function getFloatingBallSize(): number {
  return FLOATING_BALL_SIZE;
}

export function getToolbarPanelWidth(): number {
  return TOOLBAR_PANEL_WIDTH;
}

export function getPenSettingKeys(): string[] {
  return [...PEN_SETTING_KEYS];
}

export function getDefaultThemeMode(): ToolbarThemeMode {
  return DEFAULT_THEME_MODE;
}

export function toggleThemeMode(mode: ToolbarThemeMode): ToolbarThemeMode {
  return mode === 'dark' ? 'light' : 'dark';
}

export function getToolCursorSvg(tool: DrawingTool): string {
  if (tool === 'mouse') {
    return '';
  }

  return (
    tool === 'pen'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path d="M7 24L22 9l3 3-15 15-5 1z" fill="#ffffff" stroke="#111111" stroke-width="1.8" stroke-linejoin="round"/><path d="M21 7l2-2 4 4-2 2z" fill="#ffffff" stroke="#111111" stroke-width="1.8" stroke-linejoin="round"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="9" fill="none" stroke="#111111" stroke-width="2.4"/><circle cx="16" cy="16" r="8" fill="none" stroke="#ffffff" stroke-width="1.4"/></svg>`
  );
}

export function getToolCursor(tool: DrawingTool): string {
  if (tool === 'mouse') {
    return 'default';
  }

  const svg = getToolCursorSvg(tool);
  const hotspot = getCursorHotspot(tool, 32);
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot.x} ${hotspot.y}, auto`;
}

export function getCanvasCursor(tool: DrawingTool, size: number): string {
  if (tool !== 'eraser') {
    return getToolCursor(tool);
  }

  const svg = getCanvasCursorSvg(tool, size);
  const cursorSize = Math.max(24, Math.min(48, size * 2));
  const hotspot = getCursorHotspot(tool, cursorSize);
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot.x} ${hotspot.y}, auto`;
}

export function getCursorHotspot(tool: DrawingTool, cursorSize: number): { x: number; y: number } {
  if (tool === 'pen') {
    return { x: 6, y: 24 };
  }

  const center = Math.round(cursorSize / 2);
  return { x: center, y: center };
}

export function getCanvasCursorSvg(tool: DrawingTool, size: number): string {
  if (tool !== 'eraser') {
    return getToolCursorSvg(tool);
  }

  const cursorSize = Math.max(24, Math.min(48, size * 2));
  const radiusOuter = Math.max(6, Math.round(cursorSize / 2 - 3));
  const radiusInner = Math.max(5, radiusOuter - 1);
  const center = Math.round(cursorSize / 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize}" height="${cursorSize}" viewBox="0 0 ${cursorSize} ${cursorSize}"><circle cx="${center}" cy="${center}" r="${radiusOuter}" fill="none" stroke="#111111" stroke-width="2.4"/><circle cx="${center}" cy="${center}" r="${radiusInner}" fill="none" stroke="#ffffff" stroke-width="1.4"/></svg>`;
}
