# @easemob/uikit-sdk-contract

Easemob UIKit 的 SDK 中立契约包。

本包定义 UIKit 与底层 SDK 之间的中立接口、wire 类型、事件集与能力矩阵，是 `@easemob/uikit-core`、`@easemob/uikit-im` 与两个 adapter 包（`@easemob/uikit-sdk-websdk5`、`@easemob/uikit-sdk-webim4`）三方共享的单一真相源。

## 设计原则

- **零 SDK 依赖**：不依赖 `easemob-websdk` 的任何版本。
- **零 UI 框架依赖**：不依赖 Vue / Pinia / React，可在任意 UI 层消费。
- **单一真相源**：常量、wire 类型、事件、repository 接口、adapter 接口只在此包定义一次。
- **向后兼容**：公开 API 的变更遵循语义化版本，废弃项会标注 `@deprecated` 并给出迁移路径。
- **少量中立纯工具驻留本包（2026-09-02 决策）**：`utils/logger.ts` / `utils/normalize-user-id.ts`
  虽为运行时行为，但均为纯函数、零 SDK/框架依赖，且需被 core / 双 adapter / uikit-im 三方共享
  同一实例（logger 持有模块级级别与收集 sink 状态）。迁往 `@easemob/uikit-core` 会迫使 adapter
  反向依赖 UI 侧基座（违背「adapter 只依赖 contract + SDK」的依赖方向）；为两个文件单拆共享包
  则增加发布矩阵成本而无行为收益。故维持在契约包，core 侧 `utils/logger.ts` 等仅做 re-export。

## 导出内容

```ts
// 常量（会话类型、消息类型、消息状态、群角色、转发模式等）
export * from './constants'

// 中立类型（SdkMessage / UiMessage / UiConversation / UiGroup / UserInfo 等）
export * from './types'

// 中立事件集
export * from './events'

// 数据入口层（repository）接口
export * from './repository'

// 业务域（Domain Port）接口
export * from './domains'

// 能力矩阵
export * from './capabilities'

// 初始化配置
export * from './config'

// Adapter 接口
export * from './adapter'

// 少量中立纯工具
export * from './utils/logger'
export * from './utils/normalize-user-id'
export * from './message-preview'
export * from './stream-message'
```

## 包关系

```
┌─────────────────────────────────────────────────────────────┐
│                     @easemob/uikit-im                        │
│  UI 组件 / composables / store（依赖契约，不依赖具体 SDK）      │
└──────────────────────────┬──────────────────────────────────┘
                           │ imports contract types/interfaces
┌──────────────────────────▼──────────────────────────────────┐
│            @easemob/uikit-sdk-contract                       │
│  中立契约：types / events / repository / domains / adapter    │
└────────────┬───────────────────────────────┬────────────────┘
             │ implements                    │ implements
┌────────────▼──────────────┐  ┌─────────────▼───────────────┐
│ @easemob/uikit-sdk-websdk5│  │ @easemob/uikit-sdk-webim4   │
│      SDK 5.x adapter       │  │      SDK 4.x adapter        │
└────────────────────────────┘  └─────────────────────────────┘
```

## 实现 Adapter

任何 adapter 都需要实现 `SdkAdapter` 接口。推荐按子接口拆分实现与测试：

```ts
import type { SdkAdapter, SdkLifecycle, SdkRepositories } from '@easemob/uikit-sdk-contract'

export class MyAdapter implements SdkAdapter {
  // SdkLifecycle
  async init(config: SdkConfig) { /* ... */ }
  async login(user: string, token: string) { /* ... */ }
  async logout() { /* ... */ }

  // SdkEventSource
  subscribe(handlers: SdkEventHandlers): () => void { /* ... */ }

  // SdkConnectionState
  get currentUserId() { return '' }
  get isConnected() { return false }
  get capabilities() { return { /* ... */ } }

  // SdkRepositories
  get message() { return this._messageRepository }
  get conversation() { return this._conversationRepository }
  // ...

  // SdkDomains
  get domains() { return this._domainSet }
}
```

### 生命周期所有权

- **内置模式**：UIKit 全权负责 `init` / `login` / `logout` / `dispose`。
- **注入模式**：业务方全权负责；UIKit 只调用 `subscribe` 与 repository/domain 方法，绝不替业务方 `login` / `logout` / `dispose`。

## 能力矩阵

`SdkCapabilities` 由 adapter 如实上报，UIKit 结合 Provider 的 `features` 开关决定最终展示与否。

```ts
export interface SdkCapabilities extends SdkCapabilityFlags {
  /** adapter 实现所遵循的契约版本；缺省视为当前 `SDK_CONTRACT_VERSION` */
  contractVersion?: string
  /** 各能力位的可选协商元信息（能力为 false 时建议填 `reason`） */
  meta?: Partial<Record<SdkCapabilityKey, SdkCapabilityMeta>>
}
```

能力位（`SdkCapabilityFlags`）保持 boolean 映射（`combineMessage` / `pinnedMessage` / `streamingMessage` / `groupReadReceipt`）；协商元信息（`contractVersion` / `meta.reason` / `meta.minContractVersion`）全部可选，仅在未来出现真实差异或契约版本演进时填写。契约包导出 `SDK_CONTRACT_VERSION` 常量，契约发生 breaking 变更时递增，adapter 经 `contractVersion` 上报自己遵循的版本。

## 数据入口注入（Phase 3.1）

`SdkConfig.repositories`（`SdkRepositoryOverrides`）允许下游注入自有数据入口实现（如 Electron 本地库），接管 Domain 读取路径；不注入时走 SDK 默认实现，行为不变。core 归一化会把该字段随平铺字段下沉 `adapterConfig`，websdk5 / webim4 两 adapter 均按 `config.repositories ?? adapterCfg.repositories` 读取。

当前消费的方法（其余字段为后续 DB 阶段预留，注入暂不生效）：

- `message.loadMessages` → `MessageDomain.fetchHistory` 委托
- `conversation.fetchConversations` → `ConversationDomain.refresh` 委托

## 废弃说明

- `UIKitDataSource`（`types/data-source.ts`）已标记为 `@deprecated`：message / conversation / contact / group / presence / userInfo 全域的 repository 注入已落地（core `data-source-repositories.ts` 把 dataSource 逐项翻译为 `SdkRepositoryOverrides` 注入，显式 `repositories` 优先；`searchUsers` 无契约对应项保留 UI 层单点消费），`dataSource` 保留至 uikit-im 3.0.0 移除。新业务接入请优先实现 `SdkAdapter` 的 repository 层。

## 本地开发

```bash
# 类型检查
pnpm -F @easemob/uikit-sdk-contract exec vue-tsc --noEmit

# 构建
pnpm -F @easemob/uikit-sdk-contract build
```
