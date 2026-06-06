# CommentTools

基于 Electron 的桌面批注工具，提供悬浮黑球入口、垂直工具栏、透明画布层、规则图形辅助、手写 OCR、全局快捷键、Windows 开机自启动、设置页退出程序和可安装的 Windows 安装包。

## 主要功能

- 悬浮黑球入口，点击后展开垂直工具栏
- 鼠标、手写、橡皮、撤回、清空、深浅模式、OCR(暂不可用)、系统设置、收起
- 透明全屏画布，尽量不阻断后台程序操作
- 手写 OCR 识别，偏向中文识别，支持识别后替换为规范文字(暂不可用)
- 辅助模式，可将手绘圆形和方框吸附为规则图形
- 全局快捷键，默认支持：
  - 鼠标：`Alt+1`
  - 手写：`Alt+2`
  - 橡皮：`Alt+3`
  - 撤回：`Alt+4`
  - 清空：`Alt+C`
- Windows 开机自动启动
- 设置面板内支持直接退出程序
- 支持 `electron-builder + NSIS` 生成可选安装目录的安装程序

## 技术栈

- Electron
- React 18
- TypeScript
- Vite
- Vitest
- ESLint
- HTML Canvas
- `tesseract.js`
- `electron-builder`
- NSIS

## 运行环境

推荐环境：

- Windows 10 或 Windows 11
- Node.js 18 及以上
- npm 9 及以上
- Git

查看版本：

```bash
node -v
npm -v
git --version
```

## 获取项目

```bash
git clone <你的仓库地址>
cd CommentTools
```

## 安装依赖

本项目已经在 `package.json` 中声明完整依赖，正常情况下执行一次即可：

```bash
npm install
```

### 项目使用到的核心包

运行时依赖：

- `react`
- `react-dom`
- `tesseract.js`

开发依赖：

- `electron`
- `electron-builder`
- `typescript`
- `vite`
- `vitest`
- `eslint`
- `@vitejs/plugin-react`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `concurrently`
- `wait-on`
- `cross-env`
- `@types/react`
- `@types/react-dom`

如果你想手动单独安装，等价命令如下：

```bash
npm install react react-dom tesseract.js
npm install -D electron electron-builder typescript vite vitest eslint @vitejs/plugin-react @typescript-eslint/eslint-plugin @typescript-eslint/parser concurrently wait-on cross-env @types/react @types/react-dom
```

## 开发启动

开发模式会同时启动：

- Vite 前端开发服务器
- Electron 主进程

启动命令：

```bash
npm run dev
```

## 常用命令

运行测试：

```bash
npm test
```

运行 ESLint：

```bash
npm run lint
```

构建前端和 Electron 主进程：

```bash
npm run build
```

仅打包为解包目录：

```bash
npm run pack
```

生成 Windows 安装程序：

```bash
npm run dist:win
```

本地预览前端：

```bash
npm run preview
```

## 正式构建与安装包输出

执行：

```bash
npm run dist:win
```

成功后主要产物位于：

- `release-dist/CommentTools-Setup-0.0.0.exe`
- `release-dist/win-unpacked/`

说明：

- 安装器基于 NSIS
- 支持用户自行选择安装目录
- 安装版会从本地 `dist/` 资源加载，不依赖开发态 `localhost`
- 安装版主进程使用 `dist-electron/package.json` 固定为 CommonJS 作用域，避免打包后出现 `ERR_REQUIRE_ESM`

## 正式使用说明

安装完成后，正常使用流程如下：

1. 运行安装后的 `CommentTools`
2. 桌面右侧会出现黑色悬浮球
3. 点击黑球展开工具栏
4. 选择鼠标、手写、橡皮等工具进行操作
5. 点击设置按钮进入系统设置
6. 在设置中可配置快捷键、开机自动启动和退出程序
7. OCR 功能可对手写内容进行识别并替换为规范字体

## 项目目录结构

```text
CommentTools/
|-- electron/                 # Electron 主进程入口
|-- src/
|   |-- canvas/               # 透明画布、绘制逻辑、OCR、识别条
|   |-- electron/             # 设置持久化、自启动、窗口配置、渲染入口路径
|   |-- toolbar/              # 悬浮黑球、工具栏、子面板、系统设置面板
|-- assets/icons/             # 程序图标与安装器图标
|-- TestFile/unit/            # 单元测试
|-- Logs/                     # 开发日志、修复记录、测试记录
|-- ProjectBasics/            # 项目基础说明、变量表、函数表
|-- docs/superpowers/         # 设计文档与实现计划
|-- package.json              # 包配置、脚本和打包配置
|-- package-lock.json         # 锁定依赖版本
|-- tsconfig.json             # TypeScript 配置
|-- vite.config.ts            # Vite 配置
```

## 故障排查

### 1. 安装版启动时报主进程错误

优先确认是否使用的是最新安装包，并重新安装最新构建产物。

### 2. 开发模式无法启动

请检查：

- Node.js 版本是否过低
- 是否已经执行 `npm install`
- `5173` 端口是否被占用

### 3. 打包失败

请优先执行：

```bash
npm test
npm run lint
npm run build
```

确认无报错后再执行：

```bash
npm run dist:win
```

## 维护说明

当前项目重点文件：

- `electron/main.ts`：主进程、窗口创建、IPC、快捷键注册
- `src/electron/appSettings.ts`：应用设置持久化
- `src/electron/autoLaunch.ts`：Windows 自启动注册表逻辑
- `src/electron/windowConfig.ts`：窗口大小与布局
- `src/toolbar/ToolbarApp.tsx`：工具栏主界面
- `src/toolbar/SystemSettingsPanel.tsx`：系统设置面板
- `src/canvas/CanvasApp.tsx`：透明画布主逻辑

## License

当前仓库未单独声明开源许可证。如需公开发布，建议补充 `LICENSE` 文件。
