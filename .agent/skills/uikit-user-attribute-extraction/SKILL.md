# Vue3 UIKit 用户属性提取规范（昵称 / 头像 / 在线状态）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-user-attribute-extraction**。

## 触发词

- `昵称` / `头像` / `用户属性` / `用户资料`
- `显示名` / `displayName` / `avatarUrl`
- `消息发送者` / `sender name`
- `useUserInfo` / `useOwnUserInfo`
- `用户信息怎么取` / `头像不显示` / `昵称不对`

## 目标

在 `easemob-uikit-vue`（核心包 `packages/uikit-im/src`）里任何需要展示用户昵称、头像、在线状态的场景，
统一走 **`useUserInfo(userId)` / `useOwnUserInfo()`** 这一条路，避免三类翻车：

1. **头像用文字占位**而非 `Avatar` 组件 + 真实 `avatarUrl`（如合并转发弹窗曾只用首字母圆圈）；
2. **昵称只从消息 `ext` 取**，不查用户信息 store，导致非好友 / 无 ext 的用户直接显示 userId；
3. **列表场景不拆子组件**直接在 `v-for` 里调 `useUserInfo`，导致响应式失效或全量重复拉取。

> 边界：本 skill 只讲 **UI 层如何消费用户属性**（昵称 / 头像 / 在线状态）。
> SDK 层 `UserInfoDomain` / `ContactDomain` 的封装细节去看 skill `uikit-contact-group-capabilities`；
> store / composable 的通用编写规范去看 `uikit-store-composable`。

---

## 1. 核心基础设施：三个 composable + 一个 store

### 1.1 `useUserInfo(userId)` — 按用户 ID 解析（最常用）

文件：`composables/use-user-info.ts`

```ts
export function useUserInfo(
  userId: MaybeRefOrGetter<string | undefined>,
  attributes: UserInfoAttribute[] = ['nickname', 'avatarUrl'],
) {
  const { stores, domains, features } = useUIKit()
  // … 自动拉取 + 订阅 …
  return {
    userInfo, // ComputedRef<UserInfo | undefined> — SDK 原始资料
    contact, // ComputedRef<UiContact | undefined> — 联系人（含 remark）
    displayName, // ComputedRef<string> — 备注 > 昵称 > ID（优先级已内置）
    avatarUrl, // ComputedRef<string | undefined> — 用户资料头像
  }
}
```

**关键特性**：

- **自动拉取**：首次调用时若 store 无缓存，自动调 `domains.userInfo.fetchUserInfos([userId])`。
- **自动订阅**：若 `enableUserInfoSubscription` 开启，自动订阅陌生人资料变更；服务端未开通时自动熔断。
- **优先级内置**：`displayName = contact.remark > userInfo.nickname > userId`，`avatarUrl = userInfo.avatarUrl > contact.avatar`。
- **参数支持 ref / getter**：可传 `() => props.userId` 跟随响应式变化。

### 1.2 `useOwnUserInfo()` — 当前登录用户自身资料

文件：`composables/use-own-user-info.ts`

```ts
export function useOwnUserInfo() {
  // 自动拉取自身资料，通过 SDK onOwnInfoUpdated 事件同步
  return {
    userInfo, // 当前用户 SDK 资料
    displayName, // 备注 > 昵称 > currentUserId
    avatarUrl, // 自身头像
    updateOwnInfo, // 批量更新
    updateOwnInfoByAttribute, // 单属性更新
  }
}
```

用于：个人资料编辑页、侧边栏自身头像、设置页等。

### 1.3 `usePresence()` — 在线状态

文件：`composables/use-presence.ts`

```ts
// 简化签名展示，真实实现见 composables/use-presence.ts
export function usePresence() {
  // get(userId) → ComputedRef<UiPresence | undefined>，响应式
  // getPresence(userId) → UiPresence | undefined，非响应式
  // watch(userIdsSource) → 自动跟随列表订阅/取消订阅
  return { get, getPresence, watch, /* subscribe / unsubscribe / fetch / publish */ }
}
```

用于：消息气泡头像右下角在线指示器、联系人列表在线状态。

### 1.4 底层 store：`useUserInfoStore()`

文件：`store/user-info.ts`，setup-store，挂载在 `useUIKit().stores.userInfo`。
**组件层不直接 `useUserInfoStore()`**，统一走 `useUserInfo()` composable。

---

## 2. 显示名与头像的标准优先级

### 2.1 标准优先级（`useUserInfo` 已内置）

```
displayName:  联系人备注(remark) > 用户资料昵称(nickname) > 用户ID
avatarUrl:    用户资料头像(avatarUrl) > 联系人头像(contact.avatar)
```

**不要自己拼优先级**——`useUserInfo` 返回的 `displayName` 和 `avatarUrl` 已按此顺序计算好。

### 2.2 消息 `ext.ease_chat_uikit_user_info` 的定位

SDK 消息扩展 `ext.ease_chat_uikit_user_info` 是**发送时快照**（发送方把当时昵称/头像写入 ext），仅作为**兜底补充**，
不能替代用户信息 store 查询。典型场景：合并转发消息的子消息来自远端文件，可能不带 ext，也可能 ext 过时。

**正确做法**：优先用 `useUserInfo` 解析，ext 仅在 `useUserInfo` 无结果（如功能关闭）时才回退。

```ts
// ✅ 正确：useUserInfo 优先，ext 兜底
const { displayName, avatarUrl } = useUserInfo(() => props.message.from)
const senderName = computed(() =>
  displayName.value
  || props.message.ext?.ease_chat_uikit_user_info?.nickname
  || props.message.from
  || 'Unknown'
)
```

```ts
// ❌ 错误：只从 ext 取，不查 store
function formatSender(msg: UiMessage): string {
  const ext = msg.ext?.ease_chat_uikit_user_info
  return ext?.nickname || ext?.remark || msg.from || 'Unknown'
}
```

---

## 3. 组件消费方式

### 3.1 单用户场景（header、详情页、名片弹窗）

直接在组件内调 `useUserInfo(userIdRef)`，模板用 `Avatar` 组件渲染头像：

```vue
<script setup lang="ts">
import { useUserInfo } from '../../../composables/use-user-info'
import Avatar from '../../../components/avatar/avatar.vue'

const props = defineProps<{ userId: string }>()
const { displayName, avatarUrl } = useUserInfo(() => props.userId)
</script>

<template>
  <Avatar :name="displayName" :src="avatarUrl" :size="36" />
  <span>{{ displayName }}</span>
</template>
```

参考：`modules/chat/chat.vue`（header 单聊对方信息）、`modules/conversation/conversation-item.vue`、
`components/user-card/user-card-modal.vue`、`modules/contact/contact-detail.vue`。

### 3.2 列表场景（消息列表、合并转发弹窗、群成员列表）— 必须拆子组件

`useUserInfo` 内部用 `watchEffect` 跟踪 `userId` 变化，**每个不同的 userId 需要独立调用**。
在 `v-for` 里直接调 composable 会导致响应式跟踪失效或全部复用同一个调用。

**正确做法**：提取列表项子组件，每个子组件独立调 `useUserInfo`。

```vue
<!-- ✅ 子组件：combine-message-modal-item.vue -->
<script setup lang="ts">
import { useUserInfo } from '../../../composables/use-user-info'
import Avatar from '../../../components/avatar/avatar.vue'

const props = defineProps<{ message: UiMessage }>()
const { displayName, avatarUrl } = useUserInfo(() => props.message.from)
</script>

<template>
  <div class="combine-message-modal-item">
    <Avatar :name="displayName" :src="avatarUrl" :size="32" />
    <div class="content">
      <span class="sender">{{ displayName }}</span>
      <MessageRenderer :message="props.message" />
    </div>
  </div>
</template>
```

```vue
<!-- ✅ 父组件：v-for 渲染子组件 -->
<CombineMessageModalItem
  v-for="(msg, idx) in messages"
  :key="msg.msgServerId || idx"
  :message="msg"
  @view-combine="onViewCombine"
/>
```

```html
<!-- ❌ 错误：在 v-for 里内联渲染，不拆子组件，用文字占位头像 -->
<div v-for="msg in messages" :key="msg.id">
  <div class="avatar-placeholder">{{ msg.from.charAt(0) }}</div>
  <span>{{ msg.ext?.nickname || msg.from }}</span>
</div>
```

### 3.3 在线状态（Presence）消费

在需要展示在线指示器的组件中，通过 `usePresence().get(userId)` 获取响应式状态，
传入 `Avatar` 组件的 `presence` prop：

```vue
<script setup lang="ts">
import { usePresence } from '../../../composables/use-presence'
import type { PresenceDisplayStatus } from '../../../components/avatar/avatar.vue'

const props = defineProps<{ message: UiMessage }>()
const { get: getPresence } = usePresence()
const senderPresence = computed(() =>
  getPresence(props.message.from).value?.status as PresenceDisplayStatus | undefined)
</script>

<template>
  <Avatar :name="displayName" :src="avatarUrl" :presence="senderPresence" :size="36" />
</template>
```

参考：`modules/chat/message-item/message-bubble-wrapper.vue`。

---

## 4. 功能开关

Provider 层暴露两个功能开关（`uikit-provider.vue`）：

- `enableUserInfo`（默认 `true`）：关闭后 `useUserInfo` 不拉取不订阅，`displayName` 回退到 userId。
- `enableUserInfoSubscription`（默认 `true`）：单独控制订阅能力，服务端未开通时自动熔断并 Toast 提示一次。

组件层**不自行判断开关**——`useUserInfo` 内部已处理，关闭时安全降级。

---

## 5. `Avatar` 组件必用规则

**禁止用文字 / 首字母占位替代 `Avatar` 组件**。`Avatar` 组件（`components/avatar/avatar.vue`）已处理：

- 无头像时按 `name` 生成彩色首字母背景（自动取前 2 字符，按 charCode 选色）；
- 圆形 / 方形跟随主题（`themeStore.avatarShape`）；
- 在线状态指示器（传入 `presence` prop）；
- 可编辑标识（`editable` prop）。

```vue
<!-- ✅ 正确 -->
<Avatar :name="displayName" :src="avatarUrl" :size="32" />

<!-- ❌ 错误：手写 div + 首字母占位 -->
<div class="avatar-placeholder">
  {{ name.charAt(0).toUpperCase() }}
</div>
```

---

## 硬规则（该拦的）

1. **用户昵称 / 头像必须通过 `useUserInfo(userId)` 解析**，禁止只从消息 `ext` 或直接用 `msg.from` 展示。
2. **头像必须用 `Avatar` 组件**，禁止用 `<div>` + 首字母文字占位。
3. **列表场景必须拆子组件**，每个子组件独立调 `useUserInfo`；禁止在 `v-for` 内联渲染中跳过用户属性解析。
4. **不直接 `useUserInfoStore()`**，统一走 `useUserInfo()` / `useOwnUserInfo()` composable（`uikit-store-composable` 硬规则的同域延伸）。
5. **不自行判断功能开关**，`useUserInfo` 内部已处理 `enableUserInfo` / `enableUserInfoSubscription` 的安全降级。

## 软约定

- 消息 `ext.ease_chat_uikit_user_info` 作为**兜底补充**而非主源；`useUserInfo` 无结果时才回退到 ext。
- 在线状态（Presence）按需消费——仅消息气泡、联系人列表等需要展示在线指示器的场景才引入 `usePresence`。
- `useUserInfo` 的 `attributes` 参数默认 `['nickname', 'avatarUrl']`，如需更多字段（如 `mail`/`phoneNumber`）按需传。

## 反面清单

- ❌ 在 `v-for` 里不拆子组件，直接用 `msg.ext?.nickname || msg.from` 显示昵称。
- ❌ 用 `<div>` + 首字母文字替代 `Avatar` 组件。
- ❌ 只从 `ext.ease_chat_uikit_user_info` 取昵称，不调 `useUserInfo` 查 store。
- ❌ 在组件里直接 `useUserInfoStore()` 绕过 `useUserInfo` composable。
- ❌ 自行判断 `enableUserInfo` 开关来决定是否拉取（`useUserInfo` 已内置）。
- ❌ 列表场景在 `v-for` 的父组件里调一次 `useUserInfo`，所有子项共用同一个 userId 跟踪。

## 已知修复案例

- **合并转发弹窗**（`combine-message-modal.vue`）：原实现只用 `formatSender(msg)` 从 `ext` 取昵称、
  用首字母 `<div>` 占位头像，未调 `useUserInfo`、未用 `Avatar` 组件。
  修复：提取 `combine-message-modal-item.vue` 子组件，每个子组件独立调 `useUserInfo(() => props.message.from)`，
  用 `Avatar` 组件渲染真实头像，ext 作为兜底。详见 git 历史。
