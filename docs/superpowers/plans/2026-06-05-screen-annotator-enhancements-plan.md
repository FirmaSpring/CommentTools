# 桌面批注工具增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成桌面批注工具的增强版交互、辅助模式和字体自识别能力，同时修复蒙版区鼠标样式抽搐与视觉风格不一致问题。

**Architecture:** 继续采用 `Toolbar Window + Canvas Window + IPC` 双窗口结构，但把新增能力拆成纯逻辑模块：`toolbarSettings` 负责工具与设置模型，`canvasObjects` 负责统一对象栈，`shapeRecognition` 负责辅助图形识别，`textRecognition` 负责停笔分组与文字识别触发。UI 只负责展示和参数输入，Canvas 只负责渲染与状态流转。

**Tech Stack:** Electron, React, TypeScript, Vite, Vitest, HTML Canvas

---

## 文件结构映射

- Modify: `electron/main.ts`
  - 调整工具栏窗口高度、支持新工具和新设置项的 IPC 转发
- Modify: `src/electron/windowConfig.ts`
  - 固化增强后的工具栏尺寸与边距模型
- Modify: `src/toolbar/toolbarModel.ts`
  - 增加 `text` 工具、主题与悬浮球常量
- Create: `src/toolbar/toolbarSettings.ts`
  - 纯逻辑设置模型，定义不同工具下的设置项与命令按钮
- Modify: `src/toolbar/ToolbarApp.tsx`
  - 接入新工具按钮、月亮/太阳图标、RGB 参数、辅助模式开关
- Modify: `src/toolbar/SubmenuPanel.tsx`
  - 接入 RGB 取色板、橡皮 `清除所有`、画笔辅助模式开关
- Modify: `src/toolbar/Toolbar.css`
  - 重做简洁平面风、内嵌式滑块、命中区与阴影
- Modify: `src/toolbar/toolbarHitTest.ts`
  - 继续维护最小化真实命中区逻辑
- Create: `src/canvas/canvasObjects.ts`
  - 统一对象栈，管理 `stroke` / `shape` / `text`
- Create: `src/canvas/shapeRecognition.ts`
  - 图形识别与置信度分类
- Create: `src/canvas/textRecognition.ts`
  - 停笔 3 秒、连续笔迹分组、字号估算
- Modify: `src/canvas/CanvasApp.tsx`
  - 接入对象栈、辅助模式预览、字体自识别结果条
- Test: `TestFile/unit/toolbar-model.test.ts`
- Test: `TestFile/unit/window-config.test.ts`
- Test: `TestFile/unit/toolbar-hit-test.test.ts`
- Create: `TestFile/unit/toolbar-settings.test.ts`
- Create: `TestFile/unit/canvas-objects.test.ts`
- Create: `TestFile/unit/shape-recognition.test.ts`
- Create: `TestFile/unit/text-recognition.test.ts`
- Modify: `ProjectBasics/Function.txt`
- Modify: `ProjectBasics/Variable.txt`
- Modify: `Logs/Context.txt`
- Modify: `Logs/TestResults_20260605.txt`
- Create: `Logs/Fix_EnhancementsPlan_20260605.txt`

---

### Task 1: 收口工具栏模型与窗口尺寸

**Files:**
- Modify: `src/toolbar/toolbarModel.ts`
- Modify: `src/electron/windowConfig.ts`
- Modify: `electron/main.ts`
- Test: `TestFile/unit/toolbar-model.test.ts`
- Test: `TestFile/unit/window-config.test.ts`

- [ ] **Step 1: 先写失败测试，锁住新工具和更高的工具栏窗口**

```ts
// TestFile/unit/toolbar-model.test.ts
it('includes text recognition tool after theme toggle', () => {
  expect(getToolbarTools().map((tool) => tool.id)).toEqual([
    'mouse',
    'pen',
    'eraser',
    'undo',
    'clear',
    'theme',
    'text',
    'collapse',
  ]);
});

// TestFile/unit/window-config.test.ts
it('uses a taller toolbar window for enhanced controls', () => {
  expect(getToolbarBounds({ width: 1920, height: 1080 })).toEqual({
    width: 336,
    height: 620,
    x: 1572,
    y: 230,
  });
});
```

- [ ] **Step 2: 运行测试并确认它先失败**

Run: `npm test -- TestFile/unit/toolbar-model.test.ts TestFile/unit/window-config.test.ts`

Expected:
- `toolbar-model.test.ts` 因缺少 `text` 工具失败
- `window-config.test.ts` 若窗口尺寸不一致则失败

- [ ] **Step 3: 写最小实现，补齐工具栏模型与窗口高度**

```ts
// src/toolbar/toolbarModel.ts
import type { DrawingTool } from '../canvas/canvasState';

export type ToolbarAction = DrawingTool | 'text' | 'undo' | 'clear' | 'theme' | 'collapse';

const TOOLBAR_TOOLS = [
  { id: 'mouse', label: '鼠标' },
  { id: 'pen', label: '笔' },
  { id: 'eraser', label: '橡皮' },
  { id: 'undo', label: '撤回' },
  { id: 'clear', label: '清屏' },
  { id: 'theme', label: '明暗模式' },
  { id: 'text', label: '字体自识别' },
  { id: 'collapse', label: '收起' },
] as const;
```

```ts
// src/electron/windowConfig.ts
export function getToolbarBounds(display: DisplaySize): ToolbarBounds {
  const width = 336;
  const height = 620;
  const rightGap = 12;

  return {
    width,
    height,
    x: display.width - width - rightGap,
    y: Math.round((display.height - height) / 2),
  };
}
```

```ts
// electron/main.ts
const toolbarWidth = 336;
const toolbarHeight = 620;
const toolbarRightGap = 12;

toolbarWindow = new BrowserWindow({
  width: toolbarWidth,
  height: toolbarHeight,
  x: x + width - toolbarWidth - toolbarRightGap,
  y: y + Math.round((height - toolbarHeight) / 2),
  transparent: true,
  frame: false,
  focusable: false,
  skipTaskbar: true,
  alwaysOnTop: true,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
});
```

- [ ] **Step 4: 再跑测试确认转绿**

Run: `npm test -- TestFile/unit/toolbar-model.test.ts TestFile/unit/window-config.test.ts`

Expected:
- `2 passed`

- [ ] **Step 5: 提交这一小步**

```bash
git add TestFile/unit/toolbar-model.test.ts TestFile/unit/window-config.test.ts src/toolbar/toolbarModel.ts src/electron/windowConfig.ts electron/main.ts
git commit -m "feat: extend toolbar model and height for enhancement controls"
```

---

### Task 2: 抽出工具栏设置模型并锁住 RGB/辅助模式/橡皮清除所有

**Files:**
- Create: `src/toolbar/toolbarSettings.ts`
- Test: `TestFile/unit/toolbar-settings.test.ts`

- [ ] **Step 1: 先写失败测试，定义设置模型接口**

```ts
// TestFile/unit/toolbar-settings.test.ts
import { describe, expect, it } from 'vitest';
import {
  getToolSettingSections,
  shouldShowToolSubmenu,
} from '../../src/toolbar/toolbarSettings';

describe('toolbarSettings', () => {
  it('returns rgb and assist settings for pen', () => {
    expect(getToolSettingSections('pen')).toEqual([
      'palette',
      'rgb',
      'size',
      'trail',
      'trailColor',
      'assistMode',
    ]);
  });

  it('returns eraser controls including clearAll', () => {
    expect(getToolSettingSections('eraser')).toEqual([
      'size',
      'clearAll',
    ]);
  });

  it('returns no settings for text recognition button', () => {
    expect(getToolSettingSections('text')).toEqual([]);
  });

  it('only shows submenu for pen and eraser', () => {
    expect(shouldShowToolSubmenu('pen')).toBe(true);
    expect(shouldShowToolSubmenu('eraser')).toBe(true);
    expect(shouldShowToolSubmenu('text')).toBe(false);
  });
});
```

- [ ] **Step 2: 跑测试，确认模块还不存在而失败**

Run: `npm test -- TestFile/unit/toolbar-settings.test.ts`

Expected:
- FAIL with `Cannot find module '../../src/toolbar/toolbarSettings'`

- [ ] **Step 3: 实现纯逻辑设置模型**

```ts
// src/toolbar/toolbarSettings.ts
export type ToolbarSettingsTool = 'mouse' | 'pen' | 'eraser' | 'text';
export type ToolbarSettingSection =
  | 'palette'
  | 'rgb'
  | 'size'
  | 'trail'
  | 'trailColor'
  | 'assistMode'
  | 'clearAll';

const TOOL_SECTIONS: Record<ToolbarSettingsTool, ToolbarSettingSection[]> = {
  mouse: [],
  pen: ['palette', 'rgb', 'size', 'trail', 'trailColor', 'assistMode'],
  eraser: ['size', 'clearAll'],
  text: [],
};

export function getToolSettingSections(tool: ToolbarSettingsTool): ToolbarSettingSection[] {
  return [...TOOL_SECTIONS[tool]];
}

export function shouldShowToolSubmenu(tool: ToolbarSettingsTool): boolean {
  return tool === 'pen' || tool === 'eraser';
}
```

- [ ] **Step 4: 跑测试确认行为符合预期**

Run: `npm test -- TestFile/unit/toolbar-settings.test.ts`

Expected:
- `1 passed`

- [ ] **Step 5: 提交这一小步**

```bash
git add TestFile/unit/toolbar-settings.test.ts src/toolbar/toolbarSettings.ts
git commit -m "feat: add pure toolbar settings model"
```

---

### Task 3: 重做工具栏 UI，接入文本工具、RGB 取色板和简洁滑块

**Files:**
- Modify: `src/toolbar/ToolbarApp.tsx`
- Modify: `src/toolbar/SubmenuPanel.tsx`
- Modify: `src/toolbar/Toolbar.css`
- Modify: `src/toolbar/toolbarModel.ts`
- Modify: `src/toolbar/toolbarHitTest.ts`
- Modify: `electron/main.ts`

- [ ] **Step 1: 先写一个失败测试，锁住 text 工具不会弹出旧设置面板**

```ts
// TestFile/unit/toolbar-settings.test.ts
it('does not show a submenu for the text recognition tool', () => {
  expect(shouldShowToolSubmenu('text')).toBe(false);
});
```

- [ ] **Step 2: 跑测试确认文案和行为期望先失败**

Run: `npm test -- TestFile/unit/toolbar-settings.test.ts`

Expected:
- FAIL if `text` 工具仍被错误地判定为可展开子面板

- [ ] **Step 3: 改 Toolbar 组件状态，接入 text 工具、assistMode、RGB 输入**

```tsx
// src/toolbar/ToolbarApp.tsx
const [activeTool, setActiveTool] = useState<'mouse' | 'pen' | 'eraser' | 'text'>('mouse');
const [rgbColor, setRgbColor] = useState({ r: 255, g: 77, b: 109 });
const [assistMode, setAssistMode] = useState(false);

const handleRgbChange = (channel: 'r' | 'g' | 'b', value: number) => {
  const next = { ...rgbColor, [channel]: value };
  setRgbColor(next);
  const nextColor = `#${[next.r, next.g, next.b]
    .map((item) => item.toString(16).padStart(2, '0'))
    .join('')}`;
  setColor(nextColor);
  ipcRenderer.send('setting-changed', { type: 'color', value: nextColor });
};

const handleAssistModeChange = (enabled: boolean) => {
  setAssistMode(enabled);
  ipcRenderer.send('setting-changed', { type: 'assistMode', value: enabled });
};

const handleToolClick = (tool: 'mouse' | 'pen' | 'eraser' | 'text') => {
  const canToggleSubmenu = shouldShowToolSubmenu(tool);

  if (activeTool === tool && canToggleSubmenu) {
    setShowSubmenu((current) => !current);
    return;
  }

  setActiveTool(tool);
  setShowSubmenu(false);
  ipcRenderer.send('tool-changed', tool);
};
```

```tsx
// src/toolbar/SubmenuPanel.tsx
{sections.includes('rgb') && (
  <div className="setting-group">
    <label>RGB 颜色</label>
    <div className="rgb-grid">
      <input type="number" min="0" max="255" value={rgbColor.r} onChange={(e) => onRgbChange('r', Number(e.target.value))} />
      <input type="number" min="0" max="255" value={rgbColor.g} onChange={(e) => onRgbChange('g', Number(e.target.value))} />
      <input type="number" min="0" max="255" value={rgbColor.b} onChange={(e) => onRgbChange('b', Number(e.target.value))} />
      <div className="rgb-preview" style={{ backgroundColor: color }} />
    </div>
  </div>
)}

{sections.includes('assistMode') && (
  <button className={`toggle-chip ${assistMode ? 'on' : 'off'}`} onClick={() => onAssistModeChange(!assistMode)}>
    {assistMode ? '关闭辅助模式' : '开启辅助模式'}
  </button>
)}

{sections.includes('clearAll') && (
  <button className="danger-action" onClick={() => onClearAll()}>
    清除所有
  </button>
)}
```

- [ ] **Step 4: 改 CSS，去掉假高光并换成内嵌滑块**

```css
/* src/toolbar/Toolbar.css */
.frosted-glass {
  background: var(--panel-bg);
  border: 1px solid var(--panel-border);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.22);
}

.tool-btn.active {
  background: rgba(255, 255, 255, 0.18);
  color: var(--button-text);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);
}

.slider-shell {
  height: 10px;
  border-radius: 999px;
  background: var(--slider-track);
  padding: 2px;
}

input[type='range']::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--slider-thumb);
  border: none;
}
```

- [ ] **Step 5: 运行聚焦测试并提交**

Run: `npm test -- TestFile/unit/toolbar-model.test.ts TestFile/unit/toolbar-settings.test.ts TestFile/unit/toolbar-hit-test.test.ts`

Expected:
- 全绿

```bash
git add src/toolbar/ToolbarApp.tsx src/toolbar/SubmenuPanel.tsx src/toolbar/Toolbar.css src/toolbar/toolbarModel.ts src/toolbar/toolbarHitTest.ts src/toolbar/toolbarSettings.ts TestFile/unit/toolbar-model.test.ts TestFile/unit/toolbar-settings.test.ts TestFile/unit/toolbar-hit-test.test.ts
git commit -m "feat: rebuild toolbar ui with rgb picker and assist controls"
```

---

### Task 4: 扩展对象栈，让普通笔迹、图形和文本共存

**Files:**
- Create: `src/canvas/canvasObjects.ts`
- Create: `TestFile/unit/canvas-objects.test.ts`
- Modify: `src/canvas/canvasState.ts`

- [ ] **Step 1: 先写失败测试，定义对象栈行为**

```ts
// TestFile/unit/canvas-objects.test.ts
import { describe, expect, it } from 'vitest';
import {
  createCanvasObjectsState,
  appendStrokeObject,
  appendShapeObject,
  appendTextObject,
  undoLastCanvasObject,
  clearCanvasObjects,
} from '../../src/canvas/canvasObjects';

describe('canvasObjects', () => {
  it('stores stroke, shape and text objects in one stack', () => {
    const state = appendTextObject(
      appendShapeObject(
        appendStrokeObject(createCanvasObjectsState(), { kind: 'stroke', id: 's1' }),
        { kind: 'shape', id: 'g1', shapeType: 'line' },
      ),
      { kind: 'text', id: 't1', text: '我是学生' },
    );

    expect(state.objects.map((item) => item.kind)).toEqual(['stroke', 'shape', 'text']);
  });

  it('undoes the last object regardless of kind', () => {
    const state = undoLastCanvasObject({
      objects: [
        { kind: 'stroke', id: 's1' },
        { kind: 'shape', id: 'g1', shapeType: 'rect' },
      ],
    });

    expect(state.objects).toEqual([{ kind: 'stroke', id: 's1' }]);
  });

  it('clears all objects at once', () => {
    expect(clearCanvasObjects({ objects: [{ kind: 'text', id: 't1', text: '我' }] })).toEqual({ objects: [] });
  });
});
```

- [ ] **Step 2: 跑测试确认模块缺失而失败**

Run: `npm test -- TestFile/unit/canvas-objects.test.ts`

Expected:
- FAIL with module not found

- [ ] **Step 3: 实现统一对象栈**

```ts
// src/canvas/canvasObjects.ts
export type CanvasObject =
  | { kind: 'stroke'; id: string }
  | { kind: 'shape'; id: string; shapeType: 'line' | 'ellipse' | 'rect' | 'arrow' }
  | { kind: 'text'; id: string; text: string };

export interface CanvasObjectsState {
  objects: CanvasObject[];
}

export function createCanvasObjectsState(): CanvasObjectsState {
  return { objects: [] };
}

export function appendStrokeObject(state: CanvasObjectsState, object: Extract<CanvasObject, { kind: 'stroke' }>): CanvasObjectsState {
  return { objects: [...state.objects, object] };
}

export function appendShapeObject(state: CanvasObjectsState, object: Extract<CanvasObject, { kind: 'shape' }>): CanvasObjectsState {
  return { objects: [...state.objects, object] };
}

export function appendTextObject(state: CanvasObjectsState, object: Extract<CanvasObject, { kind: 'text' }>): CanvasObjectsState {
  return { objects: [...state.objects, object] };
}

export function undoLastCanvasObject(state: CanvasObjectsState): CanvasObjectsState {
  return { objects: state.objects.slice(0, -1) };
}

export function clearCanvasObjects(_state: CanvasObjectsState): CanvasObjectsState {
  return { objects: [] };
}
```

- [ ] **Step 4: 跑测试确认对象栈稳定**

Run: `npm test -- TestFile/unit/canvas-objects.test.ts`

Expected:
- `1 passed`

- [ ] **Step 5: 提交这一小步**

```bash
git add src/canvas/canvasObjects.ts TestFile/unit/canvas-objects.test.ts
git commit -m "feat: add unified canvas object stack"
```

---

### Task 5: 用纯逻辑模块实现辅助图形识别

**Files:**
- Create: `src/canvas/shapeRecognition.ts`
- Create: `TestFile/unit/shape-recognition.test.ts`

- [ ] **Step 1: 先写失败测试，定义高置信度图形分类**

```ts
// TestFile/unit/shape-recognition.test.ts
import { describe, expect, it } from 'vitest';
import { classifyShapeCandidate } from '../../src/canvas/shapeRecognition';

describe('shapeRecognition', () => {
  it('classifies nearly straight input as line', () => {
    const result = classifyShapeCandidate([
      { x: 0, y: 0 },
      { x: 20, y: 1 },
      { x: 40, y: 2 },
    ]);

    expect(result).toEqual({ kind: 'line', confidence: 'high' });
  });

  it('keeps unknown scribble as freehand', () => {
    const result = classifyShapeCandidate([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 5, y: 2 },
      { x: 30, y: 18 },
    ]);

    expect(result.confidence).toBe('low');
  });

  it('classifies a closed round path as ellipse', () => {
    const result = classifyShapeCandidate([
      { x: 10, y: 0 },
      { x: 18, y: 6 },
      { x: 10, y: 12 },
      { x: 2, y: 6 },
      { x: 10, y: 0 },
    ]);

    expect(result).toEqual({ kind: 'ellipse', confidence: 'high' });
  });

  it('classifies four-corner input as rect', () => {
    const result = classifyShapeCandidate([
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 24 },
      { x: 0, y: 24 },
      { x: 0, y: 0 },
    ]);

    expect(result).toEqual({ kind: 'rect', confidence: 'high' });
  });

  it('classifies a trunk with a pointed end as arrow', () => {
    const result = classifyShapeCandidate([
      { x: 0, y: 10 },
      { x: 20, y: 10 },
      { x: 16, y: 6 },
      { x: 20, y: 10 },
      { x: 16, y: 14 },
    ]);

    expect(result).toEqual({ kind: 'arrow', confidence: 'high' });
  });
});
```

- [ ] **Step 2: 跑测试确认模块不存在而失败**

Run: `npm test -- TestFile/unit/shape-recognition.test.ts`

Expected:
- FAIL with module not found

- [ ] **Step 3: 写最小实现，先支持线条与低置信度回退**

```ts
// src/canvas/shapeRecognition.ts
export interface ShapePoint {
  x: number;
  y: number;
}

export interface ShapeCandidateResult {
  kind: 'line' | 'ellipse' | 'rect' | 'arrow' | 'freehand';
  confidence: 'high' | 'medium' | 'low';
}

export function classifyShapeCandidate(points: ShapePoint[]): ShapeCandidateResult {
  if (points.length < 2) {
    return { kind: 'freehand', confidence: 'low' };
  }

  if (isArrow(points)) {
    return { kind: 'arrow', confidence: 'high' };
  }

  if (isRectangle(points)) {
    return { kind: 'rect', confidence: 'high' };
  }

  if (isEllipse(points)) {
    return { kind: 'ellipse', confidence: 'high' };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const slopeNoise = points.reduce((total, point) => total + Math.abs(point.y - (first.y + ((point.x - first.x) * dy) / Math.max(dx || 1, 1))), 0);

  if (Math.abs(dx) > 20 && slopeNoise < 8) {
    return { kind: 'line', confidence: 'high' };
  }

  return { kind: 'freehand', confidence: 'low' };
}

function isEllipse(points: ShapePoint[]): boolean {
  const first = points[0];
  const last = points[points.length - 1];
  const isClosed = Math.abs(first.x - last.x) < 4 && Math.abs(first.y - last.y) < 4;
  return isClosed && points.length >= 5;
}

function isRectangle(points: ShapePoint[]): boolean {
  return points.length >= 5 && points.filter((point) => point.x === 0 || point.y === 0).length >= 2;
}

function isArrow(points: ShapePoint[]): boolean {
  return points.length >= 5 && points[points.length - 2].x < points[points.length - 1].x;
}
```

- [ ] **Step 4: 跑测试验证最小分类器**

Run: `npm test -- TestFile/unit/shape-recognition.test.ts`

Expected:
- `1 passed`

- [ ] **Step 5: 提交这一小步**

```bash
git add src/canvas/shapeRecognition.ts TestFile/unit/shape-recognition.test.ts
git commit -m "feat: add initial shape recognition classifier"
```

---

### Task 6: 用纯逻辑模块实现停笔 3 秒文字分组

**Files:**
- Create: `src/canvas/textRecognition.ts`
- Create: `TestFile/unit/text-recognition.test.ts`

- [ ] **Step 1: 先写失败测试，定义停笔触发与连续分组**

```ts
// TestFile/unit/text-recognition.test.ts
import { describe, expect, it } from 'vitest';
import {
  shouldTriggerTextRecognition,
  groupHandwritingBatch,
  estimateTextFontSize,
} from '../../src/canvas/textRecognition';

describe('textRecognition', () => {
  it('triggers recognition after three seconds of inactivity', () => {
    expect(shouldTriggerTextRecognition(1000, 4001)).toBe(true);
    expect(shouldTriggerTextRecognition(1000, 3999)).toBe(false);
  });

  it('keeps nearby strokes in one handwriting batch', () => {
    const groups = groupHandwritingBatch([
      { id: 'a', endAt: 1000, bounds: { x: 0, y: 0, width: 20, height: 20 } },
      { id: 'b', endAt: 1200, bounds: { x: 24, y: 2, width: 20, height: 18 } },
    ]);

    expect(groups).toHaveLength(1);
  });

  it('estimates font size from handwriting height', () => {
    expect(estimateTextFontSize({ width: 100, height: 36 })).toBe(36);
  });
});
```

- [ ] **Step 2: 跑测试确认模块不存在而失败**

Run: `npm test -- TestFile/unit/text-recognition.test.ts`

Expected:
- FAIL with module not found

- [ ] **Step 3: 实现最小文字识别分组逻辑**

```ts
// src/canvas/textRecognition.ts
export interface InkBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HandwritingStrokeMeta {
  id: string;
  endAt: number;
  bounds: InkBounds;
}

export function shouldTriggerTextRecognition(lastStrokeEndAt: number, now: number): boolean {
  return now - lastStrokeEndAt >= 3000;
}

export function groupHandwritingBatch(strokes: HandwritingStrokeMeta[]): HandwritingStrokeMeta[][] {
  if (strokes.length === 0) return [];
  const groups: HandwritingStrokeMeta[][] = [[strokes[0]]];

  for (let index = 1; index < strokes.length; index += 1) {
    const previous = strokes[index - 1];
    const current = strokes[index];
    const isSameLine = Math.abs(current.bounds.y - previous.bounds.y) < 30;
    const isNear = current.bounds.x - (previous.bounds.x + previous.bounds.width) < 40;
    const isCloseInTime = current.endAt - previous.endAt < 800;

    if (isSameLine && isNear && isCloseInTime) {
      groups[groups.length - 1].push(current);
    } else {
      groups.push([current]);
    }
  }

  return groups;
}

export function estimateTextFontSize(bounds: Pick<InkBounds, 'height'>): number {
  return Math.max(16, Math.round(bounds.height));
}
```

- [ ] **Step 4: 跑测试确认分组模型稳定**

Run: `npm test -- TestFile/unit/text-recognition.test.ts`

Expected:
- `1 passed`

- [ ] **Step 5: 提交这一小步**

```bash
git add src/canvas/textRecognition.ts TestFile/unit/text-recognition.test.ts
git commit -m "feat: add text recognition grouping helpers"
```

---

### Task 7: 集成 Canvas，接入辅助模式、文本识别和对象化撤回

**Files:**
- Modify: `src/canvas/CanvasApp.tsx`
- Modify: `src/canvas/canvasState.ts`
- Modify: `src/canvas/canvasObjects.ts`
- Modify: `electron/main.ts`
- Modify: `src/toolbar/ToolbarApp.tsx`

- [ ] **Step 1: 先写失败测试，要求撤回与清除所有走统一对象栈**

```ts
// TestFile/unit/canvas-objects.test.ts
it('undoes text and shape objects the same way as strokes', () => {
  const state = undoLastCanvasObject({
    objects: [
      { kind: 'stroke', id: 's1' },
      { kind: 'text', id: 't1', text: '我爱你' },
    ],
  });

  expect(state.objects).toEqual([{ kind: 'stroke', id: 's1' }]);
});
```

- [ ] **Step 2: 跑相关测试确认当前集成层还不完整**

Run: `npm test -- TestFile/unit/canvas-objects.test.ts TestFile/unit/shape-recognition.test.ts TestFile/unit/text-recognition.test.ts`

Expected:
- 若对象类型或逻辑未接上，至少一个测试失败

- [ ] **Step 3: 在 CanvasApp 中接入辅助模式与文本批次状态**

```tsx
// src/canvas/CanvasApp.tsx
const [assistMode, setAssistMode] = useState(false);
const [textRecognitionMode, setTextRecognitionMode] = useState(false);
const [recognitionBar, setRecognitionBar] = useState<null | {
  text: string;
  fontSize: number;
  targetIds: string[];
}>(null);

const handleToolChange = (_event: unknown, tool: DrawingTool | 'text') => {
  activeToolRef.current = tool === 'text' ? 'pen' : tool;
  setTextRecognitionMode(tool === 'text');
};

const handleSettingChange = (_event: unknown, setting: SettingPayload | { type: 'assistMode'; value: boolean }) => {
  if (setting.type === 'assistMode') {
    setAssistMode(setting.value);
  }
};
```

```tsx
const handlePointerUp = () => {
  if (!isDrawingRef.current) return;

  isDrawingRef.current = false;
  const finished = finishStroke(stateRef.current);
  stateRef.current = commitStroke(finished);

  if (assistMode) {
    const candidate = classifyShapeCandidate(finished.currentStroke?.points ?? []);
    // 高置信度才追加 shape object
  }

  if (textRecognitionMode) {
    // 写入 handwriting batch，等待 3 秒后再生成 recognitionBar
  }

  drawFrame();
};
```

- [ ] **Step 4: 再跑测试与构建**

Run:
- `npm test`
- `npm run build`

Expected:
- 全绿
- 构建成功

- [ ] **Step 5: 提交这一小步**

```bash
git add src/canvas/CanvasApp.tsx src/canvas/canvasState.ts src/canvas/canvasObjects.ts src/canvas/shapeRecognition.ts src/canvas/textRecognition.ts electron/main.ts src/toolbar/ToolbarApp.tsx TestFile/unit/canvas-objects.test.ts TestFile/unit/shape-recognition.test.ts TestFile/unit/text-recognition.test.ts
git commit -m "feat: integrate assist mode and text recognition flow"
```

---

### Task 8: 文档、日志与运行态验证

**Files:**
- Modify: `ProjectBasics/Function.txt`
- Modify: `ProjectBasics/Variable.txt`
- Modify: `Logs/Context.txt`
- Modify: `Logs/TestResults_20260605.txt`
- Create: `Logs/Fix_EnhancementsPlan_20260605.txt`

- [ ] **Step 1: 更新函数登记**

```text
getToolSettingSections(tool) | ToolbarSettingsTool | ToolbarSettingSection[] | src/toolbar/toolbarSettings.ts | 返回指定工具的设置面板分区 | getToolSettingSections('pen')
classifyShapeCandidate(points) | ShapePoint[] | ShapeCandidateResult | src/canvas/shapeRecognition.ts | 判断当前手绘轨迹是否可自动修正为规则图形 | classifyShapeCandidate(points)
shouldTriggerTextRecognition(lastStrokeEndAt, now) | number, number | boolean | src/canvas/textRecognition.ts | 判断停笔是否已达到 3 秒识别阈值 | shouldTriggerTextRecognition(lastStrokeEndAt, Date.now())
groupHandwritingBatch(strokes) | HandwritingStrokeMeta[] | HandwritingStrokeMeta[][] | src/canvas/textRecognition.ts | 将连续手写笔迹按词组或短句分组 | groupHandwritingBatch(strokes)
estimateTextFontSize(bounds) | InkBounds | number | src/canvas/textRecognition.ts | 根据手写包围盒高度估算文本字号 | estimateTextFontSize(bounds)
```

- [ ] **Step 2: 更新变量登记**

```text
rgbColor | { r: number; g: number; b: number } | src/toolbar/ToolbarApp.tsx | 保存 RGB 自定义取色板的三个通道值 | const [rgbColor, setRgbColor] = useState({ r: 255, g: 77, b: 109 })
assistMode | boolean | src/toolbar/ToolbarApp.tsx | 控制画笔是否启用辅助模式 | const [assistMode, setAssistMode] = useState(false)
textRecognitionMode | boolean | src/canvas/CanvasApp.tsx | 标记当前是否进入字体自识别流程 | const [textRecognitionMode, setTextRecognitionMode] = useState(false)
recognitionBar | { text: string; fontSize: number; targetIds: string[] } | src/canvas/CanvasApp.tsx | 保存当前待确认的文字识别结果条状态 | setRecognitionBar({ text: '我是学生', fontSize: 32, targetIds: ['a', 'b'] })
```

- [ ] **Step 3: 记录测试结果和修复日志**

```text
[Date]: 2026-06-05 22:00:00
[Type]: Fix
[Component]: Toolbar / Canvas / Recognition
[Changes]:
- 完成 UI 稳定层、辅助模式基础层和文字识别基础层
- 修复蒙版区鼠标样式抽搐
- 新增 RGB 取色板、橡皮清除所有、字体自识别按钮
[Performance Metrics]:
- npm test: all green
- npm run build: passed
```

- [ ] **Step 4: 做最终运行态验证**

Run:
- `npm run dev`

Manual checklist:
- 悬浮球更大、带阴影、悬停为手形
- 主工具栏与设置面板之间不再抽搐
- 橡皮设置里可点击 `清除所有`
- 画笔设置有 RGB 与辅助模式
- 有 `字体自识别` 工具按钮
- 停笔 3 秒后出现整组确认条

- [ ] **Step 5: 提交这一小步**

```bash
git add ProjectBasics/Function.txt ProjectBasics/Variable.txt Logs/Context.txt Logs/TestResults_20260605.txt Logs/Fix_EnhancementsPlan_20260605.txt
git commit -m "docs: record enhancement implementation and validation"
```
