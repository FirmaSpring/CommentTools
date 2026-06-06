export type ToolbarSettingsTool = 'mouse' | 'pen' | 'eraser' | 'text' | 'settings';
export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export type ToolbarSettingSection =
  | 'palette'
  | 'rgb'
  | 'size'
  | 'trail'
  | 'trailColor'
  | 'assistMode'
  | 'clearAll'
  | 'launchOnStartup'
  | 'shortcuts';

const TOOL_SETTING_SECTIONS: Record<ToolbarSettingsTool, ToolbarSettingSection[]> = {
  mouse: [],
  pen: ['palette', 'rgb', 'size', 'trail', 'trailColor', 'assistMode'],
  eraser: ['size', 'clearAll'],
  text: [],
  settings: ['launchOnStartup', 'shortcuts'],
};

export function getToolSettingSections(tool: ToolbarSettingsTool): ToolbarSettingSection[] {
  return [...TOOL_SETTING_SECTIONS[tool]];
}

export function shouldShowToolSubmenu(tool: ToolbarSettingsTool): boolean {
  return tool === 'pen' || tool === 'eraser';
}

export function shouldShowSystemSettingsPanel(tool: ToolbarSettingsTool): boolean {
  return tool === 'settings';
}

export function hexToRgbColor(color: string): RgbColor {
  const normalized = color.replace('#', '').padStart(6, '0').slice(0, 6);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbColorToHex(color: RgbColor): string {
  const channels = [color.r, color.g, color.b]
    .map(clampRgbChannel)
    .map((channel) => channel.toString(16).padStart(2, '0'));

  return `#${channels.join('')}`;
}

function clampRgbChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
