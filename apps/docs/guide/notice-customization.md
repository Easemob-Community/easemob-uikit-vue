# 系统通知文案定制

群内系统通知（群创建、成员进出、群主变更、禁言、公告等）默认按内置多语言文案展示。UIKit 提供 `noticeConfig` 配置项，允许业务通过 `EmUIKitProvider` 定制文案话术（俏皮 / 严肃）、按条件过滤，或直接禁用某类事件通知。

## 工作原理

所有系统通知统一流经单点管线 `insertChatNotice`，每条通知携带三部分信息：

- **eventType**：事件类型（`NOTICE_EVENT_TYPE` 枚举）；
- **params**：结构化参数（成员名、群名、数量等），供自定义文案与条件过滤使用；
- **defaultText**：内置文案，已按当前语言解析。

管线按以下顺序解析 `noticeConfig`：

1. `eventType` 命中 `disabledEvents` → 不插入（不上屏）；
2. `filter(context)` 返回 `false` → 不插入；
3. `renderText(context)` 返回非空字符串 → 覆盖内置文案；返回 `null` / `undefined` / `''` → 回落 `defaultText`；
4. 最终文案为空 → 不插入。

过滤在**插入前**执行，被过滤的通知不会进入消息 store，不会产生幽灵消息（不参与滚动、计数）。

## NoticeConfig

```ts
export interface NoticeConfig {
  /** 自定义文案：返回非空字符串覆盖内置文案；返回 null/undefined/'' 回落 defaultText */
  renderText?: (context: NoticeContext) => string | null | undefined
  /** 是否展示：返回 false 时该通知不上屏（不插入消息） */
  filter?: (context: NoticeContext) => boolean
  /** 直接禁用的通知事件类型 */
  disabledEvents?: NoticeEventTypeValue[]
}

export interface NoticeContext {
  /** 通知事件类型 */
  eventType: NoticeEventTypeValue
  /** 目标会话 ID */
  conversationId: string
  /** 目标会话类型 */
  conversationType: ConversationTypeValue
  /** 结构化参数（成员名/群名/数量等），供自定义文案与条件过滤使用 */
  params: Record<string, string | number | boolean>
  /** 内置文案（已按当前语言解析），renderText 返回空值时回落 */
  defaultText: string
}
```

通过 `EmUIKitProvider` 的 `notice-config` prop 传入，支持响应式对象（运行时切换配置即时生效）：

```vue
<script setup lang="ts">
import { EmUIKitProvider, NOTICE_EVENT_TYPE } from '@easemob/uikit-im'
import type { NoticeConfig } from '@easemob/uikit-im'

const noticeConfig: NoticeConfig = {
  // 自定义文案 / 过滤 / 禁用（见下文示例）
}
</script>

<template>
  <EmUIKitProvider :notice-config="noticeConfig">
    <!-- 业务内容 -->
  </EmUIKitProvider>
</template>
```

## 事件清单

`NOTICE_EVENT_TYPE` 枚举字符串只允许定义在 UIKit 常量中，业务代码直接引用枚举，避免硬编码字面量：

| 事件 | 枚举 | 触发时机 | params 参数 |
| --- | --- | --- | --- |
| 好友添加 | `CONTACT_ADDED` | 对方同意好友申请 | - |
| 好友删除 | `CONTACT_DELETED` | 好友关系解除 | - |
| 群创建 | `GROUP_CREATED` | 当前用户创建群组 | `groupName` |
| 群名变更 | `GROUP_NAME_CHANGED` | 群名称修改 | `name` |
| 群主变更 | `OWNER_CHANGED` | 群主转让 | `name`、`ownerId` |
| 管理员添加 | `ADMIN_ADDED` | 成员被设为管理员 | `name`、`userId` |
| 管理员移除 | `ADMIN_REMOVED` | 成员被撤销管理员 | `name`、`userId` |
| 成员加入 | `MEMBER_JOINED` | 新成员入群 | `name`、`count`、`userIds`（逗号拼接） |
| 成员退出 | `MEMBER_EXITED` | 成员退群 | `name`、`count`、`userIds`（逗号拼接） |
| 成员被移出 | `USER_REMOVED` | 成员被移出群组 | `name` |
| 群解散 | `GROUP_DESTROYED` | 群组被解散 | - |
| 公告变更 | `ANNOUNCEMENT_CHANGED` | 群公告修改 | `announcement` |
| 禁言添加 | `MUTE_ADDED` | 成员被禁言 | `names`（顿号拼接）、`count` |
| 禁言移除 | `MUTE_REMOVED` | 成员解除禁言 | `names`（顿号拼接）、`count` |
| 全员禁言变更 | `ALL_MEMBER_MUTE_CHANGED` | 全员禁言开启/关闭 | `muted` |
| 白名单添加 | `ALLOWLIST_ADDED` | 成员加入白名单 | `name`、`count`、`userIds` |
| 白名单移除 | `ALLOWLIST_REMOVED` | 成员移出白名单 | `name`、`count`、`userIds` |
| 群禁用变更 | `GROUP_DISABLED_CHANGED` | 群组被禁用/解禁 | `disabled` |
| 共享文件上传 | `SHARED_FILE_ADDED` | 群共享文件上传 | `name`、`fileName` |

## 使用示例

### 俏皮话术（renderText）

按事件类型分支返回自定义文案，其余事件回落内置文案：

```ts
import { NOTICE_EVENT_TYPE } from '@easemob/uikit-im'
import type { NoticeConfig } from '@easemob/uikit-im'

const noticeConfig: NoticeConfig = {
  renderText: (ctx) => {
    if (ctx.eventType === NOTICE_EVENT_TYPE.MEMBER_JOINED)
      return `热烈欢迎 ${ctx.params.name} 加入大家庭 🎉`
    if (ctx.eventType === NOTICE_EVENT_TYPE.MEMBER_EXITED)
      return `${ctx.params.name} 溜了溜了`
    if (ctx.eventType === NOTICE_EVENT_TYPE.GROUP_CREATED)
      return '新群开张，喜气洋洋！'
    return null // 其他事件回落内置文案
  },
}
```

### 严肃话术

同一条回调即可切换整体 tone，例如企业场景：

```ts
const noticeConfig: NoticeConfig = {
  renderText: (ctx) => {
    if (ctx.eventType === NOTICE_EVENT_TYPE.MEMBER_JOINED)
      return `【入群通知】${ctx.params.name} 已加入本群。`
    if (ctx.eventType === NOTICE_EVENT_TYPE.ANNOUNCEMENT_CHANGED)
      return `【公告更新】${ctx.params.announcement}`
    return null
  },
}
```

### 条件过滤（filter）

按结构化参数做条件判断，例如批量加入超过 10 人时不展示刷屏通知：

```ts
const noticeConfig: NoticeConfig = {
  filter: (ctx) => {
    if (ctx.eventType === NOTICE_EVENT_TYPE.MEMBER_JOINED && (ctx.params.count as number) > 10)
      return false
    return true
  },
}
```

### 关闭指定事件（disabledEvents）

直接禁用某类事件通知，无需回调：

```ts
const noticeConfig: NoticeConfig = {
  disabledEvents: [
    NOTICE_EVENT_TYPE.ALLOWLIST_ADDED,
    NOTICE_EVENT_TYPE.ALLOWLIST_REMOVED,
  ],
}
```

## 多语言

- **内置文案**：`defaultText` 始终按当前语言（`useLocale().locale`）解析，`zh-CN` / `en` 文案由 UIKit 内置维护；
- **自定义文案**：`renderText` 收到的是已本地化的 `defaultText`，业务可在回调内自行判断语言返回目标文案：

```ts
import { useLocale } from '@easemob/uikit-im'

const { locale } = useLocale()
const noticeConfig: NoticeConfig = {
  renderText: (ctx) => {
    if (ctx.eventType === NOTICE_EVENT_TYPE.GROUP_CREATED)
      return locale.value === 'en' ? 'A new adventure begins!' : '新群开张，喜气洋洋！'
    return null
  },
}
```

- **插入时解析**：通知文案在插入时确定，切换语言不会回溯改写已上屏的通知（与既有行为一致）。

## 全局改词（mergeLocaleMessages）

只想整体替换某个内置文案、不需要回调逻辑时，用 `mergeLocaleMessages` 覆盖 i18n key 更轻量。与 `noticeConfig` 的关系：

| 方案 | 适用场景 | 能力边界 |
| --- | --- | --- |
| `mergeLocaleMessages` | 全局替换固定文案（所有群都生效） | 无结构化参数，无法做条件逻辑 |
| `noticeConfig.renderText` | 按事件类型 / 参数 / 会话动态生成文案 | 覆盖内置文案，可组合任意逻辑 |
| `noticeConfig.filter` / `disabledEvents` | 控制通知是否上屏 | 不影响其他通知 |

```ts
import { mergeLocaleMessages } from '@easemob/uikit-im'

// zh-CN 与 en 成对补齐
mergeLocaleMessages('zh-CN', { 'chat.notice.memberJoined': '欢迎新伙伴 {name} 入群～' })
mergeLocaleMessages('en', { 'chat.notice.memberJoined': 'Welcome, {name}!' })
```

两者可叠加使用：`mergeLocaleMessages` 负责全局 tone 替换，`noticeConfig` 负责细粒度定制与开关。

## 渲染接管（#message-notice 插槽）

通知消息默认渲染为居中的纯文本。业务可通过 `EmMessageRenderer` 的 `#message-notice` 插槽完全接管通知渲染（如加 emoji 徽章、富文本样式），与其他类型级插槽（`#message-txt` 等）能力对齐：

```vue
<template>
  <em-message-renderer :message="message">
    <template #message-notice="{ message }">
      <div class="my-notice">
        ✨ {{ message.body?.content }}
      </div>
    </template>
  </em-message-renderer>
</template>
```

## 限制说明

- 通知配置通过模块级解析器装配（与 `currentLocale` 同款模式）：多个 `EmUIKitProvider` 实例并存时后者覆盖前者；Provider 卸载时配置重置为空实现；
- `renderText` 返回值直接作为最终文案，不经内置模板插值，无占位符约束；
- 结构化元数据（`eventType` / `params`）随消息写入 `body`，字段可选，旧消息完全兼容。
