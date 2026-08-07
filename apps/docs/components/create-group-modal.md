# 创建群组弹窗

`EmCreateGroupModal` 创建群组弹窗：多选联系人 → 配置群信息 → 创建群聊并自动进入会话。

环信 SDK 创建群组支持公开 / 私有、入群审批、成员邀请、邀请确认、最大成员数等组合配置（对齐 `createGroup` 契约），组件提供三种配置 / 接管路径：

| 方式     | 说明                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------- |
| 静态配置 | `config` prop 代码层组合（`public` / `joinApprovalRequired` / `allowInvites` / `inviteNeedConfirm` / `maxMembers` 等） |
| 交互配置 | `config.showSettings` 开启弹窗内群设置区：公开群 / 入群审批 / 成员邀请 / 邀请确认开关 + 最大成员数输入                 |
| 完全接管 | `create-fn` prop / Provider `dataSource.createGroup` / `#body` / `#footer` 插槽                                        |

<demo src="./demo/item.vue" title="群设置 + 创建接管" desc="showSettings 开启弹窗内群设置开关；create-fn 接管创建动作并返回 groupId（本示例为模拟实现）。" />

## 使用方式

基础用法：打开弹窗 → 选择成员 → 填群名（可选）→ 创建。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EmCreateGroupModal, EmUIKitProvider } from '@easemob/uikit'

const show = ref(false)

function onCreated(groupId: string) {
  // 创建成功，可跳转到会话页
}
</script>

<template>
  <EmUIKitProvider app-key="your-app-key" :auto-init="true">
    <EmCreateGroupModal v-model:show="show" @created="onCreated" />
  </EmUIKitProvider>
</template>
```

## 静态组合配置

`config` 支持 SDK `createGroup` 的全部组合配置，代码层静态指定：

```vue
<em-create-group-modal
  v-model:show="show"
  :config="{
    name: '前端交流群',
    description: '前端技术讨论',
    public: true, // 公开群
    joinApprovalRequired: true, // 入群需审批
    allowInvites: true, // 允许成员邀请
    inviteNeedConfirm: true, // 被邀请人需确认
    maxMembers: 200, // 最大成员数
  }"
  @created="onCreated"
/>
```

## 弹窗内交互配置

`config.showSettings: true` 时，弹窗内展示群设置区，用户可即时切换：

- 公开群 / 入群需审批 / 允许成员邀请 / 被邀请人需确认（开关）
- 最大成员数（数字输入，可选）

```vue
<em-create-group-modal
  v-model:show="show"
  :config="{ showSettings: true, public: true }"
  @created="onCreated"
/>
```

## 完全接管创建动作

`create-fn` 完全接管创建逻辑，参数为统一契约 `CreateGroupParams`，返回 `{ groupId }`（需自行插入会话 / 跳转）：

```vue
<script setup lang="ts">
import type { CreateGroupParams } from '@easemob/uikit'

async function createWithBusiness(params: CreateGroupParams) {
  // 例如：先调自有群服务，再回环信建群
  const res = await fetch('/api/groups', {
    method: 'POST',
    body: JSON.stringify(params),
  })
  return { groupId: (await res.json()).groupId }
}
</script>

<template>
  <em-create-group-modal v-model:show="show" :create-fn="createWithBusiness" />
</template>
```

## 全局接管：Provider 级适配

```ts
import { EmUIKitProvider } from '@easemob/uikit'
import type { CreateGroupParams } from '@easemob/uikit'

const dataSource = {
  createGroup: async (params: CreateGroupParams) => {
    // 业务统一建群逻辑
    return { groupId: 'group_xxx' }
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
    <!-- 所有创建群组弹窗自动生效 -->
  </EmUIKitProvider>
</template>
```

创建链路优先级：`create-fn` → `dataSource.createGroup` → SDK 默认实现（自动插入会话通知并跳转）。

## UI 级完全接管

```vue
<em-create-group-modal v-model:show="show" :create-fn="createWithBusiness">
  <template #body>
    <!-- 完全自绘：成员选择 / 群信息 / 群设置全部由业务实现 -->
  </template>
  <template #footer>
    <!-- 自定义操作区（替换默认取消 / 创建按钮） -->
  </template>
</em-create-group-modal>
```

## Props

- `show`：是否显示弹窗，支持 `v-model:show` 双向绑定（必填）
- `config`：创建配置 `CreateGroupModalConfig`
  - `name` / `description`：预填群名与描述（输入框显示时）
  - `public`：公开群，默认 `false`
  - `joinApprovalRequired`：入群需审批，默认 `false`
  - `allowInvites`：允许成员邀请，默认 `false`
  - `inviteNeedConfirm`：被邀请人需确认，默认 `false`
  - `maxMembers`：最大成员数（可选）
  - `showNameInput` / `showDescriptionInput`：显示群名 / 描述输入框，默认 `false`
  - `autoName`：自动生成群名（取前 3 个成员昵称），默认 `true`
  - `showSettings`：显示弹窗内群设置区（开关 + 人数输入），默认 `false`
- `createFn`：自定义创建函数 `(params: CreateGroupParams) => Promise<{ groupId: string }>`；优先级高于 `dataSource.createGroup`，完全接管创建动作

## 事件

- `update:show`：弹窗显隐变化，参数 `value: boolean`（配合 `v-model:show`）
- `created`：创建成功，参数 `groupId: string`

## 插槽

- `body`：完全替换弹窗主体（成员选择 / 群信息 / 群设置区）
- `footer`：替换操作区（默认取消 / 创建按钮）

## 类型

- `CreateGroupParams`：创建群组参数契约 `{ name, description?, memberIds?, public?, joinApprovalRequired?, allowInvites?, inviteNeedConfirm?, maxMembers? }`，与 SDK `createGroup` 对齐；`create-fn` 与 `dataSource.createGroup` 共用，避免类型双源漂移
