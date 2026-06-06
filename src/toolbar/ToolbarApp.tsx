import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AppSettings, ShortcutAction, ShortcutSettings } from '../electron/appSettings';
import {
  DEFAULT_APP_SETTINGS,
  normalizeShortcutInput,
  validateShortcutSettings,
} from '../electron/appSettings';
import './Toolbar.css';
import { SystemSettingsPanel } from './SystemSettingsPanel';
import { SubmenuPanel } from './SubmenuPanel';
import {
  getToolbarHoverCursor,
  getToolbarMouseLeaveDelay,
  shouldIgnoreToolbarMouse,
} from './toolbarHitTest';
import {
  hexToRgbColor,
  rgbColorToHex,
  shouldShowToolSubmenu,
  type RgbColor,
} from './toolbarSettings';
import {
  getDefaultThemeMode,
  getFloatingBallSize,
  getToolbarPanelWidth,
  getToolbarTools,
  toggleThemeMode,
  type ToolbarThemeMode,
} from './toolbarModel';

type ToolbarViewMode = 'toolbar' | 'settings';
type ToolbarInteractiveTool = 'mouse' | 'pen' | 'eraser' | 'text';
type ToolbarPanelTool = 'pen' | 'eraser' | 'settings' | null;

type SettingsUpdateResult = {
  ok: boolean;
  settings?: AppSettings;
  message?: string;
};

type ToolbarStateSyncPayload = {
  source: ToolbarViewMode;
  expanded: boolean;
  activeTool: ToolbarInteractiveTool;
  openPanel: ToolbarPanelTool;
  showSubmenu: boolean;
  showSystemSettings: boolean;
  color: string;
  rgbColor: RgbColor;
  size: number;
  trail: number;
  trailColor: string;
  assistMode: boolean;
  themeMode: ToolbarThemeMode;
};

const DEFAULT_COLOR = '#ff4d6d';
const DEFAULT_TRAIL_COLOR = '#7dd3fc';

function getPanelFlags(openPanel: ToolbarPanelTool): Pick<
  ToolbarStateSyncPayload,
  'openPanel' | 'showSubmenu' | 'showSystemSettings'
> {
  return {
    openPanel,
    showSubmenu: openPanel === 'pen' || openPanel === 'eraser',
    showSystemSettings: openPanel === 'settings',
  };
}

function getOpenPanelFromPayload(payload: ToolbarStateSyncPayload): ToolbarPanelTool {
  if (payload.openPanel) {
    return payload.openPanel;
  }

  if (payload.showSystemSettings) {
    return 'settings';
  }

  if (payload.showSubmenu && (payload.activeTool === 'pen' || payload.activeTool === 'eraser')) {
    return payload.activeTool;
  }

  return null;
}

export const ToolbarApp: React.FC = () => {
  const viewMode = useMemo<ToolbarViewMode>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('view') === 'settings' ? 'settings' : 'toolbar';
  }, []);
  const isSettingsView = viewMode === 'settings';
  const { ipcRenderer } = window.require('electron');

  const [expanded, setExpanded] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolbarInteractiveTool>('mouse');
  const [openPanel, setOpenPanel] = useState<ToolbarPanelTool>(null);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [rgbColor, setRgbColor] = useState<RgbColor>(() => hexToRgbColor(DEFAULT_COLOR));
  const [size, setSize] = useState(5);
  const [trail, setTrail] = useState(0);
  const [trailColor, setTrailColor] = useState(DEFAULT_TRAIL_COLOR);
  const [assistMode, setAssistMode] = useState(false);
  const [themeMode, setThemeMode] = useState<ToolbarThemeMode>(getDefaultThemeMode());
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [shortcutDrafts, setShortcutDrafts] = useState<ShortcutSettings>(DEFAULT_APP_SETTINGS.shortcuts);
  const [settingsError, setSettingsError] = useState('');

  const floatingBallSize = useMemo(() => getFloatingBallSize(), []);
  const toolbarPanelWidth = useMemo(() => getToolbarPanelWidth(), []);
  const interactiveCursor = getToolbarHoverCursor(true);
  const keepWindowInteractive = true;
  const leaveTimerRef = useRef<number | null>(null);
  const ignoreMouseRef = useRef<boolean | null>(null);
  const stateRef = useRef<ToolbarStateSyncPayload>({
    source: viewMode,
    expanded: false,
    activeTool: 'mouse',
    ...getPanelFlags(null),
    color: DEFAULT_COLOR,
    rgbColor: hexToRgbColor(DEFAULT_COLOR),
    size: 5,
    trail: 0,
    trailColor: DEFAULT_TRAIL_COLOR,
    assistMode: false,
    themeMode: getDefaultThemeMode(),
  });

  const clearLeaveTimer = useCallback(() => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    stateRef.current = {
      source: viewMode,
      expanded,
      activeTool,
      ...getPanelFlags(openPanel),
      color,
      rgbColor,
      size,
      trail,
      trailColor,
      assistMode,
      themeMode,
    };
  }, [activeTool, assistMode, color, expanded, openPanel, rgbColor, size, themeMode, trail, trailColor, viewMode]);

  const emitToolbarState = useCallback(
    (overrides: Partial<ToolbarStateSyncPayload> = {}) => {
      const payload: ToolbarStateSyncPayload = {
        ...stateRef.current,
        ...overrides,
        source: viewMode,
      };
      stateRef.current = payload;
      ipcRenderer.send('toolbar-state-sync', payload);
    },
    [ipcRenderer, viewMode],
  );

  const syncMousePassthrough = useCallback(
    (isOverInteractiveArea: boolean, hasGracePeriod = false) => {
      const shouldIgnore = shouldIgnoreToolbarMouse(
        isOverInteractiveArea,
        hasGracePeriod,
        keepWindowInteractive,
      );
      if (ignoreMouseRef.current === shouldIgnore) {
        return;
      }

      ignoreMouseRef.current = shouldIgnore;
      ipcRenderer.send(isSettingsView ? 'settings-ignore-mouse' : 'toolbar-ignore-mouse', shouldIgnore);
    },
    [ipcRenderer, isSettingsView, keepWindowInteractive],
  );

  const handleInteractiveEnter = useCallback(() => {
    clearLeaveTimer();
    syncMousePassthrough(true);
  }, [clearLeaveTimer, syncMousePassthrough]);

  const handleInteractiveLeave = useCallback(() => {
    clearLeaveTimer();
    syncMousePassthrough(false, true);
    leaveTimerRef.current = window.setTimeout(() => {
      syncMousePassthrough(false);
    }, getToolbarMouseLeaveDelay());
  }, [clearLeaveTimer, syncMousePassthrough]);

  useEffect(() => {
    syncMousePassthrough(false);
    return () => {
      clearLeaveTimer();
      ipcRenderer.send(isSettingsView ? 'settings-ignore-mouse' : 'toolbar-ignore-mouse', true);
    };
  }, [clearLeaveTimer, ipcRenderer, isSettingsView, syncMousePassthrough]);

  useEffect(() => {
    let disposed = false;

    const syncSettingsState = (settings: AppSettings) => {
      if (disposed) {
        return;
      }

      setAppSettings(settings);
      setShortcutDrafts(settings.shortcuts);
      setSettingsError('');
    };

    const handleAppSettingsSync = (_event: unknown, settings: AppSettings) => {
      syncSettingsState(settings);
    };

    void ipcRenderer.invoke('app-settings:get').then((settings: AppSettings) => {
      syncSettingsState(settings);
    });

    ipcRenderer.on('app-settings:sync', handleAppSettingsSync);

    return () => {
      disposed = true;
      ipcRenderer.removeListener('app-settings:sync', handleAppSettingsSync);
    };
  }, [ipcRenderer]);

  useEffect(() => {
    const handleToolbarStateSync = (_event: unknown, payload: ToolbarStateSyncPayload) => {
      if (payload.source === viewMode) {
        return;
      }

      setExpanded(payload.expanded);
      setActiveTool(payload.activeTool);
      setOpenPanel(getOpenPanelFromPayload(payload));
      setColor(payload.color);
      setRgbColor(payload.rgbColor);
      setSize(payload.size);
      setTrail(payload.trail);
      setTrailColor(payload.trailColor);
      setAssistMode(payload.assistMode);
      setThemeMode(payload.themeMode);
    };

    const handleResetToolbarUiState = () => {
      setActiveTool('mouse');
      setOpenPanel(null);
    };

    const handleShortcutAction = (
      _event: unknown,
      action: ToolbarInteractiveTool | ShortcutAction | 'undo' | 'clear',
    ) => {
      if (action === 'undo' || action === 'clear') {
        setOpenPanel(null);
        return;
      }

      setActiveTool(action);
      setOpenPanel(null);
    };

    ipcRenderer.on('toolbar-state-sync', handleToolbarStateSync);
    ipcRenderer.on('reset-toolbar-ui-state', handleResetToolbarUiState);
    ipcRenderer.on('shortcut-action', handleShortcutAction);
    emitToolbarState();

    return () => {
      ipcRenderer.removeListener('toolbar-state-sync', handleToolbarStateSync);
      ipcRenderer.removeListener('reset-toolbar-ui-state', handleResetToolbarUiState);
      ipcRenderer.removeListener('shortcut-action', handleShortcutAction);
    };
  }, [emitToolbarState, ipcRenderer, viewMode]);

  const syncColorState = useCallback(
    (nextColor: string) => {
      const nextRgb = hexToRgbColor(nextColor);
      setColor(nextColor);
      setRgbColor(nextRgb);
      ipcRenderer.send('setting-changed', { type: 'color', value: nextColor });
      emitToolbarState({ color: nextColor, rgbColor: nextRgb });
    },
    [emitToolbarState, ipcRenderer],
  );

  const handleColorChange = (nextColor: string) => {
    syncColorState(nextColor);
  };

  const handleRgbChange = (channel: keyof RgbColor, value: number) => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const nextHex = rgbColorToHex({
      ...rgbColor,
      [channel]: safeValue,
    });
    syncColorState(nextHex);
  };

  const handleSizeChange = (nextSize: number) => {
    setSize(nextSize);
    ipcRenderer.send('setting-changed', { type: 'size', value: nextSize });
    emitToolbarState({ size: nextSize });
  };

  const handleTrailChange = (nextTrail: number) => {
    setTrail(nextTrail);
    ipcRenderer.send('setting-changed', { type: 'trail', value: nextTrail });
    emitToolbarState({ trail: nextTrail });
  };

  const handleTrailColorChange = (value: string) => {
    setTrailColor(value);
    ipcRenderer.send('setting-changed', { type: 'trailColor', value });
    emitToolbarState({ trailColor: value });
  };

  const handleAssistModeChange = (enabled: boolean) => {
    setAssistMode(enabled);
    ipcRenderer.send('setting-changed', { type: 'assistMode', value: enabled });
    emitToolbarState({ assistMode: enabled });
  };

  const handleCanvasCommand = (command: 'undo' | 'clear') => {
    ipcRenderer.send('canvas-command', command);
    setOpenPanel(null);
    emitToolbarState({
      ...getPanelFlags(null),
    });
  };

  const handleLaunchOnStartupChange = async (enabled: boolean) => {
    const result = (await ipcRenderer.invoke(
      'app-settings:update-launch-on-startup',
      enabled,
    )) as SettingsUpdateResult;

    if (result.ok && result.settings) {
      setAppSettings(result.settings);
      setShortcutDrafts(result.settings.shortcuts);
      setSettingsError('');
      return;
    }

    setSettingsError(result.message ?? '开机自动启动设置失败');
  };

  const handleShortcutChange = async (action: ShortcutAction, value: string) => {
    const normalized = normalizeShortcutInput(value);
    const nextShortcuts: ShortcutSettings = {
      ...shortcutDrafts,
      [action]: normalized,
    };

    setShortcutDrafts(nextShortcuts);

    if (!normalized) {
      setSettingsError('快捷键只支持 Alt + 单个字母或数字');
      return;
    }

    const validationErrors = validateShortcutSettings(nextShortcuts);
    if (validationErrors.length > 0) {
      setSettingsError(validationErrors[0]);
      return;
    }

    const result = (await ipcRenderer.invoke(
      'app-settings:update-shortcuts',
      nextShortcuts,
    )) as SettingsUpdateResult;

    if (result.ok && result.settings) {
      setAppSettings(result.settings);
      setShortcutDrafts(result.settings.shortcuts);
      setSettingsError('');
      return;
    }

    setSettingsError(result.message ?? '快捷键保存失败');
  };

  const handleQuitApp = () => {
    ipcRenderer.send('app:quit');
  };

  const handleToolClick = (tool: ToolbarInteractiveTool) => {
    const canToggleSubmenu = shouldShowToolSubmenu(tool);

    if (activeTool === tool && canToggleSubmenu) {
      const panelTool = tool as Extract<ToolbarInteractiveTool, 'pen' | 'eraser'>;
      const nextOpenPanel: ToolbarPanelTool = openPanel === panelTool ? null : panelTool;
      setOpenPanel(nextOpenPanel);
      emitToolbarState({
        activeTool: tool,
        ...getPanelFlags(nextOpenPanel),
      });
      return;
    }

    setActiveTool(tool);
    setOpenPanel(null);
    ipcRenderer.send('tool-changed', tool);
    emitToolbarState({
      activeTool: tool,
      ...getPanelFlags(null),
    });
  };

  const renderIcon = (toolId: string) => {
    switch (toolId) {
      case 'mouse':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"></path>
            <path d="M13 13l6 6"></path>
          </svg>
        );
      case 'pen':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            <path d="M2 2l7.586 7.586"></path>
            <circle cx="11" cy="11" r="2"></circle>
          </svg>
        );
      case 'eraser':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20"></path>
            <path d="M6 13l4 4"></path>
          </svg>
        );
      case 'undo':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
          </svg>
        );
      case 'clear':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        );
      case 'theme':
        return themeMode === 'dark' ? (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="M4.93 4.93l1.41 1.41"></path>
            <path d="M17.66 17.66l1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="M6.34 17.66l-1.41 1.41"></path>
            <path d="M19.07 4.93l-1.41 1.41"></path>
          </svg>
        );
      case 'text':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 6h14"></path>
            <path d="M12 6v12"></path>
            <path d="M8 18h8"></path>
            <path d="M17 10l2 2-2 2"></path>
          </svg>
        );
      case 'settings':
        return (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="13 17 18 12 13 7"></polyline>
            <polyline points="6 17 11 12 6 7"></polyline>
          </svg>
        );
    }
  };

  const handleUtilityAction = (toolId: string) => {
    if (toolId === 'undo') {
      handleCanvasCommand('undo');
      return;
    }

    if (toolId === 'clear') {
      handleCanvasCommand('clear');
      return;
    }

    if (toolId === 'theme') {
      const nextThemeMode = toggleThemeMode(themeMode);
      setThemeMode(nextThemeMode);
      emitToolbarState({ themeMode: nextThemeMode });
      return;
    }

    if (toolId === 'settings') {
      const nextOpenPanel = openPanel === 'settings' ? null : 'settings';
      setOpenPanel(nextOpenPanel);
      emitToolbarState({
        ...getPanelFlags(nextOpenPanel),
      });
      return;
    }

    if (toolId === 'collapse') {
      setExpanded(false);
      setOpenPanel(null);
      emitToolbarState({
        expanded: false,
        ...getPanelFlags(null),
      });
    }
  };

  if (isSettingsView) {
    return (
      <div className={`settings-window-shell theme-${themeMode}`}>
        {openPanel === 'settings' ? (
          <SystemSettingsPanel
            themeMode={themeMode}
            settings={appSettings}
            shortcutDrafts={shortcutDrafts}
            errorMessage={settingsError}
            onLaunchOnStartupChange={handleLaunchOnStartupChange}
            onShortcutChange={handleShortcutChange}
            onQuitApp={handleQuitApp}
            onMouseEnter={handleInteractiveEnter}
            onMouseLeave={handleInteractiveLeave}
          />
        ) : null}
        {openPanel !== 'settings' && shouldShowToolSubmenu(openPanel ?? 'mouse') && activeTool !== 'mouse' && activeTool !== 'text' ? (
          <SubmenuPanel
            activeTool={activeTool}
            themeMode={themeMode}
            color={color}
            rgbColor={rgbColor}
            size={size}
            trail={trail}
            trailColor={trailColor}
            assistMode={assistMode}
            standalone
            onColorChange={handleColorChange}
            onRgbChange={handleRgbChange}
            onSizeChange={handleSizeChange}
            onTrailChange={handleTrailChange}
            onTrailColorChange={handleTrailColorChange}
            onAssistModeChange={handleAssistModeChange}
            onClearAll={() => handleCanvasCommand('clear')}
            onMouseEnter={handleInteractiveEnter}
            onMouseLeave={handleInteractiveLeave}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={`widget-container theme-${themeMode} ${expanded ? 'expanded' : ''}`}>
      {!expanded ? (
        <div
          className="black-ball interactive-region"
          onClick={() => {
            setExpanded(true);
            emitToolbarState({
              expanded: true,
              ...getPanelFlags(null),
            });
          }}
          onMouseEnter={handleInteractiveEnter}
          onMouseLeave={handleInteractiveLeave}
          title="展开批注工具"
          style={{ width: floatingBallSize, height: floatingBallSize, cursor: interactiveCursor }}
        ></div>
      ) : (
        <div className="toolbar-shell">
          <div className="toolbar-wrapper toolbar-enter">
            <div
              className="toolbar-panel frosted-glass interactive-region"
              style={{ width: toolbarPanelWidth, cursor: interactiveCursor }}
              onMouseEnter={handleInteractiveEnter}
              onMouseLeave={handleInteractiveLeave}
            >
              <div className="tools-list">
                {getToolbarTools().map((tool) => {
                  const isToolButton =
                    tool.id === 'mouse' || tool.id === 'pen' || tool.id === 'eraser' || tool.id === 'text';
                  const isThemeButton = tool.id === 'theme';
                  const isSettingsButton = tool.id === 'settings';
                  const isActive =
                    (isToolButton && activeTool === tool.id) || (isSettingsButton && openPanel === 'settings');
                  const buttonTitle =
                    tool.id === 'theme'
                      ? `切换到${themeMode === 'dark' ? '浅色' : '深色'}模式`
                      : tool.label;

                  return (
                    <button
                      key={tool.id}
                      type="button"
                      className={`tool-btn ${isActive ? 'active' : ''} ${isThemeButton ? `theme-toggle ${themeMode}` : ''} ${!isToolButton ? 'action-btn' : ''}`}
                      title={buttonTitle}
                      style={{ cursor: interactiveCursor }}
                      onClick={() =>
                        isToolButton
                          ? handleToolClick(tool.id as ToolbarInteractiveTool)
                          : handleUtilityAction(tool.id)
                      }
                    >
                      {renderIcon(tool.id)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
