# 会话模块

会话列表容器，开箱即用的 IM 会话页：内置搜索、未读徽标、置顶 / 免打扰 / 删除（长按或右键）、草稿记忆与下拉刷新，数据由 SDK 自动同步驱动。

## 使用方式

组件以 `EmConversationContainer` 为名导出。容器依赖 `EmUIKitProvider` 提供 SDK 实例，需将两者组合使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit-im'

function onSelect() {
  // 切换到聊天页，例如把 conversation.id 写入路由
}
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
    enable-presence
  >
    <div style="height: 100vh; width: 320px;">
      <em-conversation-container
        title="消息"
        unread-mode="count"
        @conversation-select="onSelect"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> 会话列表在 SDK 5.x 下由 WebSocket 自动同步：登录成功后会监听 `onConversationListSyncDidFinish` 并自动填充列表，无需手动拉取。

## 会话列表项

`EmConversationItem` 是会话列表的基础展示单元，支持单聊 / 群聊、未读徽标、置顶、免打扰与红点模式：

<demo src="./demo/item.vue" title="会话列表项" desc="静态展示单聊、群聊置顶、免打扰与未读红点（dot）四种形态；实际业务中长按（H5）/ 右键（PC）可唤起操作菜单。" />

## 在线代码演练场

直接编辑下面的代码（容器 props 与 mock 会话数据），右侧列表随代码编译即时更新，点「重置代码」恢复初始模板：

<VuePlayground :files="conversationPlaygroundFiles" title="会话列表配置在线演练场" id="conversation" />

## API

<!-- @include: ../.vitepress/gen/conversation-container.md -->

## 插槽说明

- `header`：自定义头部内容（替代默认标题）
- `empty`：空列表状态，接收 `keyword` 等插槽属性
- `body`：列表顶部附加内容，可通过 `body-sticky` 固定
- `footer`：列表底部附加内容，可通过 `footer-sticky` 固定
- `tabs`：完全接管分栏 tab 栏渲染，作用域提供 `{ tabs, activeTab, selectTab }`（`ConversationTabsSlotScope`）
- `status-banner`：自定义连接/同步状态横幅，作用域提供当前横幅状态（`{ visible, type, loading, title, description, clickable }`）
- `item`：完全接管会话项渲染，作用域提供 `{ conversation, active, keyboardFocus, select, pin, mute, delete, read, customAction }`（`ConversationItemSlotScope`）；不传时默认渲染内置 `EmConversationItem`
- `header-menu`：完全接管 Header `+` 菜单区域（触发按钮 + 弹出层），作用域提供 `{ menuItems, open, close }`；不传时默认渲染内置菜单
- `new-chat` / `add-contact` / `create-group`：分别接管「新建会话 / 添加联系人 / 创建群组」弹窗渲染，作用域提供 `{ show, open, close }`；不传时默认渲染内置弹窗

## 会话项完全接管

会话列表支持 `#item` 插槽完全接管会话项渲染（与联系人/群组列表的 `#item` 惯例一致），作用域提供会话数据、选中/高亮态与内置动作句柄：

```vue
<template>
  <em-conversation-container>
    <template #item="{ conversation, active, keyboardFocus, select }">
      <div
        class="my-conv-item"
        :class="{ active }"
        @click="select"
      >
        <span>{{ conversation.name }}</span>
        <span v-if="conversation.unreadCount" class="badge">{{ conversation.unreadCount }}</span>
      </div>
    </template>
  </em-conversation-container>
</template>
```

## Header 菜单定制

Header `+` 菜单默认提供「新建会话 / 添加联系人 / 创建群组」三项，通过 `menu-items` prop 注入自定义项（`ConversationHeaderMenuItem[]`），或 `#header-menu` 插槽整体接管：

```vue
<script setup lang="ts">
import type { ConversationHeaderMenuItem } from '@easemob/uikit-im'

// 自定义菜单项：未提供 handler 的项点击触发 header-menu-action 事件
const menuItems: ConversationHeaderMenuItem[] = [
  { key: 'newChat', label: '新建会话', icon: 'bubble/rect/empty' },
  { key: 'joinGroup', label: '加入群组', icon: 'person/plus', handler: (key) => openMyJoinGroup() },
]
</script>

<template>
  <em-conversation-container :menu-items="menuItems" @header-menu-action="onHeaderMenuAction" />
</template>
```

- 不传 `menu-items`：使用内置三项
- 传空数组：隐藏菜单入口
- 自定义项命中内置 key（`newChat` / `addContact` / `createGroup`）且未提供 handler 时，仍走内置弹窗
- 传 `#header-menu` 插槽：整个菜单区域（触发按钮 + 弹出层）由业务方渲染，作用域提供 `{ menuItems, open, close }`

## 弹窗接管

接入方接自己的选人器 / 好友体系 / 企业通讯录时，可通过 `#new-chat` / `#add-contact` / `#create-group` 插槽分别接管三个弹窗：

```vue
<template>
  <em-conversation-container>
    <!-- 接管「新建会话」弹窗：点击 + 菜单的新建会话时打开业务自己的选人器 -->
    <template #new-chat="{ show, open, close }">
      <MyPicker v-model:show="show" @confirm="onPick">…</MyPicker>
    </template>
  </em-conversation-container>
</template>
```

作用域提供 `show`（当前是否显示）、`open`（打开）、`close`（关闭）三个句柄，业务可完全控制弹窗渲染与开关。

## 会话分栏

会话列表内置「全部 / 未读 / @我 / 单聊 / 群组」五种分栏 tab，按需展示会话。

### 半接管：通过 props 控制

把 `tabs` / `active-tab` 绑定到组件上，tab 栏渲染走内置样式：

```vue
<script setup lang="ts">
import { useConversationTabs } from '@easemob/uikit-im'

// 业务只有单聊/群聊，不区分更多类型
const { tabs, activeTab } = useConversationTabs({ tabs: ['single', 'group'] })
</script>

<template>
  <em-conversation-container v-model:active-tab="activeTab" :tabs="tabs" />
</template>
```

- `tabs` 为空数组时隐藏 tab 栏
- 顺序即渲染优先级，例如 `['group', 'single']` 会把群组排到前面
- `activeTab` 支持 `v-model:active-tab` 双向绑定，可在业务侧同步切换状态

### 完全接管：通过 #tabs 插槽自绘

传入 `#tabs` 插槽后，tab 栏完全由业务方渲染，作用域提供 `tabs` / `activeTab` / `selectTab`：

```vue
<template>
  <em-conversation-container
    v-model:active-tab="activeTab"
    :tabs="tabs"
  >
    <template #tabs="{ tabs: tabList, activeTab: current, selectTab }">
      <div class="my-tabs">
        <button
          v-for="tab in tabList"
          :key="tab"
          :class="{ active: tab === current }"
          @click="selectTab(tab)"
        >
          {{ tabLabel(tab) }}
        </button>
      </div>
    </template>
  </em-conversation-container>
</template>
```

### 类型与常量

- `ConversationTabKey`：`'all' | 'unread' | 'atMe' | 'single' | 'group'`
- `DEFAULT_CONVERSATION_TABS`：默认 tab 集合常量（顺序即渲染优先级）
- `ConversationTabsSlotScope`：`#tabs` 插槽作用域类型 `{ tabs, activeTab, selectTab }`
- `useConversationTabs(options)`：分栏状态 hook，返回 `{ tabs, activeTab, selectTab, isActive }`

## 状态横幅

断网、连接中或同步中时，搜索栏下方会展示内置状态横幅（默认开启，`show-status-banner` 可关闭）：

- 断网：error 样式，可点击，点击触发 `reconnect` 事件，由业务方决定重连策略
- 连接中：warning 样式 + loading 图标
- 会话/消息同步中：info 样式

需要自定义横幅时使用 `#status-banner` 插槽，接收当前状态（`visible` / `type` / `loading` / `title` / `description` / `clickable`）自行渲染；内置横幅基于 [StatusBanner 组件](./status-banner) 实现。

## 进阶

- 会话项右侧操作（置顶 / 免打扰 / 删除）通过长按（H5）或右键（PC）触发，菜单行为由组件内置。
- 草稿功能开启后，输入框内容会按 `draftStorage` 模式持久化，重新进入会话自动恢复。

<script setup>
import { conversationPlaygroundFiles } from './conversation-container/demo/playground/template'
</script>
