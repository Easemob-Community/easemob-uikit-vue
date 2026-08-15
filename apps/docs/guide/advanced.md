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
import { EmUIKitProvider } from '@easemob/uikit-im'
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
import { useArrowNavigation, useKeyBindings } from '@easemob/uikit-im'

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
import { setKeyboardShortcutsEnabled, isKeyboardShortcutsEnabled } from '@easemob/uikit-im'

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
import type { UIKitDataSource } from '@easemob/uikit-im'

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
import { EmUIKitProvider } from '@easemob/uikit-im'
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
import { useConversation } from '@easemob/uikit-im'

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
import { useUserInfo } from '@easemob/uikit-im'

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
import { mergeLocaleMessages } from '@easemob/uikit-im'

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
import { findLocaleKey } from '@easemob/uikit-im'

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
import { findLocaleKey, mergeLocaleMessages } from '@easemob/uikit-im'

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

## H5 与多端适配

移动端场景请阅读 [H5 适配](./h5-adaptation)，覆盖安全区、键盘避让、下拉刷新与手势优化。

## 迁移指南

从历史版本迁移请查阅仓库 [CHANGELOG](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHANGELOG.md)，关注以下破坏性变更点：

- `UIKitProvider` 取代旧的初始化写法，`appKey` 为必填
- 组件统一 `Em` 前缀，旧版非前缀组件名不再注册
- 主题变量名统一为 `--uikit-*`，旧 `--em-*` 变量已废弃
