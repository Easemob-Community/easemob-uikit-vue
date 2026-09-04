# @easemob/demo-electron

Electron SQLite 持久化专项的**验证工程**（规格书 `docs/ELECTRON-PERSISTENCE-IMPLEMENTATION-NOTES.md` 决策 4）：
壳 + 测试面板，**复用 `apps/demo` 渲染层**，不为它写任何聊天 UI。private 不发布，生命周期跟随专项，验收后留作回归工具。

## 结构

```
apps/demo-electron/
  main.cjs      # BrowserWindow + 单实例锁 + 权限/外链拦截 + createPersistence + IPC 注册
  preload.cjs   # contextBridge 暴露 window.uikitPersist / window.demoShell
  package.json
```

## 怎么跑（一条命令）

前置：`@easemob/uikit-persist-sqlite` 已构建（`pnpm -F @easemob/uikit-persist-sqlite build`）。

```bash
pnpm -F @easemob/demo-electron dev
```

`scripts/dev.cjs` 会用**专属端口 5273** 自动拉起本仓库 demo 的 dev server（`strictPort`，端口被占直接报错），就绪后再启动 Electron 壳；壳退出时连带回收 dev server。

> 为什么不用默认 5173：本机其他项目的 dev server 常占 5173，若 vite 静默顺延端口，壳会加载到别的应用（已踩过）。因此 demo-electron 固定走 5273；`apps/demo` 已开 `strictPort`，任何端口冲突都会显式报错而非错载。
> 需要换端口：`DEMO_PORT=5300 pnpm -F @easemob/demo-electron dev`。

## 使用

1. 启动后加载 demo 登录页（与 Web 版完全一致）；
2. 登录 → 右上角设置抽屉 →「开发者」分类 → 打开「本地持久化（Electron）」开关（自动刷新页面）；
   - 仅 Electron 壳内可见（特性检测 `window.uikitPersist`），Web 模式行为零变化；
3. 重新登录后：消息 / 会话旁路写入主进程 SQLite，历史与会话列表读自本地库；
   库文件在 `userData/uikit_<appKey>_<userId>.db`（macOS: `~/Library/Application Support/demo-electron/`）；
4. 左下角「DB」浮球展开测试面板：
   - **库统计**：`getStorageStats`（结果打 console + 面板提示）；
   - **灌测试消息**：指定 conversationId + 条数，直接调 `hooks.saveMessages` 造数据（翻页穿内存 / 中文搜索用）；
   - **清空全部**：`clearAll`（全表清 + 水位线）；
   - **删库重开**（破坏性）：删 userData 下当前账号库文件后 relaunch，验证「全新安装路径」；
   - **断开 SDK（模拟断网）**：主进程 `session.closeAllConnections()` + offline 网络模拟，验证冷启动有数据 / 断网重开。

## IPC 通道

白名单注册表在 `main.cjs` 的 `CHANNELS`（未登记的方法名一律 reject）：

- 元通道：`uikit-persist:init`（登录后传 appKey/userId 开库）/ `uikit-persist:close` / `uikit-persist:delete-db-and-relaunch`；
- hooks：`uikit-persist:hooks.message.*`（saveMessage/saveMessages/updateMessageStatus/markMessageRecalled/updateMessageContent/deleteMessages/updateMessagePinned）、`uikit-persist:hooks.conversation.*`（saveConversations/removeConversations）；
- repository：`uikit-persist:repository.*`（loadMessages/fetchConversations/searchMessages/searchConversations）；
- 管理：`uikit-persist:manage.*`（getStorageStats/clearMessages/clearAll/vacuum/backup/insertLocalMessage/setMessagePinned/upsertUserInfos/getUserInfos/upsertGroupMembers/getGroupMembers/flushFts）；
- 壳能力：`demo-shell:set-offline`（断网模拟）。

## 原生模块 rebuild

Electron 的 Node ABI 与宿主 Node 不同，`better-sqlite3` 必须按 Electron 头文件重编：

```bash
# 安装依赖后执行一次（或 better-sqlite3 / electron 版本变化后）
pnpm -F @easemob/demo-electron rebuild
```

症状：不重编时启动报错 `The module ... was compiled against a different Node.js version`。
CI / 单测不需要本工程；`apps/demo`（Web 产物消费者验证基准）不引入 electron / 原生依赖。

## 适配点（D85）

- 权限：`setPermissionRequestHandler` 只放行 `media`（麦克风 / 语音消息），其余拒绝；
- 外链：`setWindowOpenHandler` 拦截 `window.open` 走 `shell.openExternal`；
- 单实例：`requestSingleInstanceLock()`，第二实例退出并聚焦已有窗口（决策 8.7）；
- 单写者：SQL 只在主进程执行，渲染进程一律 IPC（contextIsolation 开、nodeIntegration 关）。
