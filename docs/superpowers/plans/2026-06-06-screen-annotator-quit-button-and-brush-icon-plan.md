# Screen Annotator Quit Button And Brush Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为系统设置面板新增退出程序按钮，并为应用和安装器接入画笔图标资源。

**Architecture:** 继续沿用当前 `SystemSettingsPanel -> IPC -> electron/main.ts` 的结构，在渲染层新增退出按钮回调，在主进程新增 `app:quit` 事件处理。图标资源使用本地静态文件，统一接入 Electron 窗口配置和 `electron-builder` 打包配置，避免开发态与安装态图标分叉。

**Tech Stack:** Electron, React, TypeScript, Vitest, SVG, electron-builder

---

## 文件结构映射
- Modify: `src/toolbar/SystemSettingsPanel.tsx`
- Modify: `src/toolbar/ToolbarApp.tsx`
- Modify: `src/toolbar/Toolbar.css`
- Modify: `electron/main.ts`
- Modify: `package.json`
- Create: `assets/icons/brush-app-icon.svg`
- Create: `assets/icons/brush-app-icon.ico`
- Create: `TestFile/unit/system-settings-panel.test.tsx`
- Modify: `TestFile/unit/package-config.test.ts`
- Modify: `TestFile/unit/emergency-shortcuts.test.ts`
- Modify: `ProjectBasics/Function.txt`
- Modify: `ProjectBasics/Variable.txt`
- Modify: `Logs/Context.txt`
- Modify: `Logs/TestResults_20260606.txt`

## 实施顺序
1. 先写失败测试，锁住“退出程序”按钮、主进程退出 IPC、图标路径配置。
2. 再实现设置面板按钮和主进程退出逻辑。
3. 再补画笔 SVG/ICO 资源并接到打包配置。
4. 最后跑 `test/lint/build/dist:win` 并更新文档日志。
