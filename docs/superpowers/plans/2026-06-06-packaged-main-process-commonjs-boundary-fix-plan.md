# Packaged Main Process CommonJS Boundary Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复安装版启动时 `ERR_REQUIRE_ESM`，确保 `dist-electron/` 内主进程依赖统一按 CommonJS 加载。

**Architecture:** 保持根项目继续使用 ESM，不碰前端构建；仅在 `build:electron` 阶段给 `dist-electron/` 写入局部 `package.json`，建立新的 CommonJS 包边界，让安装版主进程依赖文件不再落在根 `"type": "module"` 作用域内。

**Tech Stack:** TypeScript, Electron, PowerShell build script, Vitest, electron-builder

---

## 文件结构映射
- Modify: `package.json`
- Modify: `TestFile/unit/package-config.test.ts`
- Modify: `ProjectBasics/Basis.txt`
- Modify: `ProjectBasics/Function.txt`
- Modify: `ProjectBasics/Variable.txt`
- Modify: `Logs/Context.txt`
- Modify: `Logs/TestResults_20260606.txt`
- Create: `Logs/Fix_MainProcessCommonJsBoundary_20260606.txt`
