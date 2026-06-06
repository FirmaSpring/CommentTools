import React from 'react';
import './Toolbar.css';
import type { ToolbarThemeMode } from './toolbarModel';
import {
  getToolSettingSections,
  type RgbColor,
  type ToolbarSettingsTool,
} from './toolbarSettings';

interface SubmenuPanelProps {
  activeTool: ToolbarSettingsTool;
  themeMode: ToolbarThemeMode;
  color: string;
  rgbColor: RgbColor;
  size: number;
  trail: number;
  trailColor: string;
  assistMode: boolean;
  onColorChange: (color: string) => void;
  onRgbChange: (channel: keyof RgbColor, value: number) => void;
  onSizeChange: (size: number) => void;
  onTrailChange: (trail: number) => void;
  onTrailColorChange: (color: string) => void;
  onAssistModeChange: (enabled: boolean) => void;
  onClearAll: () => void;
  standalone?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const RGB_CHANNELS: Array<{ key: keyof RgbColor; label: string }> = [
  { key: 'r', label: 'R' },
  { key: 'g', label: 'G' },
  { key: 'b', label: 'B' },
];

export const SubmenuPanel: React.FC<SubmenuPanelProps> = ({
  activeTool,
  themeMode,
  color,
  rgbColor,
  size,
  trail,
  trailColor,
  assistMode,
  onColorChange,
  onRgbChange,
  onSizeChange,
  onTrailChange,
  onTrailColorChange,
  onAssistModeChange,
  onClearAll,
  standalone = false,
  onMouseEnter,
  onMouseLeave,
}) => {
  const sections = getToolSettingSections(activeTool);

  if (sections.length === 0) {
    return null;
  }

  const palette = ['#ff4d6d', '#f59e0b', '#10b981', '#38bdf8', '#8b5cf6', '#f8fafc', '#111827'];
  const trailPalette = ['#fecdd3', '#fde68a', '#86efac', '#7dd3fc', '#c4b5fd', '#f8fafc', '#94a3b8'];

  return (
    <div
      className={`submenu-panel ${standalone ? 'standalone' : 'side-popout'} frosted-glass theme-${themeMode}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <h4>{activeTool === 'pen' ? '画笔设置' : '橡皮擦设置'}</h4>
      <div className="submenu-panel__content">
        {sections.includes('palette') && (
          <div className="setting-group">
            <div className="setting-header">
              <label>预设颜色</label>
              <span className="setting-value">{color.toUpperCase()}</span>
            </div>
            <div className="color-picker">
              {palette.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`color-swatch ${color === item ? 'selected' : ''}`}
                  title={`选择预设颜色 ${item.toUpperCase()}`}
                  aria-label={`选择预设颜色 ${item.toUpperCase()}`}
                  style={{ backgroundColor: item }}
                  onClick={() => onColorChange(item)}
                />
              ))}
            </div>
          </div>
        )}

        {sections.includes('rgb') && (
          <div className="setting-group">
            <div className="setting-header">
              <label>RGB 取色板</label>
              <div className="rgb-preview" style={{ backgroundColor: color }} />
            </div>
            <div className="rgb-card">
              {RGB_CHANNELS.map((channel) => (
                <div className="rgb-row" key={channel.key}>
                  <span className={`rgb-tag rgb-tag-${channel.key}`}>{channel.label}</span>
                  <div className={`slider-shell channel-${channel.key}`}>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={rgbColor[channel.key]}
                      title={`${channel.label} 通道滑块`}
                      aria-label={`${channel.label} 通道滑块`}
                      onChange={(event) => onRgbChange(channel.key, Number.parseInt(event.target.value, 10))}
                    />
                  </div>
                  <input
                    className="rgb-input"
                    type="number"
                    min="0"
                    max="255"
                    value={rgbColor[channel.key]}
                    title={`${channel.label} 通道数值`}
                    aria-label={`${channel.label} 通道数值`}
                    onChange={(event) => onRgbChange(channel.key, Number.parseInt(event.target.value, 10))}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {sections.includes('size') && (
          <div className="setting-group">
            <div className="setting-header">
              <label>大小</label>
              <span className="setting-value">{size}px</span>
            </div>
            <div className="slider-shell">
              <input
                type="range"
                min="1"
                max="50"
                value={size}
                title="调整笔触或橡皮大小"
                aria-label="调整笔触或橡皮大小"
                onChange={(event) => onSizeChange(Number.parseInt(event.target.value, 10))}
              />
            </div>
          </div>
        )}

        {sections.includes('trail') && (
          <div className="setting-group">
            <div className="setting-header">
              <label>滑动轨迹</label>
              <span className="setting-value">{trail}</span>
            </div>
            <div className="slider-shell">
              <input
                type="range"
                min="0"
                max="100"
                value={trail}
                title="调整拖尾长度"
                aria-label="调整拖尾长度"
                onChange={(event) => onTrailChange(Number.parseInt(event.target.value, 10))}
              />
            </div>
          </div>
        )}

        {sections.includes('trailColor') && (
          <div className="setting-group">
            <div className="setting-header">
              <label>轨迹颜色</label>
              <span className="setting-value">{trailColor.toUpperCase()}</span>
            </div>
            <div className="color-picker">
              {trailPalette.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`color-swatch ${trailColor === item ? 'selected' : ''}`}
                  title={`选择轨迹颜色 ${item.toUpperCase()}`}
                  aria-label={`选择轨迹颜色 ${item.toUpperCase()}`}
                  style={{ backgroundColor: item }}
                  onClick={() => onTrailColorChange(item)}
                />
              ))}
            </div>
          </div>
        )}

        {sections.includes('assistMode') && (
          <button
            type="button"
            className={`toggle-chip ${assistMode ? 'on' : 'off'}`}
            onClick={() => onAssistModeChange(!assistMode)}
          >
            <span>{assistMode ? '辅助模式已开启' : '辅助模式已关闭'}</span>
            <span>{assistMode ? '关闭' : '开启'}</span>
          </button>
        )}

        {sections.includes('clearAll') && (
          <button type="button" className="danger-action" onClick={onClearAll}>
            清除所有
          </button>
        )}
      </div>
    </div>
  );
};
