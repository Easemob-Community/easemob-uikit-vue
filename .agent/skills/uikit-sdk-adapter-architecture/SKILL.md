# SDK Adapter 架构维护契约（双 adapter + 中立契约 + repository）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-sdk-adapter-architecture**。

## 触发词

- `adapter 架构` / `SDK 适配层` / `双 adapter` / `中立契约`
- `新功能放 adapter` / `改 domain` / `改 repository` / `加 SDK 能力`
- `uikit-sdk-contract` / `uikit-sdk-websdk5` / `uikit-sdk-webim4`
- `SdkAdapter` / `SdkDomainSet` / `MessageRepository`
- `默认 adapter` / `注入模式` / `内置模式` / `子路径入口`
- `切 SDK` / `4.x 适配` / `5.x 适配`
- `getUIKitAdapter` / `registerDefaultSdkAdapterFactory`

## 目标

避免在双 adapter 架构下加工功能时踩以下五类坑：

1. **包放错位置**：把 SDK 相关实现写进 `uikit-im` 或 `uikit-core`，导致切 SDK 时又要重写 UI。
2. **契约改漏 adapter**：只改 `uikit-sdk-contract` 却忘了同步改 `websdk5` / `webim4` 实现，类型检查过了但运行时另一半 SDK 报错。
3. **反向依赖**：adapter 包 import `uikit-im` 或 `uikit-core` 的值，破坏分层、导致循环依赖或摇树失败。
4. **违反摇树隔离**：在主入口静态 import adapter，让 4.x 下游产物里打包进 5.x SDK 符号。
5. **生命周期半注入**：业务注入 adapter 却让 UIKit 调用 `login`/`logout`，或 UIKit 内置模式却让业务直接操作原生 client，导致连接状态错乱。

## 1. 先建立心智模型：四层单向依赖

一句话：**uikit-im 只面向契约要数据；契约定义「我要什么」；适配层实现「怎么从某个 SDK 拿到并翻译」；core 提供 SDK 无关底座 + 承载契约，不碰 SDK。**

```text
┌────────────────────────────────────────────────┐
│  uikit-im（UI 组件 + store + 交互逻辑）            │
│  只面向「契约」，不 import 任何 SDK                 │
└───────────────────────┬────────────────────────┘
                        │ 依赖（只用契约里的类型/接口）
┌───────────────────────▼────────────────────────┐
│  契约层 @easemob/uikit-sdk-contract              │
│  SdkAdapter / SdkDomainSet / *Repository         │
│  UiMessage / UiConversation / SdkMessage         │
└───────────────────────┬────────────────────────┘
                        │ 实现（implements 契约）
┌───────────────────────▼────────────────────────┐
│  适配层                                            │
│  @easemob/uikit-sdk-websdk5  → 翻译 5.x          │
│  @easemob/uikit-sdk-webim4   → 翻译 4.x          │
└───────────────────────┬────────────────────────┘
                        │ 真正 import SDK（只有这里碰 SDK）
             ┌──────────┴──────────┐
             │ easemob-websdk@5.x  │
             │ easemob-websdk@4.x  │
             └─────────────────────┘
```

依赖方向必须单向：

`uikit-im ──依赖──▶ contract ◀──实现── websdk5 / webim4 ──import──▶ SDK`

**关键澄清：**

- **core 不碰 SDK**：`@easemob/uikit-core` 只剩 theme / locale / 原子组件 / Provider 壳 / 通用 composables / 中立 `getUIKitAdapter()` 访问口；不再 `import 'easemob-websdk'`。
- **uikit-im 不碰 SDK**：`packages/uikit-im/package.json` 不再把 `easemob-websdk` 作为依赖；`vite.config.ts` 不再 external / globals `easemob-websdk`；所有 SDK 类型经 `@easemob/uikit-sdk-contract` 引入。
- **adapter 是 SDK 集成唯一位置**：初始化、登录、事件注册、消息体字段映射、分页收敛、头像昵称补全，全部且只发生在 adapter。

## 2. 包边界：新功能先问放哪

| 包 | SDK 相关性 | 能放什么 | 不能放什么 |
| --- | --- | --- | --- |
| `@easemob/uikit-core` | 无关 | theme / locale / 原子组件 / 通用 composables / Provider 壳 / `getUIKitAdapter()` / `default-adapter.ts` 注册表 | 任何 SDK 类型或值；adapter 具体实现 |
| `@easemob/uikit-sdk-contract` | 无关 | `SdkAdapter` / `SdkDomainSet` / `*Repository` / `SdkMessage` / `UiMessage` / `UiConversation` / body 类型守卫 / `SdkCapabilities` / `SdkConfig` | SDK 专属实现；Vue / Pinia 响应式逻辑 |
| `@easemob/uikit-sdk-websdk5` | 5.x 相关 | 5.x 的 `client.ts` / `adapter/` / `domain/` / `event/` / `utils/sdk-error` / 子路径入口 | uikit-im 或 uikit-core 的值级依赖 |
| `@easemob/uikit-sdk-webim4` | 4.x 相关 | 4.x 的 `client.ts` / `adapter/` / `domain/` / `event/` / 字段映射 | uikit-im 或 uikit-core 的值级依赖 |
| `@easemob/uikit-im` | 无关 | UI 组件 / store / 业务 composables / containers | 直接 import SDK；直接构造 SDK manager |

**判定流程（加工功能前先走一遍）：**

1. 这个功能是否涉及调用 SDK API 或解析 SDK wire 格式？
   - 否 → 放 `uikit-im` 或 `uikit-core`（按 UI 通用性判定）。
   - 是 → 继续。
2. 这个功能是否是「新类型」或「新接口签名」？
   - 是 → 先放 `uikit-sdk-contract`。
   - 否 → 只在现有 adapter 内补实现。
3. 这个功能是否两 adapter 行为一致？
   - 是 → 在 contract 定义后，两 adapter 都要实现；5.x 先写，4.x 后补。
   - 否 → 通过 `SdkCapabilities` 显式声明差异，uikit-im 按 capabilities 分支渲染/隐藏。

## 3. 加新功能的标准流程

以「给消息域加一个 `sendSticker`」为例：

1. **改契约**：在 `packages/uikit-sdk-contract/src/domains.ts` 的 `SdkMessageDomain` 增加：

```ts
sendSticker(conversationId: string, conversationType: ConversationTypeValue, stickerId: string, ext?: Record<string, unknown>): Promise<SdkMessage>
```

2. **同步改 repository（如需要数据入口层支持）**：在 `packages/uikit-sdk-contract/src/repository.ts` 的 `MessageRepository` 增加对应 `sendSticker` 方法。

3. **实现 5.x adapter**：在 `packages/uikit-sdk-websdk5/src/domain/message-domain.ts` 实现 `sendSticker`，把 sticker 映射为 5.x 自定义消息或扩展消息。

4. **实现 4.x adapter**：在 `packages/uikit-sdk-webim4/src/domain/message-domain.ts` 实现 `sendSticker`，把 sticker 映射为 4.x 自定义消息体（`customEvent`/`customExts`）。
   - 若 4.x 当前未跑通，在该方法内抛 `new Error('[Webim4Adapter] sendSticker 待 Phase 2 实现')`，并在 SKILL 已知漂移里登记。

5. **UI 层消费**：在 `uikit-im` 的 composables / components 中经 `useUIKit().domains.message.sendSticker(...)` 调用，**不 import SDK**。

6. **能力声明**：若 4.x 暂不支持，在 `Webim4Adapter.capabilities` 增加 `sticker: false`；uikit-im 按 `capabilities.sticker` 隐藏入口。

**禁止：** 直接在 `uikit-im` 里 `import { ChatManager } from 'easemob-websdk'` 或手写 `chatManager.createCustomMessage(...)`。

## 4. 改契约的标准流程

契约是单一真相源，改契约必须三方同步：

1. **先改 `uikit-sdk-contract`**：类型 / 接口 / 能力矩阵。
2. **再改 `uikit-sdk-websdk5`**：让 `Websdk5Adapter` 和它的 domain / repository / event 继续 implements 契约。
3. **再改 `uikit-sdk-webim4`**：让 `Webim4Adapter` 继续 implements 契约；未实现处先用 `never = undefined as never` 占位并 TODO。
4. **最后改 `uikit-im` / `uikit-core`**：按新契约消费。注意 UI 层改动应尽量小。

**顺序很重要**：如果先改 adapter 再改 contract，会出现「adapter 依赖旧 contract、UI 依赖新 contract」的断层，类型检查一片红。

## 5. 生命周期与装配：内置模式 vs 注入模式

`SdkAdapter` 在 `packages/uikit-sdk-contract/src/adapter.ts` 中定义了统一生命周期：

```ts
interface SdkAdapter {
  init(config: SdkConfig): Promise<void>
  login(user: string, token: string): Promise<void>
  logout(): Promise<void>
  subscribe(handlers: SdkEventHandlers): () => void
  readonly currentUserId: string
  readonly isConnected: boolean
  readonly capabilities: SdkCapabilities
  readonly message: MessageRepository
  readonly conversation: ConversationRepository
  readonly contact: ContactRepository
  readonly group: GroupRepository
  readonly presence: PresenceRepository
  readonly userInfo: UserInfoRepository
  readonly domains: SdkDomainSet
  readonly client?: unknown
}
```

### 5.1 内置模式（UIKit 全权）

业务入口：

```ts
import '@easemob/uikit-im/websdk5'
import { UIKitProvider } from '@easemob/uikit-im'
```

- `import '@easemob/uikit-im/websdk5'` 会调用 `registerDefaultSdkAdapterFactory(() => new Websdk5Adapter())`。
- `<UIKitProvider appKey="...">` 不传 `adapter` prop 时，core 从注册表取默认工厂创建实例。
- UIKit 负责 `init` / `login` / `logout` / 事件订阅。

### 5.2 注入模式（业务全权）

业务入口：

```ts
import { Webim4Adapter } from '@easemob/uikit-sdk-webim4'

const adapter = new Webim4Adapter()
await adapter.init({ appKey })
await adapter.login(user, token)

<UIKitProvider :adapter="adapter">
```

- 传入 `adapter` prop 后，UIKit 只负责 `init` 接线 + `subscribe` 订阅。
- `useClient().login()` / `useClient().logout()` **不会转发到 adapter**（会 warn）。
- 业务必须自己调用 `adapter.login()` / `adapter.logout()`。
- **禁止半注入**：业务建了 adapter 却还让 UIKit 管 login/logout，会导致连接状态与 store 状态不一致。

### 5.3 非 Vue 上下文访问口

- `getUIKitAdapter()`（`packages/uikit-core/src/composables/default-adapter.ts`）用于 OA 基座主进程 / 定时任务 / 其他子应用。
- Provider 装配时自动登记，scope dispose 时清空（仅当仍指向本实例）。

## 6. 摇树隔离：主入口零 adapter 静态引用

**硬规则：**

- `@easemob/uikit-im` 主入口**不**静态 import 任何 adapter 包或 `easemob-websdk`。
- 默认内置快捷方式由**子路径入口**承担：`import '@easemob/uikit-im/websdk5'`。
- 禁止在主入口 `export { Websdk5Adapter }` 等值级导出；值级导出只能由子路径入口或 adapter 包自身承担。
- `uikit-im` 的 `package.json` 应把 `@easemob/uikit-sdk-websdk5` / `@easemob/uikit-sdk-webim4` 声明为 **optional peer + devDependency（workspace）**，不作为普通 dependency。

**效果：**

- 4.x 下游只装 `uikit-sdk-webim4` 时，产物里**不会出现** `ChatClient` / `Easemob` / `Websdk5Adapter` 等 5.x 符号。
- 5.x 下游只装 `uikit-sdk-websdk5` 时，产物里**不会出现** `WebIM` / `connection` / `Webim4Adapter` 等 4.x 符号。

## 7. 事件与 store 注入

adapter 事件层不直接 import UI 包，而是通过 `adapterConfig.stores` 注入的 StoreLike 结构直写 store。

注入时机在 `useCoreUIKitProvider` 的 `setupAdapter` 中：

```ts
await adapter.init({
  ...resolved,
  adapterConfig: {
    ...resolved.adapterConfig,
    stores: {
      client: stores.client,
      presence: stores.presence,
      userInfo: stores.userInfo,
      ...options.sceneStores, // message / conversation / contact / group
    },
    eventDeps: buildEventHandlerDeps(), // i18n / 通知 / 系统通知
    features,
    dataSource,
  },
})
```

`adapter.subscribe(handlers)` 只承担跨层通知：

- `onTokenWillExpire` / `onTokenExpired`
- `onSyncStatus`
- 未注入 store 域的内置 store 扇出

**加工事件时的原则：**

- 凡是需要改业务 store 的，走 `adapterConfig.stores` 的 StoreLike 接口。
- 凡是跨层通知或 token 相关，走 `subscribe` 中立事件。
- 不要新发明第三种事件通道。

## 8. 数据入口层（repository）与数据接入

`SdkAdapter` 同时暴露：

- **domain port**：`adapter.domains.*` —— 现有 UI 操作面，当前优先使用。
- **repository**：`adapter.message` / `adapter.conversation` / `adapter.contact` / `adapter.group` / `adapter.presence` / `adapter.userInfo` —— 数据入口层，读写一体、游标分页。

**签名风格约定（2026-08-31 契约层质量整改收敛，repository 与 domains 共用一套）：**

- 统一**位置参数**（以 `SdkMessageDomain` 既有公开方法为基准，消费方调用点最多）；
- 分页返回统一为 **`{ list, cursor?, hasMore }`**（`hasMore` 必填 boolean；`cursor` 空拉第一页），群成员分页用 `GroupMemberPage`，历史消息 `fetchHistory` 返回 `list`（不再是 `items`）；
- 接口声明用**函数属性风格**（`ts/method-signature-style` 强制），不要写 shorthand 方法签名。

**当前状态：**

- repository 接口在 Phase 1 已定义好，但**第一版 5.x adapter 仍以 domain port 为主**。
- repository 是留给 Phase 3 Electron / 本地 DB 持久化的口子：业务只要实现 `MessageRepository` / `ConversationRepository`，即可把 SQLite / 本地库注入为数据来源。
- **persistence 旁路写库槽（2026-09-02 落地，Phase 3.2/3.4 前置）**：`SdkConfig.persistence?: SdkPersistenceHooks`（契约包 `src/persistence.ts`）——与 repository 的「数据入口接管」语义分立，persistence 是**旁路写库**（SDK 行为不变，收发事件后旁路同步）。入库 DTO `MessageRecord`/`ConversationRecord`（墓碑字段 `recalled`/`deleted`/`tombstoneTime`）与清洗函数 `toMessageRecord`/`toConversationRecord` 在契约包（`types/message/record.ts`、`utils/record.ts`）；双 adapter 已在发送成功/漫游回流/收发事件/撤回/编辑/回执/多设备删除/会话回填逐点接线（fire-and-forget，失败仅告警；repository 注入路径不写回；流式分片不落库）。未注入时行为零变化。
- 旧 `UIKitDataSource`（`uikit-provider.vue` 的 `dataSource` prop）已标记 `@deprecated`，统一迁移方向是 repository；保留至下个大版本移除。

**加工本地数据源时：**

1. 实现 repository 接口。
2. 在 adapter 构造或 `init` 时注入该实现。
3. 不注入时 adapter 退回 SDK 默认实现。
4. IPC / 落库只传纯数据 DTO（无 `File` / `Blob` / `markRaw`），服务端权威，去重键 `msgServerId`。

## 9. 4.x adapter 当前状态与二期 TODO

- **Phase 2 已完成**（2026-09-02 状态）：`@easemob/uikit-sdk-webim4` 六域（message/conversation/contact/group/presence/userInfo）+ 事件层 + 注入模式 + 通知引擎全量落地，门禁全绿；`@easemob/uikit-im/webim4` 子路径入口可用。
- **依赖形态**：webim4 经 npm alias `easemob-websdk-4`（= `easemob-websdk@4.24.2`）引入 4.x SDK——vite 预构建对裸说明符按名注册唯一产物，双 adapter 同图时同名 import 会被劫持到 5.x，独立 specifier 是根治手段（TECH-DEBT D122 2026-09-02 备忘）。改动 webim4 时 import 一律用 `easemob-websdk-4`。
- **残留 TODO**：① 合并转发消息附件条目单向不兼容（5.x 条目 JSON、4.x 条目 Meta protobuf）——已推动 SDK 组，若结论是 4.x 不改则在 `downloadAndParseCombineMessage` 加 JSON 兜底；② 漫游 pb 容错补丁 `patch-pb-decode.ts`（SDK 修复根因后可移除）；③ Phase 3 DB/Electron 专项；④ 二期能力 Reaction/Thread/翻译/语音转文字。
- 字段/API/事件映射表见 `docs/SDK-ADAPTER-ABSTRACTION-PLAN.md` 第八、九节。
- **加工 4.x 功能时**：先查该表，按「中立接口 → 4.x 实现」逐行落地；不确定时直接核对 4.x SDK 源码（`/Users/neohuang/Desktop/WorkCommonUse/SDK/websdk/packages/IM/sdk`），禁止凭记忆。

## 10. 关键 API / 域对照表（中立接口为基准）

| UIKit 意图 | 5.x adapter 实现 | 4.x adapter 实现 | 备注 |
| --- | --- | --- | --- |
| 初始化 SDK | `ChatClient.init({ appKey, managers: [...] })` | `new WebIM.connection({ appKey })` | 4.x appKey 在构造时传入 |
| 登录 | `client.login({ userId, token })` | `conn.open({ user, accessToken })` | 中立 `login(user, token)` 透传 |
| 发送文本 | `chatManager.createTextMessage(...)` + `sendMessage` | `Message.create({ type: 'txt', ... })` + `connection.send` | body 字段映射见计划文档 |
| 拉历史 | `chatManager.getHistoryMessages(...)` | `connection.getHistoryMessages(...)` | 参数名 `conversationId` vs `targetId` |
| 清空会话未读 | `chatManager.clearConversationUnreadMessageCount(...)` | 发 `type:'read'` / `type:'channel'` 回执消息 | 4.x 无专用 API |
| 发送已读回执 | `chatManager.sendMessageReadReceipts(...)` | 发 read/delivery/channel 消息 | 模型差异 |
| 撤回 | `chatManager.recallMessage(...)` | `connection.recallMessage(...)` | 参数结构不同 |
| 会话列表 | 本地快照 / 事件驱动 | `getServerConversations({pageSize,cursor})` | 统一为游标分页 |
| 联系人 | `contactManager.getContacts()` | `connection.getContacts()` / `getContactsWithCursor` | 4.x 有游标分页 |
| 在线状态 | `presenceManager.subscribePresence(...)` | `connection.subscribePresence(...)` | 同名方法挂接对象不同 |

## 硬规则 vs 软约定

**硬规则：**

- `uikit-im` 和 `uikit-core`**禁止**直接 import `easemob-websdk` 的值或类型。
- 新增 / 修改 SDK 相关功能，**必须先改 `uikit-sdk-contract`**，再改两 adapter，最后改 UI。
- adapter 包**禁止**值级依赖 `uikit-im` / `uikit-core`（工具函数应下沉到 contract 或通过注入传递）。
- 主入口（`@easemob/uikit-im`）必须保持零 adapter 静态引用；默认内置走子路径入口自注册。
- 注入模式下 UIKit **不转发** `login` / `logout`；业务全权。
- 新增能力若某 SDK 暂不支持，必须在 `SdkCapabilities` 显式声明为 `false`，uikit-im 按 capabilities 隐藏入口。

**软约定：**

- 中立类型字段名沿用 5.x 语义（`msgServerId` / `msgLocalId` / `thumbnailUrl` / `originalImageUrl` 等），4.x adapter 负责字段映射。
- body 类型守卫用字段存在性判断（`'duration' in body`），因此 adapter 映射时必须**精确产出中立字段集**，不要携带多余原始字段。
- 4.x 未实现的方法用 `never = undefined as never` 占位并 TODO，不要空实现误导。
- repository 与 domain port 并存时，优先用 domain port 满足当前 UI 消费；repository 留给 Phase 3 DB 接入。
- capabilities 协商机制（2026-08-31 落地）：能力位保持 boolean 映射不动；契约包导出 `SDK_CONTRACT_VERSION` 常量（契约 breaking 变更时递增），adapter 经 `SdkCapabilities.contractVersion` 上报遵循的契约版本；某能力为 `false` 或语义有差异时，在 `SdkCapabilities.meta.<能力名>.reason` 写原因，语义演进需要新版本契约时填 `meta.<能力名>.minContractVersion`。当前两代能力全 true，元信息可空。

## 已知漂移（改到相关文件时注意）

- `UIKitDataSource`（`uikit-provider.vue` `dataSource` prop）已标 `@deprecated`，迁移目标为 repository 数据入口层，保留至 uikit-im 3.0.0 移除。
- 漫游容错补丁 `packages/uikit-sdk-webim4/src/patch-pb-decode.ts`：给 4.x SDK 的 pb Meta decode 包 try/catch（漫游坏消息跳过不拖垮整页），SDK 组修复根因后可移除；合并消息条目格式兼容结论出来后评估 `downloadAndParseCombineMessage` JSON 兜底。
- 双 adapter 并行改动的同步约束即本文件第 3/4 节流程 + 「硬规则」；契约接口是编译期强制同步点（两 adapter `implements`，改契约不改齐两边 vue-tsc 必红）。
- 关联 TECH-DEBT：D122（本架构落地）、D85（Electron 持久化）、D125（微前端 OA 基座兼容）。

## 反面清单

- ❌ 在 `uikit-im` 里 `import { ChatManager } from 'easemob-websdk'` —— 破坏切 SDK 能力。
- ❌ 只改 `uikit-sdk-contract` 不改 `websdk5` / `webim4` adapter —— 类型编译过，运行时缺实现。
- ❌ adapter 包 import `uikit-im` 内部工具函数 —— 反向依赖，摇树失败。
- ❌ 在主入口 `export * from '@easemob/uikit-sdk-websdk5'` —— 4.x 下游会打包 5.x 符号。
- ❌ 注入 adapter 后还指望 `useClient().login()` 自动登录 —— 不会转发，业务要自己登录。
- ❌ 4.x adapter 输出中立 body 时携带 `body.msg` / `body.thumb` 等原始字段 —— 守卫误判。
- ❌ 凭记忆写 4.x API 映射 —— 必须核对 `easemob-websdk@4.24.2` 源码。
