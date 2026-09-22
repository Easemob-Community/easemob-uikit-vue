# @easemob-community/uikit-sdk-webim4 实现说明书

> 状态：**核心 IM 链路已通（组合根装配完成，整包类型检查/构建/单测/eslint 全绿）**。
> 本包负责把 `easemob-websdk@4.x`（`easemob-websdk@4.24.2`，`WebIM.connection`）翻译为
> `@easemob-community/uikit-sdk-contract` 中立契约，使 UIKit 在 4.x / 私有化场景下零改动复用。
>
> 依赖说明：运行时依赖以 npm alias 声明为 `easemob-websdk-4`（`npm:easemob-websdk@4.24.2`），
> 内容与 `easemob-websdk@4.24.2` 完全一致。使用独立 specifier 是为了与 websdk5 的
> `easemob-websdk@5.x` 在 vite 预构建（按名字注册唯一产物）下共存，互不劫持。
>
> 编写/继续前必读：根目录 `docs/SDK-ADAPTER-ABSTRACTION-PLAN.md`（以下简称“主计划”）。

---

## 一、当前完成度总览

| 模块 | 文件 | 状态 | 说明 |
|---|---|---|---|
| 包配置 | `package.json` / `vite.config.ts` / `tsconfig*.json` | ✅ 完成 | UMD 全局名 `EasemobUIKitSdkWebim4`，external `easemob-websdk-4` 全局 `WebIM` |
| 4.x 类型别名 | `src/sdk-types.ts` | ✅ 完成 | re-export `EasemobChat.*` 关键类型 |
| 客户端包装 | `src/client.ts` | ✅ 完成 | `Webim4Client` 封装 `new WebIM.connection({appKey})` + `open()` + `close()` |
| **Adapter 组合根** | `src/adapter.ts` | ✅ 完成 | `Webim4Adapter implements SdkAdapter`：内置 store 工厂 + 域装配 + 事件注册 + repository  getters + 多方订阅扇出（镜像 websdk5 结构） |
| 消息体映射 | `src/adapter/message-adapter.ts` | ✅ 完成 | `txt/img/audio/video/file/loc/cmd/custom/combine` → 中立 `MessageBody`（20 条单测全绿） |
| 会话/联系人/群映射 | `src/adapter/conversation-adapter.ts` / `contact-adapter.ts` / `group-adapter.ts` | ✅ 完成 | 4.x wire → 中立 `UiConversation` / `UiContact` / `UiGroup` |
| 六个业务域 | `src/domain/*-domain.ts` | ✅ 完成 | 消息 / 会话 / 联系人 / 群 / 在线状态 / 用户资料，均对齐 contract `SdkXxxDomain` 接口 |
| 事件层 | `src/event/*` | ✅ 完成 | 各域 `Partial<EventHandlerType>` 工厂 + `registry.registerEventHandlers` 合并注册到单一 `connection.addEventHandler('uikit', ...)` |
| 同步状态 | `src/use-sync-status.ts` | ✅ 完成 | 4.x 仅连接级离线消息同步事件，其余域保持 idle |
| 数据入口注入 | `SdkConfig.repositories` → Domain 构造注入 | ✅ 完成 | Phase 3.1 留口子：`message.loadMessages` / `conversation.fetchConversations` 接管读取路径，未注入走 SDK 默认（见「八」） |

---

## 二、组合根（`src/adapter.ts`）结构

镜像 `packages/uikit-sdk-websdk5/src/adapter.ts`：

- **内置 store 工厂**（`createClientStore` / `createMessageStore` / `createConversationStore` /
  `createContactStore` / `createGroupStore` / `createPresenceStore` / `createUserInfoStore`）：
  SDK 无关的中立类型操作，未注入的 store 域回落内置实现，写入翻译为 `SdkEventHandlers` 中立事件扇出。
  差异：`createClientStore` 的 `client` getter 返回 `null`（4.x 无 `deleteConversationOnGroupDestroyed` 字段）。
- **`init(config)`**：从 `config.adapterConfig` 剥离 `features` / `dataSource` / `stores` / `eventDeps` /
  `onUserInfoSubscriptionPermissionError`（4.x 无 managers/managerPreset/registerImEvents 装配字段），
  构造 `Webim4Client` → 装配六个 Domain → 注册事件处理器。
- **`login` / `logout` / `subscribe`**：logout dispose 事件 + sync 监听 + userInfoDomain；
  登出后再登录自动恢复注册；subscribe 支持多方订阅（Set + Proxy 扇出）。
- **repository getters**（`message` / `conversation` / `contact` / `group` / `presence` / `userInfo`）：
  代理到对应 Domain，参数/返回值按 contract repository 语义收敛（见「四、4.x 语义差异」）。

---

## 三、门禁状态（全部通过）

- `pnpm exec vue-tsc --noEmit`：0 错误
- `pnpm build`（vite build + vue-tsc --emitDeclarationOnly）：通过
- `pnpm vitest run packages/uikit-sdk-webim4`：20/20 通过（message-adapter）
- 根目录 `pnpm exec eslint packages/uikit-sdk-webim4/src`：0 错误

---

## 四、4.x 语义差异（已在 adapter/domain 层收敛）

- **会话列表**：原生游标分页 `getServerConversations` + `getServerPinnedConversations` 合并；
  repository `fetchConversations` 语义：「`cursor` 空 → `refresh()` 第一页，否则 `loadMore()`」，
  游标由 domain 内部维护，返回 store 快照 + `hasMore`。
- **会话名称/头像补全**：4.x 会话项不携带资料，由注入的 `fetchConversationProfiles` 批量补全——
  单聊批量 `fetchUserInfos` 后读 userInfo store，群聊优先 group store 缓存、未命中 `fetchGroupInfo`
  （群头像 4.x 无，留空）；失败静默 warn 不阻断。
- **清未读**：无专用 API，单聊发 `type:'read'`、群聊发 `type:'channel'`（带 `mid`）回执消息隐式清。
- **群已读详情**：`getGroupMsgReadUser` 不支持分页（limit 固定 500），
  repository `getGroupReadReceiptUsers` 恒返回 `{ list, cursor: undefined, hasMore: false }`。
  d.ts 标注 `userlist: string[]`，实测 wire 可能为对象数组 `{username, meta_id, timestamp, ack_content}`
  （d.ts 与 wire 不一致）——domain 内兼容两种形状、按 userId 去重。
- **会话名称/头像补全重试**：`patchConversationProfiles` 成功拿到名称才永久标记，
  失败/空名允许后续 refresh 重试（上限 3 次）；`toUiGroup` 以 `id`/`affiliations_count`/`maxusers`
  判别 GroupDetailInfo，形状无法识别时显式 warn。
- **登录后预取**：4.x 无 5.x 的 roster 自动同步通道，`login` 成功后按 `features.enableContact/enableGroup`
  主动拉取联系人/群列表回填 store 并补发 `onSyncStatus`；`adapterConfig.prefetchOnLogin: false` 可关闭。
- **用户资料订阅**：4.x 无订阅能力，`getSubscribedUsers` 恒返回 `[]`，
  `subscribeUserInfos` 直接熔断（标记失败 + 触发权限错误回调）。
- **群配置修改**：4.x 无修改群配置 API（仅创建时可指定），`updateGroupConfigs` 仅告警跳过。

---

## 五、二期能力清单（未做，按需排期）

- 通知链路：`useNotification` 注入（`adapterConfig.eventDeps`）暂不消费——
  webim4 无 notification-engine，新消息浏览器/页内通知缺失，待二期移植 notification-engine
- Reaction（消息表情回复）
- Thread（话题/子区消息）
- 聊天室（chatroom 场景由独立包承担，4.x 侧未接入）
- 独立消费者工程验证 4.x 产物中不含 5.x 符号（`ChatClient` / `Easemob`）
- 核心 IM 手测矩阵：登录 / 会话 / 消息 / 回执 / 撤回 / 联系人 / 群

---

## 六、继续开发的约束

1. **只依赖 contract + 4.x SDK**：禁止新增对 `uikit-core` / `uikit-im` 的 import
2. **所有 UIKit 侧能力通过注入或 contract 提供**：
   - i18n `t()` / 通知 / 系统通知插入 → `adapterConfig.eventDeps`（`setEventHandlerDeps`）
   - 日志 → contract 的 `createLogger`（纯 TS）
3. **公开类型只带 `SdkMessage` / `UiX` 等中立类型**：原生 `WebIM` / `connection` 类型
   不出现在 `index.ts` 导出的公开 API 上（`Webim4Client` 包装类除外）
4. **生命周期所有权（主计划决策 18，单一所有者，禁止半注入）**：
   内置模式 UIKit 全权；注入模式（`new Webim4Adapter(client)`）业务全权。

---

## 七、关键文件索引

- 中立契约：`packages/uikit-sdk-contract/src/adapter.ts`、`repository.ts`、`events.ts`、`types/*`
- 5.x 参考实现：`packages/uikit-sdk-websdk5/src/adapter.ts`、`domain/*`、`event/*`
- 4.x SDK 源码参考：`/Users/neohuang/Desktop/WorkCommonUse/SDK/websdk/packages/IM/sdk`（软链 `tmp/sdk-ref/websdk4`）
- 主计划：`docs/SDK-ADAPTER-ABSTRACTION-PLAN.md`

---

## 八、数据入口注入（repositories，Phase 3.1 留口子）

下游（如 Electron 本地库）可经 `SdkConfig.repositories` 注入自有数据入口实现，接管 Domain 读取路径；不注入时走 SDK 默认实现，行为与现状一致。websdk5 adapter 同款对称支持。

```ts
// 方式一：Provider 平铺传入（core 归一化会把 repositories 下沉 adapterConfig）
// <UIKitProvider appKey="..." :sdk-config="{ repositories: { message: { loadMessages } } }" />

// 方式二：直连 adapter
await adapter.init({
  appKey,
  repositories: {
    message: {
      loadMessages: async (conversationId, conversationType, cursor, pageSize) => {
        // 返回 MessagePage：{ list, cursor, hasMore }
      },
    },
    conversation: {
      fetchConversations: async (cursor, pageSize) => {
        // 返回 ConversationPage：{ list, cursor, hasMore }
      },
    },
  },
})
```

当前仅消费两个方法（`SdkRepositoryOverrides` 其余字段为后续 DB 阶段预留，注入暂不生效）：

- `message.loadMessages` → `MessageDomain.fetchHistory` 整体委托（`MessagePage` 映射为现有 `{ list, cursor, hasMore }`，store 写入语义与 SDK 路径一致）
- `conversation.fetchConversations` → `ConversationDomain.refresh` 委托（游标翻页至 `hasMore=false` 合并全量，去重并继承已补全名称/头像后回填 store，不触 SDK）

adapter 的 `adapter.message` / `adapter.conversation` repository getter 不做注入合并——上述两个方法由 Domain 委托覆盖，其余注入方法本期不消费。
