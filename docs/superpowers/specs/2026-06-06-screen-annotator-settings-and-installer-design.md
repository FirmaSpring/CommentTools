# 桌面批注工具设置与安装能力设计

## 1. 目标
- 在现有右侧悬浮工具栏中新增 `settings` 按钮。
- 为系统级能力提供独立设置面板，包含开机自动启动和快捷键配置。
- 快捷键范围固定为 `Alt + 单键`，默认值如下：
  - 鼠标：`Alt+1`
  - 手写：`Alt+2`
  - 橡皮：`Alt+3`
  - 撤回：`Alt+4`
  - 清空：`Alt+C`
- 勾选开机自动启动后，将当前安装路径对应的程序写入 Windows `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`。
- 使用 `electron-builder + NSIS` 生成安装器，并允许用户选择安装路径。

## 2. 设计原则
- 不破坏现有 `toolbarWindow + settingsWindow + canvasWindow` 三窗口结构。
- 系统设置与画笔/橡皮设置共用独立 `settingsWindow`，但内容分开渲染。
- 工具栏内部的鼠标样式始终保持手形，即使当前选中的是 `mouse` 工具。
- 快捷键校验和注册逻辑必须在主进程统一收口，渲染进程只负责展示和输入。
- 自启动写注册表只使用当前可执行文件路径，不写死开发路径。

## 3. UI 方案

### 3.1 工具栏
- 工具顺序调整为：
  1. `mouse`
  2. `pen`
  3. `eraser`
  4. `undo`
  5. `clear`
  6. `theme`
  7. `text`
  8. `settings`
  9. `collapse`
- `settings` 按钮作为面板入口，不改变当前绘图工具。
- `settings` 按钮高亮时表示系统设置面板当前处于打开状态。

### 3.2 设置窗口
- `pen` / `eraser` 仍显示原有设置面板。
- `settings` 打开后显示新的系统设置面板，内容包含：
  - 开机自动启动开关
  - 快捷键说明文案
  - 每个动作的单键输入框，前缀固定为 `Alt +`
  - 冲突或非法输入错误提示
- 面板仍使用现有深浅色变量和实体背景。

## 4. 数据模型

### 4.1 配置对象
```ts
interface ShortcutSettings {
  mouse: string;
  pen: string;
  eraser: string;
  undo: string;
  clear: string;
}

interface AppSettings {
  launchOnStartup: boolean;
  shortcuts: ShortcutSettings;
}
```

### 4.2 默认值
```ts
const DEFAULT_SHORTCUT_SETTINGS: ShortcutSettings = {
  mouse: 'Alt+1',
  pen: 'Alt+2',
  eraser: 'Alt+3',
  undo: 'Alt+4',
  clear: 'Alt+C',
};
```

## 5. 主进程职责
- 在应用启动时读取本地配置文件，缺失时回退默认值。
- 启动后先注册紧急快捷键，再注册用户快捷键。
- 当用户修改快捷键时：
  - 先做合法性和冲突校验
  - 注销旧的用户快捷键
  - 注册新的用户快捷键
  - 持久化配置
- 当用户切换开机自动启动时：
  - 根据当前 `process.execPath` 写入或删除注册表
  - 成功后持久化配置
  - 失败时将错误信息返回设置面板显示

## 6. 渲染进程职责
- 工具栏窗口维护当前绘图工具和当前打开面板两个独立状态。
- 设置窗口通过 IPC 拉取当前配置并回显。
- 用户编辑快捷键时即时规范化为 `Alt+<KEY>`，仅允许单个字母或数字。
- 用户提交非法值或冲突值时，不写入主进程配置。

## 7. 自启动策略
- 注册表键：`HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- 值名：`CommentTools`
- 值数据：带引号的当前可执行文件路径，例如 `"C:\Program Files\CommentTools\CommentTools.exe"`
- 开发模式下允许写入当前 Electron 可执行路径，安装版则自然指向安装目录下的 exe。

## 8. 打包策略
- 使用 `electron-builder` 生成 Windows NSIS 安装器。
- 开启 `nsis.allowToChangeInstallationDirectory = true`，允许用户自选磁盘和安装路径。
- 产物至少包含：
  - `dist/` 前端构建结果
  - `dist-electron/main.cjs` 主进程入口
- `package.json` 增加：
  - `dist:win`
  - `pack`
  - `postinstall` 可保持为空，不做额外副作用

## 9. 测试策略
- 单元测试：
  - 工具栏顺序新增 `settings`
  - 快捷键默认值、规范化和冲突校验
  - 注册表命令生成正确
  - `package.json` 包含 `electron-builder` 与 NSIS 配置
- 集成验证：
  - 点击 `settings` 按钮可打开系统设置面板
  - 修改快捷键后主进程重新注册并生效
  - 切换自启动后可成功写入/移除注册表
- 回归验证：
  - 选中 `mouse` 工具后，工具栏内部仍为手形 cursor
  - 原有 `pen` / `eraser` 设置面板不回归

## 10. 风险与控制
- 快捷键与系统保留组合冲突：
  - 本版只允许 `Alt + 单键`，缩小输入面。
- 注册表写入失败：
  - 主进程返回错误信息，不静默失败。
- 设置按钮抢占当前绘图工具：
  - `settings` 不写入 `active-tool` IPC，只切换右侧面板状态。
- 打包后路径不一致：
  - 自启动始终使用运行时 `process.execPath`，不依赖硬编码安装目录。
