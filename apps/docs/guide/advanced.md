# 进阶指南

本文面向需要深度定制业务行为的开发者，介绍 UIKit 的功能开关、数据源自定义与组合式函数体系。

## 功能开关

`EmUIKitProvider` 通过 `enable*` 系列 prop 控制业务能力的启停，开关响应式生效，运行时切换即可：

- `enableContact`：是否启用好友体系（默认 `false`）
- `enableBlocklist`：是否启用黑名单（默认 `false`）
- `enablePresence`：是否启用在线状态（默认 `false`）
- `enableGroup`：是否启用群组体系（默认 `true`）
- `enableUserInfo`：是否启用用户资料（昵称 / 头像）展示与拉取（默认 `true`）
- `enableUserInfoSubscription`：是否启用陌生人用户资料变更订阅（默认 `true`）
- `enableToast`：是否启用内置 Toast 提示（默认 `true`）
- `enableDraft`：是否启用会话列表草稿提示（默认 `true`）
- `enableAtMe`：是否启用会话列表 `@我` 提示（默认 `true`）
- `enableTyping`：是否启用单聊「对方正在输入」提示（默认 `true`）
- `contactFetchMode`：联系人拉取模式，`'page'` 或 `'all'`（默认 `'page'`）

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob-community/uikit-im'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    enable-contact
    enable-presence
    enable-blocklist
    contact-fetch-mode="all"
  >
    <em-contact-container />
  </EmUIKitProvider>
</template>
```

## 键盘导航

UIKit 为列表类交互提供了一套声明式键盘导航 hooks，默认已接入**会话列表、联系人列表、群组列表、@ 提及弹层**。焦点在列表区域内时：

- `↑` / `↓`：移动高亮项
- `Enter`：确认选中（会话列表进入会话、联系人/群组进入详情、@ 弹层选中用户）
- `Esc`：退出键盘导航高亮态

焦点在输入框内时，方向键会让位给光标移动，不会误触发列表导航。

### 组合式 API

业务侧如需给自定义列表增加同样的键盘导航，可直接复用 `useArrowNavigation` 与 `useKeyBindings`：

```ts
import { useArrowNavigation, useKeyBindings } from '@easemob-community/uikit-im'

const items = ref([...])
const keyboardNavActive = ref(false)

const { activeIndex } = useArrowNavigation({
  count: computed(() => items.value.length),
  active: keyboardNavActive,
  wrap: true,
  preventDefault: true,
})

useKeyBindings({
  Enter: () => {
    const item = items.value[activeIndex.value]
    if (item) selectItem(item)
  },
}, { active: keyboardNavActive })
```

### 全局开关

可通过 `setKeyboardShortcutsEnabled(false)` 一键禁用所有 `useKeyBindings` 绑定（包括 ESC 关闭、方向键导航等）：

```ts
import { setKeyboardShortcutsEnabled, isKeyboardShortcutsEnabled } from '@easemob-community/uikit-im'

setKeyboardShortcutsEnabled(false)
console.log(isKeyboardShortcutsEnabled()) // false
```

### 常用配置项

`useKeyBindings` 选项：

- `active`：是否启用，可传响应式值
- `ignoreWhenTyping`：焦点在输入控件时是否不响应，默认 `true`
- `repeat`：长按是否持续触发，默认 `true`
- `preventDefault`：命中后是否阻止浏览器默认行为，方向键导航默认 `true`
- `stopPropagation`：命中后是否阻止事件冒泡

`useArrowNavigation` 选项：

- `count`：列表项数量
- `active`：是否启用导航
- `wrap`：到边界是否回绕，默认 `true`
- `initial`：初始高亮索引
- `disabled(index)`：判断某项是否禁用，禁用项会被自动跳过
- `onActiveChange`：高亮索引变化回调

## 对方正在输入（Typing Indicator）

UIKit 内置单聊「对方正在输入」提示，基于环信 CMD（透传）消息实现。启用 `enableTyping` 后：

- 进入单聊会话且输入框有内容时，UIKit 会自动向对端发送 `TypingBegin` CMD 动作；
- 收到对端 `TypingBegin` 后，会话列表的 `latestMessage` 区域与会话头部标题会显示「正在输入…」提示；
- 为避免其他端（如 iOS）每个单词变化都触发刷新，UIKit 对同一发送者的 typing CMD 做了 5 秒去抖动；
- CMD 消息本身**不会上屏渲染**，也不会进入历史消息列表。

控制开关由 `EmUIKitProvider` 的 `enableTyping` prop 统一提供：

```vue
<template>
  <EmUIKitProvider app-key="your-app-key" enable-typing>
    <em-conversation-container />
    <em-chat-container />
  </EmUIKitProvider>
</template>
```

关闭后，发送端不再发 typing CMD，接收端也不再展示 typing 提示，但原始 CMD 日志仍保留用于调试。

## 自定义数据源

UIKit 允许业务完全接管数据层，通过 `dataSource` prop 传入自定义拉取函数：

```ts
import type { UIKitDataSource } from '@easemob-community/uikit-im'

const dataSource: UIKitDataSource = {
  // 会话列表
  async fetchConversations() {
    return [
      {
        conversationId: 'group-123',
        type: 'groupchat',
        name: '产品群',
      },
    ]
  },
  // 好友列表
  async fetchContacts() {
    return { list: [{ userId: 'user1', name: '小明' }] }
  },
  // 群组列表
  async fetchGroups() {
    return { list: [{ groupId: 'group-123', name: '产品群' }] }
  },
  // 黑名单
  async fetchBlocklist() {
    return [{ userId: 'blocked-1', name: '拉黑用户' }]
  },
}
```

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob-community/uikit-im'
import { dataSource } from './data-source'
</script>

<template>
  <EmUIKitProvider app-key="your-app-key" :data-source="dataSource">
    <em-conversation-container />
  </EmUIKitProvider>
</template>
```

## 组合式函数

UIKit 暴露一组与组件同构的组合式函数，业务可直接复用状态与逻辑：

- `useClient()`：SDK 客户端，`init / login / logout / isLoggedIn / currentUser`
- `useChat()`：聊天状态与消息发送
- `useConversation()`：会话列表与切换
- `useContact()`：好友 / 陌生人 / 黑名单
- `useGroup()`：群组列表与详情
- `usePresence()`：在线状态订阅与发布
- `useUserInfo()`：用户资料（昵称 / 头像）
- `useTheme()`：主题运行时定制
- `useToast()`：轻提示
- `useH5Adaptation()`：移动端安全区 / 键盘 / 下拉刷新

例如在业务代码中监听会话切换：

```ts
import { useConversation } from '@easemob-community/uikit-im'

const { currentConversation, switchConversation } = useConversation()

function onConversationClick(id: string) {
  switchConversation(id)
}
```

## 用户资料同步

启用 `enableUserInfo` 后，UIKit 会在以下时机自动拉取并缓存用户资料：

- 登录后批量同步
- 收到新消息且发送者资料缺失时
- 会话列表 / 联系人 / 群成员渲染时按需补齐

业务可通过 `useUserInfo()` 手动获取或更新：

```ts
import { useUserInfo } from '@easemob-community/uikit-im'

const { getUserInfo, updateOwnUserInfo } = useUserInfo()

// 获取用户资料（含本地缓存）
const info = await getUserInfo('user1')

// 更新自己的昵称与头像
await updateOwnUserInfo({ nickname: '新昵称', avatarUrl: 'https://...' })
```

## 国际化定制

UIKit 内置中英文双语言包，组件文案自动跟随 `useLocale().setLocale()` 切换。同时提供了两个 API，方便业务方与插件开发者扩展自己的多语言文案或覆盖内置文案。

### mergeLocaleMessages — 合并自定义文案

增量注入自定义翻译 key。业务初始化或插件注册时调用，不会覆盖 UIKit 内置 key（同名 key 会被业务值覆盖）。

```ts
import { mergeLocaleMessages } from '@easemob-community/uikit-im'

// 向中文包注入自定义文案
mergeLocaleMessages('zh-CN', {
  'plugin.quickReply.title': '快捷回复',
  'plugin.quickReply.empty': '请先选择一个会话',
})

// 向英文包注入
mergeLocaleMessages('en', {
  'plugin.quickReply.title': 'Quick Reply',
  'plugin.quickReply.empty': 'Please select a conversation first',
})
```

此后在组件内通过 `useLocale().t('plugin.quickReply.title')` 即可拿到对应文案，无需额外配置。

### findLocaleKey — 反查文案对应的 locale key

当你看到界面上某个文案想要覆盖、却不知道对应哪个 key 时，用 `findLocaleKey` 直接将文案反查为 key 列表。支持单个 / 批量查询、模糊 / 精确匹配、指定语言包。

```ts
import { findLocaleKey } from '@easemob-community/uikit-im'

// 单个查询（默认模糊匹配）
findLocaleKey('暂无会话')
// ['conversation.empty']

// 批量查询
findLocaleKey(['暂无会话', '发送名片', '名片'])
// ['conversation.empty', 'message.sendCard', 'message.card', ...]

// 精确匹配：只有完整文案一致才返回
findLocaleKey('发送', { exact: true })

// 指定语言包查询
findLocaleKey('No conversation', { locale: 'en' })
```

`findLocaleKey` 返回的 key 数组可直接配合 `mergeLocaleMessages` 覆盖内置文案：

```ts
import { findLocaleKey, mergeLocaleMessages } from '@easemob-community/uikit-im'

function overrideLocale(text: string, newText: string, locale = 'zh-CN') {
  const keys = findLocaleKey(text, { locale })
  const patch: Record<string, string> = {}
  for (const k of keys) patch[k] = newText
  mergeLocaleMessages(locale, patch)
}

overrideLocale('暂无会话', '没有会话哦~')
overrideLocale('No conversation', 'No chats yet~', 'en')
```

API 签名：

```ts
export interface FindLocaleKeyOptions {
  /** 是否精确匹配完整文案，默认 false（包含匹配） */
  exact?: boolean
  /** 指定查找的语言包，默认使用当前语言 */
  locale?: string
}

export function findLocaleKey(
  text: string | string[],
  options?: FindLocaleKeyOptions,
): string[]
```

### 运行原理

- `mergeLocaleMessages` 将传入的 key-value 对象**浅合并**到指定语种的全局消息表中。同一 key 后调用的值覆盖先前的值。
- `findLocaleKey` 遍历指定语言包的所有 value，对命中的 value 反查其 key。支持同一文案对应多个 key 的场景（如「名片」同时命中 `message.card` 和 `message.contactCard`）。
- 两个 API 均可在初始化阶段或运行时任意时刻调用，响应式生效。

### 开发约定

UIKit 要求所有面向用户的文案必须走多语言 key，**禁止在组件模板或业务逻辑中硬编码中文 / 英文**。新增文案时：

1. 先在中英文 locale 文件中补充 key（`packages/uikit-im/src/locale/lang/zh-CN.ts` / `en.ts`）；
2. 组件内通过 `useLocale().t(key)` 读取；
3. 时间、数字、状态等同样需要通过 locale 配置渲染，确保切换语言后实时刷新。

## SDK 适配器

3.0 起 SDK 层收敛为「中立契约 + 双 adapter」架构：UI 产物不直接依赖某一版 SDK，而是面向 `@easemob-community/uikit-sdk-contract` 的中立 `SdkAdapter` 接口，由 adapter 包完成与具体 SDK（5.x / 4.x）的对接。

> **安装**：适配器包是 optional peer 依赖，不会被自动安装，请按所用 SDK 二选一显式安装——`pnpm add @easemob-community/uikit-sdk-websdk5`（5.x 公开版）或 `pnpm add @easemob-community/uikit-sdk-webim4`（4.x）。

### 两个子路径入口

主入口 `@easemob-community/uikit-im` 保持零 adapter 静态引用（4.x / 5.x 产物互不含对方符号，摇树隔离）；「默认内置」通过子路径入口的 import 副作用完成注册：

| 入口 | 适配 SDK | 适用场景 |
| --- | --- | --- |
| `import '@easemob-community/uikit-im/websdk5'` | `easemob-websdk` 5.x（公开版默认） | 绝大多数接入方 |
| `import '@easemob-community/uikit-im/webim4'` | `easemob-websdk` 4.24.2（经 npm alias `easemob-websdk-4`） | 使用 4.x SDK 的存量项目 |

两个入口都会把对应 adapter 注册为默认适配器（重复 import 以最后一次注册为准并告警），`<EmUIKitProvider>` 不传 `adapter` prop 时由 UIKit 全权管理其生命周期（init / login / logout）。入口同时 re-export adapter 包的全量 API，原先从主入口导入的 SDK 值级符号（3.0 已从主入口移除）改从对应子路径入口导入：

```ts
// 3.0 起：SDK 值级导出只存在于子路径入口
import '@easemob-community/uikit-im/websdk5'
import { Websdk5Adapter } from '@easemob-community/uikit-im/websdk5'
```

### 注入模式（adapter prop）

业务需要全权管理 SDK 连接生命周期时（如 OA 基座统一保管登录态、多应用共享连接），不要 import 子路径入口，改为从 adapter 包取出实例显式传入 `adapter` prop：

```ts
import { Webim4Adapter } from '@easemob-community/uikit-sdk-webim4'

// 业务持有 adapter 实例，登录 / 登出由业务全权调用
const adapter = new Webim4Adapter()
```

```vue
<template>
  <EmUIKitProvider :adapter="adapter" app-key="your-app-key">
    <em-conversation-container />
  </EmUIKitProvider>
</template>
```

注入模式下 **login / logout 归业务全权负责**：`useClient().login()` / `useClient().logout()` 不会转发到 adapter（调用会打告警日志），UIKit 只做 init 接线、事件订阅与自身 store 清理。业务直接调用自己持有的 `adapter.login(user, token)` / `adapter.logout()`。

### 数据入口接管（sdkConfig.repositories）

`dataSource` prop 已收口为 repository 注入的薄别名（装配时逐项翻译，保留至 4.0.0 移除）。新接入推荐直接经 `sdkConfig.repositories` 按域整体接管数据读路径，`message` / `conversation` / `contact` / `group` / `presence` / `userInfo` 六域均可选覆盖，显式 `repositories` 优先于 `dataSource` 翻译结果：

```vue
<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :sdk-config="{
      repositories: {
        conversation: { fetchConversations: myFetchConversations },
        contact: { fetchContacts: myFetchContacts },
        userInfo: { fetchUserInfos: myFetchUserInfos },
      },
    }"
  >
    <em-conversation-container />
  </EmUIKitProvider>
</template>
```

### 旁路持久化（sdkConfig.persistence）

自 `@easemob-community/uikit-im` 3.2.0（`@easemob-community/uikit-sdk-contract` 1.1.0 / `@easemob-community/uikit-core` 2.2.0）起，`sdkConfig.persistence` 提供旁路持久化钩子（`SdkPersistenceHooks`），用于 Electron 本地库（SQLite）等「写路径」落库场景。

**语义**：SDK 行为完全不变，收发 / 状态变更事件发生后旁路把数据同步给本地库，只写不读。所有钩子均为 fire-and-forget——调用方不 await，钩子的同步抛错 / Promise 拒绝只打告警日志，**不阻塞消息收发主链路**；未注入的钩子直接跳过对应同步点。与 `repositories` 的分界：`repositories` 是读路径数据接管（数据源改由注入方提供），`persistence` 是写路径旁路落库，两套接口语义互斥、可同时注入。

钩子按 `message` / `conversation` 两域分组注入，全部可选：

| 域 | 钩子 | 签名 | 触发时机 |
| --- | --- | --- | --- |
| message | `saveMessage` | `(record: MessageRecord) => void \| Promise<void>` | 发送成功、收到新消息、漫游逐条回流时逐条触发 |
| message | `saveMessages` | `(records: MessageRecord[]) => void \| Promise<void>` | 漫游历史大批量回流时批量触发（减少逐条 IPC / 事务开销） |
| message | `updateMessageStatus` | `(msgId: string, status: MessageStatusValue) => void \| Promise<void>` | 送达 / 单聊已读回执回流时触发（发送成功走 `saveMessage` 落库；群已读数为展示态，不落库） |
| message | `markMessageRecalled` | `(msgId: string, operatorId?: string) => void \| Promise<void>` | 撤回置墓碑（含本端主动撤回即落库；`operatorId` 为撤回操作者） |
| message | `updateMessageContent` | `(msgId, body, ext, modifiedInfo?) => void \| Promise<void>` | 消息编辑内容回流（body / ext / 修改信息） |
| message | `deleteMessages` | `(msgIds: string[]) => void \| Promise<void>` | 删除置墓碑（本地删除 / 多选删除 / 多设备删除场景批量触发） |
| conversation | `saveConversations` | `(records: ConversationRecord[]) => void \| Promise<void>` | 会话列表刷新 / 单项变更后整体快照同步（含未读数 / 置顶 / 免打扰） |

入库 DTO 已由 contract 的 `toMessageRecord` / `toConversationRecord` 清洗为 JSON 安全纯数据（附件只留 url / secret 等元数据，二进制不入库），可直接经 Electron IPC 序列化。两个 adapter（websdk5 / webim4）消费同一套钩子，触发点对齐；注入 `repositories.message.loadMessages` 后漫游数据来自本地库，不再写回（避免回声）。

Electron + SQLite 最小接入示例（实现细节为示意，请按实际本地库封装调整）：

```ts
import type { SdkPersistenceHooks } from '@easemob-community/uikit-sdk-contract'

// 示意：经 IPC 转发到主进程写 SQLite，主进程内部自行排队 / 事务
const persistence: SdkPersistenceHooks = {
  message: {
    // 按 msgServerId upsert；服务端 ID 未回填前可先用 msgLocalId 暂存后合并
    saveMessage: record => window.imDb.saveMessage(record),
    saveMessages: records => window.imDb.saveMessages(records),
    updateMessageStatus: (msgId, status) => window.imDb.updateMessageStatus(msgId, status),
    // 墓碑：置 recalled = true + tombstoneTime，不物理删除
    markMessageRecalled: msgId => window.imDb.markRecalled(msgId),
    updateMessageContent: (msgId, body, ext, modifiedInfo) =>
      window.imDb.updateContent(msgId, body, ext, modifiedInfo),
    // 墓碑：置 deleted = true + tombstoneTime，不物理删除
    deleteMessages: msgIds => window.imDb.markDeleted(msgIds),
  },
  conversation: {
    // 会话快照按 id upsert；diff / 防抖开销由实现方负责
    saveConversations: records => window.imDb.saveConversations(records),
  },
}
```

```vue
<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :sdk-config="{ persistence }"
  >
    <em-conversation-container />
  </EmUIKitProvider>
</template>
```

注意事项：

- **幂等 upsert 是实现方责任**：重复投递 / 状态回流会重放，`saveMessage` 需按 `msgServerId`（本地未回填期允许 `msgLocalId`）upsert，撤回 / 删除只置墓碑字段（`recalled` / `deleted` + `tombstoneTime`）不物理删行。
- **钩子异常不影响主链路**：实现方如需保证落库可靠性（IPC 排队、批量、事务），需在钩子内部自行完成。
- **发送失败不入库**：消息发送失败（标记 failed）的分支不会触发 `saveMessage`；流式消息分片不落库，完整消息经收消息 / 漫游路径落库。
- **只写不读**：persistence 不提供任何读路径，本地库数据如需回到 UI，请另行经 `repositories` 接管读路径。

### 能力查询（useUIKit().capabilities）

不同 SDK 版本的客观能力差异（合并消息 / 置顶消息 / 流式消息 / 群已读回执）由 adapter 如实上报到 `useUIKit().capabilities`（adapter 未上报时缺省全 `true`），与 features（业务开关）取交集决定能力入口的展示：

```ts
import { useUIKit } from '@easemob-community/uikit-im'

const { capabilities } = useUIKit()
if (capabilities.groupReadReceipt) {
  // 当前 adapter 背后的 SDK 支持群已读回执
}
```

非 Vue 上下文（定时任务、主进程等 provide/inject 覆盖不到的场景）可通过 core 模块级函数 `getUIKitAdapter()`（`@easemob-community/uikit-core`）读取当前装配的适配器实例，Provider 未挂载或已卸载时返回 `null`。

## H5 与多端适配

移动端场景请阅读 [H5 适配](./h5-adaptation)，覆盖安全区、键盘避让、下拉刷新与手势优化。

## 迁移指南

从历史版本迁移请查阅仓库 [CHANGELOG](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHANGELOG.md)，关注以下破坏性变更点：

- `UIKitProvider` 取代旧的初始化写法，`appKey` 为必填
- 组件统一 `Em` 前缀，旧版非前缀组件名不再注册
- 主题变量名统一为 `--uikit-*`，旧 `--em-*` 变量已废弃

### 3.0（双 SDK 适配架构）

- **SDK 值级导出迁至子路径入口**：`UIKitClient` / `createClient` / adapter / domain / `registerEventHandlers` 等从主入口移除，迁至 `@easemob-community/uikit-im/websdk5`（4.x 场景用 `@easemob-community/uikit-im/webim4`）；主入口仅保留 type-only re-export。迁移方式：入口文件补 `import '@easemob-community/uikit-im/websdk5'`（import 即注册默认 adapter），原先从主入口导入的 SDK 值级符号改从子路径入口导入
- **Provider 新增 `adapter` prop（注入模式）**：业务自带 adapter 实例并全权管理 login / logout，UIKit 不转发连接生命周期（详见上文 [SDK 适配器](#sdk-适配器)）
- **`sdkConfig.repositories` 数据入口**：六域（message / conversation / contact / group / presence / userInfo）可接管数据读路径，推荐替代 `dataSource` prop（后者已 @deprecated，4.0.0 移除）
- **`useUIKit().capabilities`**：adapter 上报的 SDK 客观能力矩阵（合并消息 / 置顶消息 / 流式消息 / 群已读回执），与 features 取交集决定能力入口
- **core `getUIKitAdapter()`**：非 Vue 上下文读取当前适配器实例（Provider 未挂载返回 `null`）
