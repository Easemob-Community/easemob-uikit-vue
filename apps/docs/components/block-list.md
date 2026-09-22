# BlockList 黑名单

黑名单模块提供「查看 / 添加 / 移出黑名单」的完整能力：`EmBlockList` 黑名单列表（内置右键移出、添加选人弹窗）、`EmBlockListAddModal` 添加黑名单弹窗，以及 `EmBlockListContainer` 独立容器。黑名单能力依赖 Provider 开启 `enableBlocklist`（默认开启）。

> 通讯录聚合容器 `EmAddressBookContainer` 内置「黑名单」聚合入口、`EmContactContainer` 还内置黑名单子视图，一般无需单独引入本模块组件；独立容器适合自绘布局场景。通讯录容器侧的接入方式见下方「通讯录容器中的黑名单」。

## 使用方式

组件以 `EmBlockListContainer` 为名导出（模块组件 `EmBlockList` / `EmBlockListAddModal` 同样具名导出）。需在 `EmUIKitProvider` 内使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EmUIKitProvider, EmBlockListContainer } from '@easemob-community/uikit-im'
import type { UiContact } from '@easemob-community/uikit-im'

const blocklistRef = ref<InstanceType<typeof EmBlockListContainer>>()

function onClick(contact: UiContact) {
  // 点击黑名单联系人
}

function onUnblock(contact: UiContact) {
  // 已移出黑名单（组件内已弹出确认弹窗并完成 SDK 调用）
}
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
    enable-blocklist
  >
    <div style="height: 100vh; width: 320px;">
      <em-block-list-container
        ref="blocklistRef"
        show-count
        @click="onClick"
        @unblock="onUnblock"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> Provider 需开启 `enable-blocklist`（默认开启）才会在 mount 时自动拉取黑名单；容器高度需由外部给定（组件自身 `height: 100%`）。

## EmBlockList 黑名单列表

黑名单列表模块：头部标题 + 数量徽标、空态、右键「移出黑名单」菜单（带确认弹窗）、头部「添加黑名单」按钮（内置选人弹窗），mount 时自动拉取黑名单（可关闭）。

```vue
<script setup lang="ts">
import { EmBlockList } from '@easemob-community/uikit-im'
</script>

<template>
  <EmBlockList show-count :auto-fetch="true" />
</template>
```

<!-- @include: ../.vitepress/gen/block-list.md -->

### 插槽

| 名称 | 说明 |
| ---- | ---- |
| `header` | 自定义头部标题区（默认渲染标题 + 数量徽标） |
| `header-extra` | 头部右侧附加区（默认渲染「添加黑名单」按钮） |
| `watermark` | 水印覆盖层，铺满列表区，`pointer-events: none` 不响应交互，内容由用户注入 |

### 实例方法

- `refresh()`：重新拉取黑名单（遵守 `autoFetch` / feature 开关与已加载跳过的幂等逻辑）

## EmBlockListAddModal 添加黑名单弹窗

从好友列表中搜索并多选拉黑（自动排除自己与已拉黑者），确认后逐个调用 SDK 拉黑并 toast 结果。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EmBlockListAddModal } from '@easemob-community/uikit-im'
import type { UiContact } from '@easemob-community/uikit-im'

const show = ref(false)

function onAdded(contacts: UiContact[]) {
  // 全部拉黑成功，刷新业务侧状态
}
</script>

<template>
  <EmBlockListAddModal v-model:show="show" @added="onAdded" />
</template>
```

<!-- @include: ../.vitepress/gen/block-list-add-modal.md -->

> `added` 仅在全部拉黑成功时触发；存在失败时不触发，仅 toast 错误。

## EmBlockListContainer 黑名单容器

`EmBlockList` 的容器封装：透传全部列表配置，自带根节点壳（`class` / `style` 可自定义），插槽与事件与 `EmBlockList` 一致（无 `header-extra` 透传）。

```vue
<template>
  <div style="height: 100vh; width: 320px;">
    <em-block-list-container
      title="黑名单"
      show-count
      class="my-blocklist"
      @unblock="(contact) => console.warn('unblocked', contact.userId)"
    />
  </div>
</template>
```

<!-- @include: ../.vitepress/gen/block-list-container.md -->

### 插槽

| 名称 | 说明 |
| ---- | ---- |
| `header` | 自定义头部标题区 |
| `watermark` | 水印覆盖层（同 `EmBlockList`） |

### 实例方法

- `blockListRef`：内部 `EmBlockList` 组件实例引用，可调用其 `refresh()` 等方法

Props 类型 `BlockListContainerProps` 从 `@easemob-community/uikit-im` 具名导出。

## EmContactListContainer 联系人列表容器

好友列表独立容器（通讯录容器联系人子视图同款）：内置搜索、排序 / 拼音分组、字母导航、选择模式（单选 / 多选）、触底加载与在线状态（默认关闭，`enable-presence` 开启），点击行为可完全交给外部接管。mount 时自动拉取好友列表（需 `Provider.enableContact=true`）。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EmUIKitProvider, EmContactListContainer } from '@easemob-community/uikit-im'
import type { UiContact } from '@easemob-community/uikit-im'

const listRef = ref<InstanceType<typeof EmContactListContainer>>()

function onClick(contact: UiContact) {
  // 点击联系人；click-behavior='event-only' 时内部不处理，由外部完全接管
}
</script>

<template>
  <EmUIKitProvider app-key="your-app-key" :auto-init="true" enable-contact>
    <div style="height: 100vh; width: 320px;">
      <em-contact-list-container
        ref="listRef"
        sort-by="pinyin"
        group-by="alphabet"
        @click="onClick"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> `sort-by='pinyin'` / `group-by='alphabet'` 需要注入拼音 adapter，见 [通讯录模块](./contact-container.md)。

<!-- @include: ../.vitepress/gen/contact-list-container.md -->

> 好友列表默认过滤掉已拉黑用户（跟随 Provider `filterBlockedContacts` 配置，默认过滤），与黑名单能力联动。

### 插槽

| 名称 | 说明 |
| ---- | ---- |
| `header` | 自定义头部 |
| `body` / `footer` | 列表顶部 / 底部附加内容（可用 `bodySticky` / `footerSticky` 固定） |
| `loading` / `loading-more` / `no-more` | 加载中 / 加载更多 / 没有更多状态 |
| `empty` | 空列表状态，接收列表作用域参数 |
| `group-header` | 分组标题自定义，接收 `{ key, label }` 作用域参数 |
| `item` | 列表项自定义，接收联系人作用域参数 |
| `search` | 搜索框区域自定义 |
| `watermark` | 水印覆盖层，铺满列表区，不响应交互 |

### 实例方法

- `scrollToGroup(key)`：滚动到指定分组
- `contactListRef`：内部 `EmContactList` 组件实例引用

Props 类型 `ContactListContainerProps` 与 `ContactListClickBehavior` 从 `@easemob-community/uikit-im` 具名导出。

## 通讯录容器中的黑名单

`EmAddressBookContainer` / `EmContactContainer` 已内置「黑名单」聚合入口与子视图，无需自行组合：

- Props：`showBlocklist`（是否展示入口，默认 `true`；`Provider.enableBlocklist=false` 时强制隐藏）、`blocklistLabel` / `blocklistIcon`（入口文案 / 图标）、`showBlocklistAddButton`（黑名单子视图头部「添加黑名单」按钮，默认 `true`）
- 事件：`blocklist-click`（点击黑名单入口）、`blocklist-add`（点击「添加黑名单」按钮）
- 实例方法：`goBlocklist()`（命令式切换到黑名单子视图）

详见 [地址簿容器](./address-book-container.md) 与 [通讯录模块](./contact-container.md)。

## 单聊抽屉的拉黑能力

单聊会话的聊天信息抽屉（`ChatInfoDrawer`）保留了 `block-changed` 事件声明（参数 `userId: string`、`blocked: boolean`），但新设计稿默认 UI 已移除拉黑入口；如需在抽屉内提供拉黑 / 取消拉黑，请通过 `drawer-actions` 插槽接管实现。抽屉结构与接管方式见 [聊天容器 · 抽屉接管](./chat-container.md#抽屉接管)。
