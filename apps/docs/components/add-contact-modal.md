# 添加联系人弹窗

`EmAddContactModal` 添加联系人弹窗：输入用户 ID（或按手机号 / 邮箱等业务字段搜索）并附验证信息，发起好友申请。

环信 SDK 的好友关系只认 `userId`，而业务侧添加联系人往往按手机号、邮箱或自有业务接口解析目标用户。组件为此提供三层接管能力（**全部可选，不传回落 SDK 默认**，对存量用法零破坏）：

| 接管层级      | 方式                                                        | 覆盖能力                 |
| ------------- | ----------------------------------------------------------- | ------------------------ |
| 全局接管      | Provider `dataSource.searchUsers` / `dataSource.addContact` | 所有弹窗实例统一生效     |
| 组件级接管    | `search-fn` / `add-fn` props                                | 仅当前实例               |
| UI 级完全接管 | `#body` / `#footer` / `#search-result` 插槽                 | 弹窗内容与操作区完全自绘 |

<demo src="./demo/item.vue" title="按手机号搜索添加" desc="业务侧通过 search-fn 接管「手机号 / 邮箱 → 环信 userId」解析，选择结果后自动填充用户 ID；add-fn 接管添加动作。" />

## 使用方式

基础用法：直接输入环信用户 ID + 附言发起申请。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EmAddContactModal, EmUIKitProvider } from '@easemob/uikit-im'

const show = ref(false)

function onAdded(userId: string) {
  // 添加成功，刷新业务侧联系人数据
}
</script>

<template>
  <EmUIKitProvider app-key="your-app-key" :auto-init="true">
    <EmAddContactModal v-model:show="show" @added="onAdded" />
  </EmUIKitProvider>
</template>
```

## 按手机号 / 邮箱搜索

配置 `search-fn` 后，弹窗进入搜索模式：输入关键字 → 搜索 → 结果列表（头像 + 昵称 + userId）→ 点击选中自动填充用户 ID（可手改）→ 附言 → 确认。

```vue
<script setup lang="ts">
import type { UiContact } from '@easemob/uikit-im'

/** 业务搜索接口：手机号 / 邮箱 / 昵称 → 环信 userId */
async function searchByPhoneOrEmail(keyword: string): Promise<UiContact[]> {
  const res = await fetch(
    `/api/users/search?keyword=${encodeURIComponent(keyword)}`,
  )
  const users = await res.json()
  return users.map((u: { userId: string, name: string, avatar?: string }) => ({
    userId: u.userId,
    name: u.name,
    avatar: u.avatar,
  }))
}
</script>

<template>
  <em-add-contact-modal
    v-model:show="show"
    :search-fn="searchByPhoneOrEmail"
    @added="onAdded"
  />
</template>
```

- 搜索结果类型复用 `UiContact`（含 `userId` / `name` / `avatar` / `phone` / `mail` 等字段，业务可自行填充）
- 未配置 `search-fn` 且 Provider 配置了 `dataSource.searchUsers` 时，自动回落全局适配器
- 两者都未配置时，弹窗退化为直接输入用户 ID 添加（默认行为）

## 自定义添加动作

`add-fn` 完全接管"发起好友申请"动作，适合需要先在自己的业务系统登记好友关系、再调 SDK 的场景：

```vue
<script setup lang="ts">
async function addWithBusiness(userId: string, message?: string) {
  // 先登记业务系统，再调 SDK 添加（或全部由业务实现）
  await fetch('/api/contacts', {
    method: 'POST',
    body: JSON.stringify({ userId, message }),
  })
}
</script>

<template>
  <em-add-contact-modal v-model:show="show" :add-fn="addWithBusiness" />
</template>
```

## 全局接管：Provider 级适配

```ts
import { EmUIKitProvider } from '@easemob/uikit-im'
import type { UiContact } from '@easemob/uikit-im'

const dataSource = {
  // 业务统一搜索接口（手机号 / 邮箱 → 环信 userId）
  searchUsers: async (keyword: string): Promise<UiContact[]> => {
    // ...
  },
  // 业务统一添加逻辑
  addContact: async (userId: string, message?: string) => {
    // ...
  },
}
```

```vue
<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
    :data-source="dataSource"
  >
    <!-- 所有添加联系人弹窗自动生效 -->
  </EmUIKitProvider>
</template>
```

提交链路优先级：`add-fn` → `dataSource.addContact` → SDK 默认实现；搜索链路：`search-fn` → `dataSource.searchUsers`。

## UI 级完全接管

```vue
<em-add-contact-modal v-model:show="show" :add-fn="addWithBusiness">
  <template #body>
    <!-- 完全自绘：搜索框 / 结果列表 / 表单全部由业务实现 -->
  </template>
  <template #footer>
    <!-- 自定义操作区（替换默认取消 / 确认按钮） -->
  </template>
</em-add-contact-modal>
```

## Props

- `show`：是否显示弹窗，支持 `v-model:show` 双向绑定（必填）
- `searchFn`：自定义搜索函数 `(keyword: string) => Promise<UiContact[]>`；优先级高于 `dataSource.searchUsers`；配置后弹窗进入搜索模式
- `addFn`：自定义添加函数 `(userId: string, message?: string) => Promise<void>`；优先级高于 `dataSource.addContact`，完全接管添加动作

## 事件

- `update:show`：弹窗显隐变化，参数 `value: boolean`（配合 `v-model:show`）
- `added`：添加成功，参数 `userId: string`
- `search`：发起搜索，参数 `keyword: string`（可用于埋点 / 日志）

## 插槽

- `body`：完全替换弹窗主体（搜索 / 输入 / 结果区）
- `footer`：替换操作区（默认取消 / 确认按钮）
- `search-result`：自定义搜索结果项右侧渲染，作用域 `{ item: UiContact }`（默认显示选中勾选图标）
