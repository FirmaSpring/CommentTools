import React from 'react';
import type { AppSettings, ShortcutAction, ShortcutSettings } from '../electron/appSettings';
import type { ToolbarThemeMode } from './toolbarModel';
import './Toolbar.css';

interface SystemSettingsPanelProps {
  themeMode: ToolbarThemeMode;
  settings: AppSettings;
  shortcutDrafts: ShortcutSettings;
  errorMessage: string;
  onLaunchOnStartupChange: (enabled: boolean) => void;
  onShortcutChange: (action: ShortcutAction, value: string) => void;
  onQuitApp: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const SHORTCUT_FIELDS: Array<{ action: ShortcutAction; label: string }> = [
  { action: 'mouse', label: '鼠标' },
  { action: 'pen', label: '手写' },
  { action: 'eraser', label: '橡皮' },
  { action: 'undo', label: '撤回' },
  { action: 'clear', label: '清空' },
];

function getShortcutKeyDisplay(value: string): string {
  return value.replace(/^Alt\+/, '');
}

export const SystemSettingsPanel: React.FC<SystemSettingsPanelProps> = ({
  themeMode,
  settings,
  shortcutDrafts,
  errorMessage,
  onLaunchOnStartupChange,
  onShortcutChange,
  onQuitApp,
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <div
      className={`submenu-panel standalone frosted-glass theme-${themeMode} system-settings-panel`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <h4>系统设置</h4>
      <div className="submenu-panel__content">
        <div className="setting-group">
          <div className="setting-header">
            <label>开机自动启动</label>
            <span className="setting-value">{settings.launchOnStartup ? '已开启' : '已关闭'}</span>
          </div>
          <button
            type="button"
            className={`toggle-chip ${settings.launchOnStartup ? 'on' : 'off'}`}
            onClick={() => onLaunchOnStartupChange(!settings.launchOnStartup)}
          >
            <span>{settings.launchOnStartup ? '系统启动后自动运行' : '仅手动启动程序'}</span>
            <span>{settings.launchOnStartup ? '关闭' : '开启'}</span>
          </button>
        </div>

        <div className="setting-group">
          <div className="setting-header">
            <label>快捷键</label>
            <span className="setting-value">仅支持 Alt + 单键</span>
          </div>
          <div className="system-settings-panel__hint">
            输入一个字母或数字后会立即保存并重新注册全局快捷键。
          </div>
          <div className="system-settings-panel__shortcut-list">
            {SHORTCUT_FIELDS.map((field) => (
              <div key={field.action} className="system-settings-panel__shortcut-row">
                <span className="system-settings-panel__shortcut-label">{field.label}</span>
                <span className="system-settings-panel__shortcut-prefix">Alt +</span>
                <input
                  className="system-settings-panel__shortcut-input"
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={getShortcutKeyDisplay(shortcutDrafts[field.action])}
                  aria-label={`${field.label} 快捷键`}
                  title={`${field.label} 快捷键`}
                  onChange={(event) => onShortcutChange(field.action, event.target.value)}
                />
              </div>
            ))}
          </div>
          {errorMessage ? <div className="system-settings-panel__error">{errorMessage}</div> : null}
        </div>

        <div className="setting-group">
          <div className="setting-header">
            <label>程序控制</label>
            <span className="setting-value">立即退出应用</span>
          </div>
          <button type="button" className="danger-action" onClick={onQuitApp}>
            退出程序
          </button>
        </div>
      </div>
    </div>
  );
};
