# 桌面批注工具 (Screen Annotator) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个基于 Electron 和 Canvas 的全屏透明桌面批注工具，包含悬浮工具栏和高级滑动轨迹画笔。

**Architecture:** 主进程（Main Process）管理两个渲染进程（Canvas Window 和 Toolbar Window）。使用 IPC 通信同步工具栏状态和画笔设置。Canvas Window 全屏且透明，通过 `setIgnoreMouseEvents` 控制事件穿透。

**Tech Stack:** Electron, React, TypeScript, HTML5 Canvas, Vite

---

## Task 1: 项目初始化与基础结构搭建

**Files:**
- Create: `ProjectBasics/Basis.txt`
- Create: `ProjectBasics/Variable.txt`
- Create: `ProjectBasics/Function.txt`
- Create: `Logs/Context.txt`

- [ ] **Step 1: 初始化 Vite + React + TypeScript 项目并集成 Electron**
由于从零开始，使用 Vite 创建项目，并安装 Electron 相关依赖。

```bash
npm create vite@latest . -- --template react-ts
npm install electron -D
npm install concurrently wait-on cross-env -D
npm install
```

- [ ] **Step 2: 创建项目基础规范文件**
遵循 User Rules，创建必需的文件夹和文件。

```bash
mkdir ProjectBasics
mkdir TestFile
mkdir -p TestFile/unit TestFile/integration TestFile/functional TestFile/mocks TestFile/fixtures
mkdir -p Logs/Alerts Logs/Solutions Logs/AntiPatterns Logs/Decisions Logs/Skills Logs/Improvement Logs/Releases Logs/Scheduler Logs/Security
```

写入 `ProjectBasics/Basis.txt`:
```text
Project Purpose: 桌面全屏批注工具
Architecture: Electron Main Process + React (Toolbar Renderer) + Canvas (Draw Renderer)
Tech Stack: Electron, React, TypeScript, Vite
```

写入 `ProjectBasics/Variable.txt`:
```text
(empty initially)
```

写入 `ProjectBasics/Function.txt`:
```text
(empty initially)
```

- [ ] **Step 3: 配置 Electron 主进程入口**
创建 `electron/main.ts`

```typescript
import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';

let canvasWindow: BrowserWindow | null = null;
let toolbarWindow: BrowserWindow | null = null;

function createWindow() {
  // TODO: Canvas Window
  // TODO: Toolbar Window
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

- [ ] **Step 4: 配置 Vite 和启动脚本**
更新 `package.json` 中的 scripts，确保能同时启动 Vite 和 Electron。

- [ ] **Step 5: 提交代码**
```bash
git init
git add .
git commit -m "chore: init project structure and electron base"
```

---

## Task 2: 创建全屏透明画布窗口 (Canvas Window)

**Files:**
- Modify: `electron/main.ts`
- Create: `src/canvas/CanvasApp.tsx`
- Create: `src/canvas/index.html`

- [ ] **Step 1: 在主进程中配置 Canvas Window**
在 `electron/main.ts` 中完成 Canvas 窗口的创建逻辑：全屏、透明、置顶、无边框。

```typescript
// electron/main.ts 中添加：
canvasWindow = new BrowserWindow({
  fullscreen: true,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  hasShadow: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  }
});
// 默认忽略鼠标事件（穿透）
canvasWindow.setIgnoreMouseEvents(true, { forward: true });
// 加载 Vite 本地服务 URL
canvasWindow.loadURL('http://localhost:5173/src/canvas/index.html');
```

- [ ] **Step 2: 创建基础 Canvas React 组件**
创建 `src/canvas/CanvasApp.tsx`，初始化一个铺满全屏的 Canvas。

```tsx
import React, { useRef, useEffect } from 'react';

export const CanvasApp: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ display: 'block', width: '100%', height: '100%' }} 
    />
  );
};
```

- [ ] **Step 3: 测试窗口透明度和穿透**
启动应用，验证全屏透明窗口是否创建，并且鼠标能正常点击底层的系统桌面或应用。

- [ ] **Step 4: 提交代码**
```bash
git add electron/main.ts src/canvas/
git commit -m "feat: create transparent fullscreen canvas window"
```

---

## Task 3: 创建悬浮控制栏窗口 (Toolbar Window)

**Files:**
- Modify: `electron/main.ts`
- Create: `src/toolbar/ToolbarApp.tsx`
- Create: `src/toolbar/index.html`
- Create: `src/toolbar/Toolbar.css`

- [ ] **Step 1: 在主进程中配置 Toolbar Window**
在 `electron/main.ts` 中完成 Toolbar 窗口的创建。

```typescript
// electron/main.ts 中添加：
toolbarWindow = new BrowserWindow({
  width: 100, // 初始为小黑球大小
  height: 100,
  x: 100, // 需要靠右计算，暂时固定
  y: 200,
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  }
});
toolbarWindow.loadURL('http://localhost:5173/src/toolbar/index.html');
```

- [ ] **Step 2: 创建基础 Toolbar React 组件（小黑球）**
创建 `src/toolbar/ToolbarApp.tsx` 和基础样式。

```tsx
import React, { useState } from 'react';
import './Toolbar.css';

export const ToolbarApp: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`widget-container ${expanded ? 'expanded' : ''}`}>
      {!expanded ? (
        <div className="black-ball" onClick={() => setExpanded(true)}></div>
      ) : (
        <div className="toolbar-panel frosted-glass">
          {/* Icons placeholder */}
          <button onClick={() => setExpanded(false)}>收起</button>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: 实现磨砂玻璃质感和动画样式**
在 `src/toolbar/Toolbar.css` 中添加 `.frosted-glass` (backdrop-filter) 和过渡动画。

- [ ] **Step 4: 测试 Toolbar 交互**
启动应用，验证小黑球悬停放大、点击展开磨砂面板的效果。

- [ ] **Step 5: 提交代码**
```bash
git add electron/main.ts src/toolbar/
git commit -m "feat: create floating toolbar window with frosted glass effect"
```

---

## Task 4: IPC 通信与状态同步 (穿透与绘制模式切换)

**Files:**
- Modify: `electron/main.ts`
- Modify: `src/toolbar/ToolbarApp.tsx`
- Modify: `src/canvas/CanvasApp.tsx`

- [ ] **Step 1: 建立 IPC 通道控制鼠标穿透**
在 `electron/main.ts` 中监听工具切换事件，控制 Canvas 窗口的穿透属性。

```typescript
// electron/main.ts
ipcMain.on('tool-changed', (event, tool) => {
  if (tool === 'mouse') {
    canvasWindow?.setIgnoreMouseEvents(true, { forward: true });
  } else {
    canvasWindow?.setIgnoreMouseEvents(false);
  }
  // 转发给 Canvas Window
  canvasWindow?.webContents.send('active-tool', tool);
});
```

- [ ] **Step 2: Toolbar 触发工具切换**
在 `ToolbarApp.tsx` 中添加“鼠标”和“笔”按钮，并发送 IPC 消息。

```typescript
const selectTool = (tool: string) => {
  const { ipcRenderer } = window.require('electron');
  ipcRenderer.send('tool-changed', tool);
};
```

- [ ] **Step 3: 测试穿透切换**
点击“笔”后，鼠标应该被 Canvas 捕获（无法点击底层）；点击“鼠标”后，恢复穿透。

- [ ] **Step 4: 提交代码**
```bash
git add .
git commit -m "feat: implement IPC tool switching and mouse event ignore logic"
```

---

## Task 5: 二级设置面板 (侧边滑出水波动画)

**Files:**
- Modify: `src/toolbar/ToolbarApp.tsx`
- Create: `src/toolbar/SubmenuPanel.tsx`

- [ ] **Step 1: 创建 Submenu 组件**
创建 `src/toolbar/SubmenuPanel.tsx`，包含颜色、粗细、轨迹设置。

```tsx
export const SubmenuPanel = ({ activeTool }) => {
  return (
    <div className="submenu-panel side-popout ripple-effect">
      <h4>{activeTool} Settings</h4>
      {/* color, size, trail inputs */}
    </div>
  );
};
```

- [ ] **Step 2: 在 Toolbar 中集成并处理二次点击逻辑**
当点击已高亮的工具时，触发 Submenu 展开。

```tsx
const [activeTool, setActiveTool] = useState('mouse');
const [showSubmenu, setShowSubmenu] = useState(false);

const handleToolClick = (tool) => {
  if (activeTool === tool) {
    setShowSubmenu(!showSubmenu);
  } else {
    setActiveTool(tool);
    setShowSubmenu(false);
    selectTool(tool);
  }
};
```

- [ ] **Step 3: 实现 CSS 动画**
在 CSS 中实现 `side-popout` 平移展开和 `ripple-effect` 0.3s 水波动画。

- [ ] **Step 4: 提交代码**
```bash
git add .
git commit -m "feat: add side popout submenu with ripple animation"
```

---

## Task 6: 核心画笔与高级拖尾轨迹实现 (Canvas)

**Files:**
- Modify: `src/canvas/CanvasApp.tsx`

- [ ] **Step 1: 基础 Canvas 涂鸦事件**
监听 `mousedown`, `mousemove`, `mouseup`，记录鼠标路径。

- [ ] **Step 2: 贝塞尔平滑与绘制循环**
使用 `requestAnimationFrame` 驱动渲染循环。实现 Quadratic Bezier 曲线平滑连接路径点。

- [ ] **Step 3: 高级拖尾/轨迹动画效果**
根据传入的“轨迹长度”参数。如果是 0，则为普通画笔（静态线条）。如果是 > 0，则在渲染循环中动态衰减较老的路径点，或使用带有 `globalAlpha` 衰减的半透明清除层（如 `ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(...)` 产生残影效果）。
由于是透明背景应用，传统的半透明黑底覆盖会破坏透明度，所以需要：**保存带有时间戳的路径点，在每帧只绘制当前时间向前 N 毫秒内的路径，超过轨迹长度的点不绘制。**

- [ ] **Step 4: 测试画笔与拖尾**
切换到笔，绘制，观察平滑度与拖尾渐隐效果。

- [ ] **Step 5: 提交代码**
```bash
git add src/canvas/
git commit -m "feat: implement smooth canvas drawing with dynamic trail effect"
```

---

## Task 7: 橡皮擦、撤回与清屏功能

**Files:**
- Modify: `src/canvas/CanvasApp.tsx`
- Modify: `src/toolbar/ToolbarApp.tsx`

- [ ] **Step 1: 实现清屏 (Clear)**
接收 IPC `clear-canvas` 消息，调用 `ctx.clearRect(0, 0, width, height)`，并清空历史路径数组。

- [ ] **Step 2: 实现橡皮擦 (Eraser)**
橡皮擦在 Canvas 上的经典实现是设置 `globalCompositeOperation = 'destination-out'` 然后进行绘制。切换回画笔时恢复为 `source-over`。

- [ ] **Step 3: 实现撤回 (Undo)**
维护一个 `history` 数组，每次 `mouseup` 时保存当前的动作对象或 imageData。撤回时 pop 出最后一步，并重绘画布。

- [ ] **Step 4: 提交代码**
```bash
git add .
git commit -m "feat: implement clear, eraser and undo functionality"
```

---

## Task 8: 自动化测试与规范检查

**Files:**
- Create: `TestFile/unit/test_canvas_logic.js` (Jest/Vitest)
- Create: `Logs/TestResults_XXXX.txt`

- [ ] **Step 1: 编写 Canvas 数据结构单元测试**
测试路径点添加、历史记录 push/pop (Undo) 逻辑是否正确。

- [ ] **Step 2: 运行 Linter 与 Tests**
执行静态检查和单元测试。

- [ ] **Step 3: 完善 ProjectBasics 和 Logs**
更新 `Variable.txt` 和 `Function.txt`，生成本次迭代的 `Logs/Feature_XXX.txt`。

- [ ] **Step 4: 提交代码**
```bash
git add .
git commit -m "test: add unit tests and update documentation"
```