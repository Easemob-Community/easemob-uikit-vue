# @easemob/uikit-sdk-webim4 实现说明书

> 状态：**进行中（约 30%）**。本包负责把 `easemob-websdk@4.x`（`easemob-websdk@4.24.2`，`WebIM.connection`）翻译为 `@easemob/uikit-sdk-contract` 中立契约，使 UIKit 在 4.x / 私有化场景下零改动复用。
>
> 编写/继续前必读：根目录 `docs/SDK-ADAPTER-ABSTRACTION-PLAN.md`（以下简称“主计划”）。

---

## 一、当前完成度总览

| 模块 | 文件 | 状态 | 说明 |
|---|---|---|---|
| 包配置 | `package.json` / `vite.config.ts` / `tsconfig*.json` | ✅ 已建 | UMD 全局名 `EasemobUIKitSdkWebim4`，external `easemob-websdk` 全局 `WebIM` |
| 4.x 类型别名 | `src/sdk-types.ts` | ✅ 已建 | re-export `EasemobChat.*` 关键类型 |
| 客户端包装 | `src/client.ts` | ✅ 初版 | `Webim4Client` 封装 `new WebIM.connection({appKey})` + `open()` + `close()` |
| Adapter 壳子 | `src/adapter.ts` | ⚠️ 占位 | 实现 `SdkAdapter` 接口，但 `subscribe()` 与五个 repository 为 TODO |
| 消息体映射 | `src/adapter/message-adapter.ts` | ✅ 核心字段映射完成 | `txt/img/audio/video/file/loc/cmd/custom/combine` → 中立 `MessageBody` |
| 消息业务域 | `src/domain/message-domain.ts` | ⚠️ 框架完成，类型未修 | 发送/历史/撤回/已读/置顶等 API 已搭，但有 9 处 TS 错误待修 |
| 会话业务域 | `src/domain/conversation-domain.ts` | ❌ 未开始 | 需要 `fetchConversations` 等 |
| 联系人业务域 | `src/domain/contact-domain.ts` | ❌ 未开始 | 需要 `fetchContacts/fetchBlocklist/addContact` 等 |
| 群组业务域 | `src/domain/group-domain.ts` | ❌ 未开始 | 需要 `fetchGroups/fetchGroupInfo/createGroup` 等 |
| 在线状态域 | `src/domain/presence-domain.ts` | ❌ 未开始 | 需要 `publish/subscribe/getStatus` 等 |
| 事件层 | `src/event/*` | ❌ 未开始 | `connection.addEventHandler` → 中立 `SdkEventHandlers` |

---

## 二、已实现的细节

### 2.1 消息体字段映射（`src/adapter/message-adapter.ts`）

已按主计划「八、4.x 能力映射」落地：

- `txt` → `text`，`msg` → `content`
- `img` → `image`，`thumb` → `thumbnailUrl`，`originalImageUrl/bigImageUrl` 保留
- `audio` → `voice`，`length` → `duration`，`url` 保留
- `video` → `video`，`thumb` → `thumbnailUrl`，`length` → `duration`
- `file` → `file`，`file_length` → `fileSize/fileLength`
- `loc` → `location`，`lat/lng` → `latitude/longitude`，`addr` → `address`
- `custom` → `custom`，`customEvent/customExts` → `event/params`
- `combine` → `combine`，字段基本同名

约束遵守：输出 body **只带中立字段**，不携带 `msg`/`thumb`/`length` 等 4.x 原始字段，避免结构型守卫误判。

### 2.2 会话 ID 推导（4.x 无 `conversationId`）

`deriveConversationId`：
- 群聊取 `to`
- 单聊取对端 ID：自己发的取 `to`，对方发的取 `from`

### 2.3 消息业务域（`src/domain/message-domain.ts`）

已实现方法：
- 发送：`sendText/sendImage/sendFile/sendVoice/sendVideo/sendLocation/sendCustom/sendCmd/sendCombine`
- 历史：`fetchHistory`
- 操作：`recall/markConversationRead/markMessagesRead/getGroupMessageReadUsers/modifyText/pinMessage/unpinMessage/getPinnedMessages/sendPendingReadReceipts`

清未读按 4.x 模型实现：
- 单聊发 `type:'read'` 消息
- 群聊发 `type:'channel'` 消息（带 `mid` = 最后一条消息 ID）

---

## 三、当前阻塞问题（必须先修）

### 3.1 类型错误（9 处，`vue-tsc --noEmit` 未通过）

全部集中在 `src/domain/message-domain.ts`：

1. **创建文件/语音/视频/合并消息时 `File` 类型不匹配**
   - 4.x SDK 期望的是 `FileObj`（`{ url, filename, filetype, data }`），不是浏览器原生 `File`
   - 需要把传入的 `File` 包装成 `FileObj`：`{ file: { data: file, filename: file.name, filetype: file.type } }`
   - 合并消息 `messageList` 需要 `CombineMsgList`，且当前传入 `readonly SdkMessage[]` 只读性冲突

2. **`connection.send()` 返回 `SendMsgResult`，不是 `SdkMessage`**
   - 当前 `_send` 直接 `return result`，类型不匹配
   - 正确做法：用 `result.localMsgId`/`result.serverMsgId` 回填到本地 UI 消息，返回 `sent`（`UiMessage` 或映射后的 `SdkMessage`）

3. **`addSendingMessage(localId, uiMsg)` 类型不匹配**
   - `MessageStoreLike.addSendingMessage` 签名是 `(localId: string, sdkMsg: SdkMessage)`
   - 当前传入的是带 UI 扩展的 `UiMessage`，需要拆成：先构造 `SdkMessage` 入 store，再补 UI 扩展

4. **read/channel 回执消息缺 `chatType`**
   - 4.x `CreateReadMsgParameters` / `CreateChannelMsgParameters` 要求 `chatType`
   - `markMessagesRead` 和 `markConversationRead`（单聊分支）的 `WebIM.message.create({ type:'read', ... })` 要补 `chatType`

5. **`getServerPinnedMessages` 结果 item 隐式 any**
   - `result.list` 元素类型未推断，需显式标注或 `as { message: MessagesType }[]`

### 3.2 Adapter 尚未与 UIKit 接上轨

- `Webim4Adapter.subscribe()` 是空壳
- 五个 repository 是 `never = undefined as never`
- UIKit（`uikit-im` / `uikit-core`）目前还没有真正消费 `SdkAdapter`，仍在走旧 `ManagerHost` 路径

**这意味着：即使把本包类型修绿，也无法被 UIKit 调用。**

### 3.3 包依赖方向错误

当前 `package.json`：

```json
"dependencies": {
  "@easemob/uikit-sdk-contract": "workspace:*",
  "@easemob/uikit-core": "workspace:*",  // ← 错误
  "easemob-websdk": "4.24.2"
}
```

adapter 包**不允许依赖 `uikit-core` / `uikit-im`**。当前之所以没报错，是因为 websdk5 adapter 也错误依赖了 core，形成循环依赖。

本包目前源码里没有实际 import `uikit-core`，所以删除该依赖即可。

### 3.4 `Webim4Adapter.client` 返回强类型

当前：

```ts
get client(): Webim4Client | null
```

按主计划决策 19，公开 API 不应泄漏原生 SDK 类型。应改为：

```ts
get client(): unknown | null
```

需要强类型原生调用的，在本包内部 helper 中完成。

---

## 四、TODO 清单（按优先级）

### P0 — 必须先做

- [ ] 修复 `src/domain/message-domain.ts` 9 处 TS 错误
- [x] 从 `package.json` 移除 `@easemob/uikit-core` 依赖
- [ ] `Webim4Adapter.client` 改为 `unknown` 类型
- [ ] `login()` 支持密码登录（当前只处理 `accessToken`；`SdkAdapter.login` 的 `token` 参数可承载密码）

### P1 — 与 5.x  adapter 同步节奏

- [ ] 实现 `Webim4Adapter.subscribe()`：连接事件 + `onMessage` 批量展开 + 回执/撤回/编辑/置顶/流式事件 → 中立 `SdkEventHandlers`
- [ ] 实现 `MessageRepository`（把 `MessageDomain` 方法按契约接口挂到 adapter）
- [ ] 实现 `ConversationRepository`：`fetchConversations` 用 `getServerConversations` / `getServerPinnedConversations`
- [ ] 实现 `ContactRepository`：`fetchContacts/fetchBlocklist/addContact`
- [ ] 实现 `GroupRepository`：`fetchGroups/fetchGroupInfo/createGroup`
- [ ] 实现 `PresenceRepository`：`publish/subscribe/unsubscribe/getStatus`

### P2 — 语义归一化

- [ ] 未读清零语义与 5.x 对齐（4.x 靠 read/channel 副作用）
- [ ] 已读/送达回执事件归一化（4.x read/delivery/channel 消息 → 中立 `onMessageReceipts`）
- [ ] 消息排序与去重（`msgServerId` 为主键；本地 pending 用 `msgLocalId`）
- [ ] 会话快照与增量协调（4.x 只有分页，无 5.x 式全量替换事件）
- [ ] 头像/昵称补全下沉到 adapter（4.x 会话列表不携带资料）

### P3 — 验收

- [ ] `pnpm -F @easemob/uikit-sdk-webim4 exec vue-tsc --noEmit` 通过
- [ ] `pnpm -F @easemob/uikit-sdk-webim4 build` 通过
- [ ] 独立消费者工程验证 4.x 产物中不含 5.x 符号（`ChatClient`/`Easemob`）
- [ ] 核心 IM 手测矩阵：登录/会话/消息/回执/撤回/联系人/群

---

## 五、继续开发的约束

1. **只依赖 contract + 4.x SDK**：禁止新增对 `uikit-core` / `uikit-im` 的 import
2. **所有 UIKit 侧能力通过注入或 contract 提供**：
   - i18n `t()` → 需要时由 UIKit 注入翻译函数，或把文案提前在 adapter 层用英文 key
   - 通知/日志 → 通过 `SdkEventHandlers` 或 contract 的 `createLogger`（已纯 TS）
3. **公开类型只带 `SdkMessage`/`UiX` 等中立类型**：原生 `WebIM`/`connection` 类型不出现在 `index.ts` 导出的公开 API 上
4. **先确认 5.x adapter 契约可用再大规模复制**：`MessageRepository` / `ConversationRepository` 等接口以 contract 为准；5.x 修完接口后，4.x 再对齐实现

---

## 六、关键文件索引

- 中立契约：`packages/uikit-sdk-contract/src/adapter.ts`、`repository.ts`、`events.ts`、`types/message.ts`
- 5.x 参考实现：`packages/uikit-sdk-websdk5/src/adapter.ts`、`domain/*`、`event/*`
- 4.x SDK 源码参考：`/Users/neohuang/Desktop/WorkCommonUse/SDK/websdk/packages/IM/sdk`（软链 `tmp/sdk-ref/websdk4`）
- 主计划：`docs/SDK-ADAPTER-ABSTRACTION-PLAN.md`

---

## 七、一句话总结

**本包骨架已搭好，消息映射和 MessageDomain 框架最完整，但类型错误未修、事件层和 repository 未实现、且与 UIKit 的新 adapter 接口还没接上轨。继续前应先修类型错误并移除对 `uikit-core` 的依赖，然后等 5.x adapter 的 `SdkAdapter` 接口被 UIKit 真正消费后，再按同一契约把 4.x 补全。**
