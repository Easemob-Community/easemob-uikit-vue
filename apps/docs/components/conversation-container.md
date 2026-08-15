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
