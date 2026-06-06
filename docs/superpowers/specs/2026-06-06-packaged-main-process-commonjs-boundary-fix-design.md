# 安装版主进程 CommonJS 边界修复设计

## 1. 问题
- 安装版启动时报 `ERR_REQUIRE_ESM`。
- 根因是 `dist-electron/electron/main.cjs` 以 CommonJS 运行，但它依赖的 `dist-electron/src/electron/appSettings.js`、`autoLaunch.js` 仍位于根 `package.json` 的 `"type": "module"` 作用域中。
- 结果是安装版在 `require()` 这些 `.js` 文件时，被 Electron/Node 当成 ESM 拒绝加载。

## 2. 目标
- 保持主进程入口继续使用 CommonJS。
- 让 `dist-electron/` 内所有主进程依赖文件在安装版运行时都被视为 CommonJS。
- 修复后安装版应可正常启动，不再出现 `ERR_REQUIRE_ESM`。

## 3. 方案

### 方案 A：在 `dist-electron/` 写入局部 `package.json`
- 在 `build:electron` 结束后，额外写入 `dist-electron/package.json`，内容为：
```json
{
  "type": "commonjs"
}
```
- 这样 `dist-electron/src/electron/*.js` 会落在新的包边界内，被统一解释为 CommonJS。

### 方案 B：把所有编译产物改名为 `.cjs`
- 理论上可行，但会牵连 `require` 路径解析和产物重命名逻辑，改动更大。

### 方案 C：把根 `package.json` 改成 `type: commonjs`
- 会影响前端 Vite/ESM 侧，风险过高，不采用。

## 4. 推荐
- 采用方案 A。
- 原因是改动最小、风险最低、对现有前端构建无影响，只修正安装版主进程包边界。

## 5. 验证
- 单测锁住 `build:electron` 会写入 `dist-electron/package.json` 且包含 `"type": "commonjs"`。
- 执行：
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run dist:win`
- 重新安装后启动程序，确认不再出现截图中的 `ERR_REQUIRE_ESM`。
