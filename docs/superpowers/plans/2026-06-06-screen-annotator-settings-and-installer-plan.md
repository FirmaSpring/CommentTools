# Screen Annotator Settings And Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为桌面批注工具补齐 `settings` 按钮、系统设置面板、快捷键配置、Windows 自启动和 NSIS 安装器。

**Architecture:** 继续沿用 `toolbarWindow + settingsWindow + canvasWindow` 三窗口结构，在主进程新增配置持久化、快捷键注册和注册表自启动服务，在工具栏渲染层新增系统设置面板。快捷键与自启动逻辑尽量下沉为纯函数模块，先用单元测试锁住默认值、校验和命令生成，再接入主进程 IPC。

**Tech Stack:** Electron, React, TypeScript, Vitest, electron-builder, NSIS

---

## 文件结构映射
- Modify: `src/toolbar/toolbarModel.ts`
- Modify: `src/toolbar/toolbarSettings.ts`
- Modify: `src/toolbar/ToolbarApp.tsx`
- Modify: `src/toolbar/Toolbar.css`
- Create: `src/toolbar/SystemSettingsPanel.tsx`
- Create: `src/electron/appSettings.ts`
- Create: `src/electron/autoLaunch.ts`
- Modify: `electron/main.ts`
- Modify: `package.json`
- Test: `TestFile/unit/toolbar-model.test.ts`
- Test: `TestFile/unit/toolbar-settings.test.ts`
- Create: `TestFile/unit/app-settings.test.ts`
- Create: `TestFile/unit/auto-launch.test.ts`
- Modify: `TestFile/unit/package-config.test.ts`
- Modify: `ProjectBasics/Basis.txt`
- Modify: `ProjectBasics/Function.txt`
- Modify: `ProjectBasics/Variable.txt`
- Modify: `Logs/Context.txt`
- Create: `Logs/Feature_SettingsAndInstaller_20260606.txt`
- Modify: `Logs/TaskQueue.txt`

## 实施顺序
1. 先补红测，锁住工具顺序、默认快捷键、快捷键校验和安装器配置。
2. 再实现纯逻辑模块 `appSettings` 和 `autoLaunch`。
3. 接入工具栏 `settings` 按钮和系统设置面板。
4. 接入主进程配置持久化、动态快捷键和注册表自启动。
5. 最后接入 `electron-builder` 并跑测试、构建、诊断与日志更新。
