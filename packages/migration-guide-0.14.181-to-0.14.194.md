# Web SDK 接入迁移指南（0.14.181 → 0.14.194）

> 说明：本文档用于帮助真实项目从 `easemob-websdk@0.14.181` 升级到 `0.14.194`，汇总 13 个 patch 版本的主要变更、破坏性 API 调整与迁移建议。

---

## 一、版本概览

- **旧版本**：`0.14.181`（2026-07-08）
- **新版本**：`0.14.194`（2026-07-09）
- **升级跨度**：13 个 patch 版本（0.14.182 → 0.14.194）
- **核心主题**：
  - uniApp 全平台兼容性完善（H5 + 微信小程序 + 原生 App）
  - 合并消息发送协议对齐 4.0 SDK
  - 群组数据查询补齐
  - 运行时错误映射自动化的可靠性提升

---

## 二、新增功能

### 2.1 uniApp demo 工程（0.14.181 底包已引入，本期持续完善）

0.14.181 起新增 `uniapp-demo/` 工程，本期重点修复了其在各运行端的问题：

| 版本 | 改进 |
|------|------|
| 0.14.182 | uniApp H5 初始化改为 ESM 动态 `import()`，修复 `ReferenceError: require is not defined` |
| 0.14.183 | uniApp H5 运行时自动注入 Web `request`/`socket`/`upload` 适配器，修复附件上传报 `Upload capability is missing` |
| 0.14.184 | uniApp H5 平台检测优先走 Web adapter（`window/document` 优先于 `uni.*`），修复上传能力缺失 |
| 0.14.185 | uniApp H5 附件标准化从 `miniapp-path` 改为 `web-file`，支持从 `file`/`originFileObj`/`raw`/`blob` 提取 |
| 0.14.188 | uniApp 微信小程序端：JSX placeholder 绑定、LZ4 模块导出保护、图片/文件选择 fallback |

### 2.2 Web demo 合并消息发送面板（0.14.194）

Web demo 发送消息面板新增"合并消息"发送区域，支持：
- 展示最近已发送和已收到的消息供多选
- 手动输入消息 ID
- 复用普通发送的生命周期日志（`sending`/`success`/`failed`）

---

## 三、破坏性变更（必须适配）

### 3.1 合并消息发送协议变更（0.14.193）

> **重要：** 此变更为本次升级最核心的修复，直接影响线上合并消息的历史消息漫游可用性。

| 变更 | 0.14.181 | 0.14.193+ |
|------|----------|-----------|
| 上行协议类型 | 使用独立 `COMBINE` 协议类型 | 改为使用文本 `TEXT` 内容类型，携带合并消息字段 |
| 影响 | 对端在线可收，但历史消息漫游拉不到合并消息 | 对齐 4.0 SDK 行为，历史消息漫游正常 |

**业务侧无需修改代码**，此变更在 SDK 内部完成。但如果之前有自行兜底处理合并消息上行协议的逻辑，建议移除。

### 3.2 群组 `joinedAt` 字段仅在有值时输出（0.14.192）

| 变更 | 0.14.181 | 0.14.192+ |
|------|----------|-----------|
| `GroupMember.joinedAt` | 服务端未返回加入时间时输出 `undefined` | 不再输出该字段 |

```ts
// 旧
if (member.joinedAt !== undefined) { ... }

// 新（推荐）
if (member.joinedAt) { ... }
// 或显式判断字段是否存在
if ('joinedAt' in member) { ... }
```

---

## 四、重点修复（建议关注）

### 4.1 合并消息链路

| 版本 | 修复 |
|------|------|
| 0.14.193 | 上行编码改为对齐 4.0 SDK（`TEXT` + 合并字段），修复历史消息漫游不可见问题 |
| 0.14.194 | Web demo 新增合并消息发送面板 |

### 4.2 uniApp 全平台兼容

| 版本 | 修复 |
|------|------|
| 0.14.182 | uniApp H5 CJS `require` → ESM `import()` |
| 0.14.183 | uniApp H5 缺失 Web 上传适配器 |
| 0.14.184 | uniApp H5 误走小程序 adapter 分支 |
| 0.14.185 | uniApp H5 附件标准化为 `web-file` 而非 `miniapp-path` |
| 0.14.188 | uniApp 微信小程序 WXML placeholder 转义、LZ4 导出覆盖、图片/文件选择 |

### 4.3 群组数据补齐

| 版本 | 修复 |
|------|------|
| 0.14.190 | 群共享文件列表 `fileName` 使用 `fileId` 兜底 |
| 0.14.191 | 群列表/群成员/群共享文件分页补齐 `hasMore` 推导 |
| 0.14.192 | 群成员列表请求追加 `version=v3`，`joinedAt` 有值时才输出 |

### 4.4 运行时错误映射稳定性（0.14.186）

- 修复 `errors:runtime:gen` 重新生成时自动删除会话未读清零与消息已读回执相关 operation 的问题
- 补齐 `clearConversationUnreadMessageCount`、`clearAllConversationUnreadMessageCount`、`sendMessageReadReceipts`、`getMessageReadReceipts` 的 chat 白名单

---

## 五、迁移步骤

### 5.1 升级依赖

```bash
npm install easemob-websdk@0.14.194
# 或本地 tgz
npm install ./easemob-websdk-next-0.14.194.tgz
```

### 5.2 合并消息协议变更（无需代码改动）

SDK 内部已将合并消息上行协议从独立 `COMBINE` 类型改为对齐 4.0 SDK 的 `TEXT` + 合并字段。调用方无需修改代码，但建议验证：

```ts
// 发送请求和事件回调不变
const msg = client.chatManager.createCombineMessage({ ... });
await client.chatManager.sendMessage(msg);
```

### 5.3 群组成员 `joinedAt` 字段适配（如有读取）

```ts
// 旧：依赖 undefined 判断
if (member.joinedAt !== undefined) { ... }

// 新：推荐使用 in 操作符或 truthy 判断
if ('joinedAt' in member) { ... }
// 或直接使用 member.joinedAt（有值时才是数字）
```

### 5.4 如果使用了 uniApp demo 工程

`uniapp-demo/` 为非 SDK 库代码，仅供联调参考。建议重新运行安装脚本以获取最新的平台适配能力：

```bash
npm run uniapp-demo:install-sdk
```

---

## 六、验证清单

升级后建议至少验证：

- [ ] 单聊/群聊消息正常收发
- [ ] 合并消息发送后，接收方在线可收到；**最重要：接收方通过历史消息漫游可拉取到合并消息**
- [ ] 合并消息下载解析（`downloadAndParseCombineMessage`）正常
- [ ] 群成员列表、群共享文件、群列表分页正常
- [ ] uniApp 场景（如业务使用）：H5 / 微信小程序 / 原生 App 登录、收发消息正常

---

## 七、常见问题

| 问题 | 原因 | 处理 |
|------|------|------|
| 升级后历史消息漫游拉不到旧版本发的合并消息 | 0.14.193 前的合并消息使用独立 `COMBINE` 协议类型，历史存储不可回溯 | 升级后新发的合并消息可正常拉取；旧消息仍需按原协议重新发送 |
| uniApp H5 初始化后上传附件报 `Upload capability is missing` | 平台检测误走到小程序 adapter | 升级到 0.14.184+ |
| uniApp 微信小程序真机报 `Unexpected character '"'` | WXML placeholder 内联 JSON 未转义 | 升级到 0.14.188+ |
| `GroupMember.joinedAt` 变为 `undefined` | 服务端未返回时 SDK 不再输出该字段（0.14.192+） | 使用 `in` 操作符判断 |

---

## 八、参考链接

- 完整 CHANGELOG：`CHANGELOG.md`
- uniApp 集成文档：`docs/demos/uniapp-demo.md`
- 合并消息集成文档：`docs/integration/combine-message-usage.md`
- 群组管理 API 文档：`docs/reference/group-manager-api.md`
