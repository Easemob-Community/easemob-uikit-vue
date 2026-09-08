# 聊天模块

聊天容器，提供完整的会话聊天页：消息列表（虚拟滚动）、输入区（文本 / 表情 / 图片 / 文件 / 语音）、消息操作（引用、复制、撤回、翻译、多选转发）与群组相关能力，数据由 Provider 统一管理。

## 使用方式

组件以 `EmChatContainer` 为名导出。需与 `EmConversationContainer` 配合 `EmUIKitProvider` 使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit-im'
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
  >
    <div style="display: flex; height: 100vh;">
      <div style="width: 320px; flex-shrink: 0;">
        <em-conversation-container />
      </div>
      <div style="flex: 1;">
        <em-chat-container />
      </div>
    </div>
  </EmUIKitProvider>
</template>
```

> 聊天容器会跟随 `useConversation()` 中的当前会话自动切换：点击左侧会话列表（`conversation-select`）后，聊天页即开始加载对应会话的消息。

## 在线代码演练场

直接编辑下面的代码（`config.input` 配置对象与 mock 消息数据），输入回车或点发送可在下方消息列表回显，点「重置代码」恢复初始模板：

<VuePlayground :files="chatContainerPlaygroundFiles" title="聊天容器配置在线演练场" id="chat-container" />

## API

<!-- @include: ../.vitepress/gen/chat-container.md -->

### 容器级 Props（仅 `EmChatContainer`）

上表由 `EmChat` 模块生成；`EmChatContainer` 另提供容器外壳档位：

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| variant | `'compact' \| 'card'` | `'compact'` | 容器风格：`compact` 平铺无圆角（背景 `--uikit-chat-bg` 铺满，适合自行排版）；`card` 圆角卡片（圆角跟随 `--uikit-components-radius`，细边框 `--uikit-border-light`，灰底与间距由宿主布局提供），与 `EmConversationContainer` 的 `variant` 同口径 |

## 插槽说明

- `empty`：无会话时展示的空状态
- `loading`：全局加载状态
- `error`：错误边界，接收插槽属性 `{ error, retry }`
- `header` / `header-avatar` / `header-title` / `header-extra`：会话头部区域自定义
- `drawer`：整块接管聊天信息抽屉，作用域见下方「抽屉接管」
- `drawer-*`：部分接管 `ChatInfoDrawer` 内部区块，如 `#drawer-profile`、`#drawer-members`、`#drawer-footer` 等，作用域见下方「抽屉接管」
- `message-*`：消息类型级插槽，如 `#message-txt`、`#message-footer-txt`，可自定义各类消息的渲染
- `toolbar-extra` / `input-panel`：输入区扩展（AI 助手入口、快捷回复面板等，作用域见 `useChatPlugin`）
- `message-action-extra`：消息操作菜单底部扩展
- `message-action-menu`：完全接管消息操作菜单内容（PC 右键 Popup 与 H5 长按 ActionSheet 双端生效），作用域提供 `{ message, actions, select, close }`（见下方「消息操作菜单接管」）
- `user-card` / `group-card`：分别接管用户 / 群名片弹窗渲染，作用域提供 `{ show, open, close, userId/groupId }`（见下方「弹窗接管」）
- `invite-member`：接管入群邀请弹窗渲染，作用域提供 `{ show, groupId, existingMemberIds, open, close }`
- `forward`：接管转发弹窗渲染，作用域提供 `{ show, messages, mode, open, close }`；`open(messages, mode?)` 需传入待转发的消息数组（单条默认逐条转发，多条默认合并转发）
- `message-search`：接管消息搜索弹窗渲染，作用域提供 `{ show, config, locate, open, close }`
- `multi-select-bar`：接管多选操作栏渲染，作用域提供 `{ visible, selectedMessages, totalMessages, selectAll, deselectAll, forwardOneByOne, forwardCombine, delete, close }`
- `watermark`：水印覆盖层，铺满整个聊天区（含空状态），`pointer-events: none` 不响应交互，作用域提供 `{ conversation }`；内容由用户注入（文字平铺 / canvas / 图片均可）

水印注入示例（UIKit 只提供铺满、穿透的覆盖层壳，平铺与样式由业务实现）：

```vue
<EmChatContainer>
  <template #watermark="{ conversation }">
    <div class="my-watermark">
      {{ userName }} {{ conversation?.conversationId }}
    </div>
  </template>
</EmChatContainer>

<style>
.my-watermark {
  width: 100%;
  height: 100%;
  /* 业务自行实现平铺：repeating background / canvas / flex 平铺均可 */
  opacity: 0.08;
}
</style>
```

## 消息操作菜单接管

消息右键（PC）/ 长按（H5）菜单默认由内置动作集合（引用/复制/转发/多选/翻译/置顶/撤回/编辑/删除等）按消息类型裁剪生成。通过 `#message-action-menu` 插槽可完全接管菜单内容——例如插入自定义主菜单项（举报/收藏/业务菜单）或整体改分组/顺序：

```vue
<template>
  <em-chat-container>
    <!-- actions：内置动作列表；select：触发内置动作（含关闭菜单）；close：关闭菜单 -->
    <template #message-action-menu="{ message, actions, select, close }">
      <div class="my-action-menu">
        <button v-for="action in actions" :key="action.type" @click="select(action.type, action)">
          {{ action.label }}
        </button>
        <button @click="report(message)">举报</button>
      </div>
    </template>
  </em-chat-container>
</template>
```

- `select(actionType, action?)`：触发内置动作（内部自动关闭菜单并执行引用/转发/置顶等逻辑）
- `close()`：关闭菜单
- 插槽提供时，PC Popup 与 H5 ActionSheet 双端均接管；H5 端默认 actions 列表自动隐藏

## 弹窗接管

聊天页内置的名片、邀请、转发、搜索、多选栏等子界面均支持接管（默认内容 = 内置实现，不传插槽行为不变）：

```vue
<template>
  <em-chat-container>
    <!-- 名片弹窗：点头像/右键头像时打开业务自己的资料卡 -->
    <template #user-card="{ show, userId, open, close }">
      <MyUserCard v-model:show="show" :user-id="userId" @send-message="onSend" />
    </template>
    <!-- 多选栏：自定义多选底部操作 -->
    <template #multi-select-bar="{ visible, selectedMessages, forwardOneByOne, delete, close }">
      <div v-if="visible" class="my-select-bar">
        <span>已选 {{ selectedMessages.length }} 条</span>
        <button @click="forwardOneByOne">转发</button>
        <button @click="delete(selectedMessages)">删除</button>
        <button @click="close">取消</button>
      </div>
    </template>
    <!-- 转发弹窗：open(messages, mode?) 必须传入消息数组 -->
    <template #forward="{ show, messages, mode, open, close }">
      <MyForwardModal v-if="show" :messages="messages" :mode="mode" @forward="open($event.messages, $event.mode); close()" @cancel="close" />
    </template>
  </em-chat-container>
</template>
```

## 抽屉展示模式

通过 `config.drawer` 控制聊天信息抽屉的展示方式：

```vue
<EmChatContainer :config="{ drawer: { mode: 'push', width: 320 } }" />
```

| 配置项         | 类型                    | 默认值    | 说明                                                                                       |
| -------------- | ----------------------- | --------- | ------------------------------------------------------------------------------------------ |
| `drawer.mode`  | `'overlay' \| 'push'`   | `'push'`  | `push` 占位挤压聊天区，抽屉为与聊天区平级的独立平面区域（带动画）；`overlay` 完全遮挡聊天区 |
| `drawer.width` | `number`                | `320`     | 抽屉宽度（px），两种模式均生效                                                             |

说明：

- `push` 模式下抽屉圆角跟随 `--uikit-components-radius`（与 ChatContainer 边角一致），与主区间隔 `--uikit-container-gap` 透出宿主底色；抽屉整页背景与聊天容器统一为 `--uikit-chat-bg`（header/body/各 section 均拉平，无分层色块）；此模式无遮罩、点击外部不关闭，`offsetTop` 语义失效（抽屉全高）。
- 移动端（viewport < 768px）两种模式一律回落为满铺全屏（盖住 header、圆角归零、返回箭头替代关闭按钮），呈独立页面观感。
- 自绘壳 `EmChatDrawer` 同样支持 `mode` / `fullscreen` props（见下方抽屉接管）。

## 抽屉接管

`EmChatContainer` / `EmChat` 提供三种抽屉接管能力，满足从「整体替换」到「局部定制」的不同需求。

### 1. 整块接管 `#drawer`

完全替换默认的聊天信息抽屉，自己控制开合与内容。常用于需要自绘资料卡/业务信息的场景。

```vue
<script setup lang="ts">
import { EmChatContainer, EmChatDrawer } from '@easemob/uikit-im'
</script>

<template>
  <EmChatContainer>
    <template #drawer="{ conversation, isGroup, show, close, offsetTop }">
      <EmChatDrawer :show="show" :overlay="false" :offset-top="offsetTop" @update:show="close">
        <div style="padding: 16px;">
          <h3>{{ conversation?.name }}</h3>
          <p>{{ isGroup ? '群聊' : '单聊' }} ID: {{ conversation?.id }}</p>
          <button @click="close">
            关闭
          </button>
        </div>
      </EmChatDrawer>
    </template>
  </EmChatContainer>
</template>
```

**作用域：**

| 属性           | 类型                                  | 说明                                |
| -------------- | ------------------------------------- | ----------------------------------- |
| `conversation` | `UiConversation \| null \| undefined` | 当前会话                            |
| `isGroup`      | `boolean`                             | 是否群聊                            |
| `show`         | `boolean`                             | 抽屉是否打开                        |
| `open`         | `() => void`                          | 打开抽屉                            |
| `close`        | `() => void`                          | 关闭抽屉                            |
| `offsetTop`    | `number`                              | 抽屉顶部偏移（header 实际高度，px；push/全屏模式忽略） |
| `mode`         | `'overlay' \| 'push'`                 | 抽屉展示模式（来自 `config.drawer.mode`）              |
| `fullscreen`   | `boolean`                             | 是否全屏模式（移动端窄屏自动为 true）                  |

### 2. 部分接管 `drawer-*`

只重写抽屉内单个区块（如成员列表、群管理、footer），其余保持默认。

```vue
<EmChatContainer>
  <template #drawer-footer="{ conversation, isGroup, close }">
    <div style="padding: 16px;">
      <button @click="close">返回聊天</button>
    </div>
  </template>
</EmChatContainer>
```

可用 section 插槽：

| 插槽名                 | 覆盖区块                    | 显示条件               |
| ---------------------- | --------------------------- | ---------------------- |
| `drawer-header`        | 标题栏（返回/关闭）         | 恒显示                 |
| `drawer-profile`       | 头像/名称/群名群描述编辑/ID | 恒显示                 |
| `drawer-remark`        | 单聊备注                    | 仅单聊                 |
| `drawer-announcement`  | 群公告                      | 仅群聊                 |
| `drawer-members`       | 群成员九宫格 + 查看全部     | 仅群聊                 |
| `drawer-admin-actions` | 转让群主/设置管理员         | 仅群聊 + 群主          |
| `drawer-management`    | 群管理 section              | 仅群聊                 |
| `drawer-actions`       | 清空聊天记录等通用操作      | 恒显示                 |
| `drawer-footer`        | 退出/解散/删除好友          | 恒显示（非成员列表页） |
| `drawer-member-detail` | 群成员列表二级页            | 二级页打开时           |

Section 插槽统一作用域：

| 属性            | 类型                                  | 说明                        |
| --------------- | ------------------------------------- | --------------------------- |
| `conversation`  | `UiConversation \| null \| undefined` | 当前会话                    |
| `isGroup`       | `boolean`                             | 是否群聊                    |
| `groupId`       | `string`                              | 群 ID（非群聊时为空字符串） |
| `group`         | `UiGroup \| undefined`                | 当前群信息                  |
| `members`       | `UiGroupMember[]`                     | 群成员列表                  |
| `memberCount`   | `number`                              | 群成员数                    |
| `currentUserId` | `string`                              | 当前登录用户 ID             |
| `isOwner`       | `boolean`                             | 当前用户是否为群主          |
| `isAdmin`       | `boolean`                             | 当前用户是否为管理员        |
| `canAddMember`  | `boolean`                             | 当前用户是否可添加成员      |
| `loadingGroup`  | `boolean`                             | 群信息加载中                |
| `close`         | `() => void`                          | 关闭抽屉                    |

### 3. 自绘壳 `EmChatDrawer`

若只想使用通用抽屉壳（overlay / 偏移 / header/body/footer 插槽），可直接引入 `EmChatDrawer`：

```vue
<script setup lang="ts">
import { EmChatDrawer } from '@easemob/uikit-im'
</script>

<template>
  <EmChatDrawer :show="true" :overlay="true" :width="360" :offset-top="56">
    <template #header>
      自定义标题
    </template>
    <div>自定义内容</div>
    <template #footer>
      自定义底部
    </template>
  </EmChatDrawer>
</template>
```

> 注意：section 插槽被接管后，对应内置交互不再触发（如接管 `drawer-members` 后，成员事件需由用户自行处理）。

## 流式消息（AI）

内核已内置流式消息（Stream Message）的**数据链路与纯文本流式状态**，开箱即用：

- `onStreamMessage` 分片按 `msgServerId` 合并到同一条气泡，`body.content` 以 `fullText` 幂等覆盖，不产生新气泡；
- `customType='text'`（或缺省）：传输中尾部打字机光标、完成态收敛、异常态提示；
- 流式内容增长时消息列表自动跟随滚动（仅位于底部时）。

`customType='markdown'` 等富格式流式内容由插件通过 `#message-txt` 插槽接管渲染（内核无感，不引入 markdown 依赖）：

```vue
<em-chat-container :config="chatConfig">
  <template #message-txt="{ message }">
    <MyMarkdownMessage :message="message" />
  </template>
</em-chat-container>
```

完整的插件气泡参考实现与 AI 接入三模式（Mock / 直连 / 业务代理）见 [AI 流式消息](../guide/ai-stream-message)。

## 实例方法

- `setText(text)`：设置输入框内容
- `getText()`：读取输入框当前内容

## 进阶

- 消息列表为虚拟滚动，长会话列表性能有保障；切换会话自动重置滚动位置与多选状态。
- 引用、翻译、语音转文字、消息定位（搜索跳转）等能力由 `useChat()` 等组合式函数暴露，可在业务代码中直接调用。
- 想直观体验 `config.messageList` 各项视觉配置（布局、头像、时间戳、气泡形状、间距、消息状态）的实时效果，请前往[消息列表在线代码演练场](./message-list)。

## 插件机制

`EmChatContainer` 提供了**插槽 + `useChatPlugin()`** 组合的插件体系，允许开发者在聊天输入区、消息列表区中注入自定义 UI 与交互逻辑，扩展出新的消息类型或功能面板。Demo 工程中的「快捷回复面板」与「用户名片发送」就是基于这套体系实现的。

### 扩展点概览

```
┌─ EmChatContainer ────────────────────────────────────────────────┐
│  ┌─ header 区域 ──────────────────────────────────────────────┐  │
│  │  #header / #header-avatar / #header-title / #header-extra  │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─ 消息列表 ─────────────────────────────────────────────────┐  │
│  │  #message-*（类型级插槽，如 #message-custom）               │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌─ 消息输入区 ───────────────────────────────────────────────┐  │
│  │  #toolbar-extra ─→ 扩展工具栏按钮（如快捷回复、名片入口）   │  │
│  │  #input-panel   ─→ 自定义面板（如快捷回复面板）             │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### useChatPlugin()

`useChatPlugin()` 是插件组件与 UIKit 聊天的桥梁。在 `EmChatContainer` 的插槽内调用它即可获取当前会话上下文、消息发送能力与输入框操作方法。

| 属性 / 方法                | 类型                                           | 说明                           |
| -------------------------- | ---------------------------------------------- | ------------------------------ |
| `currentConversation`      | `ComputedRef<UiConversation \| null>`          | 当前正在聊天的会话对象         |
| `currentUserId`            | `ComputedRef<string \| null>`                  | 当前登录用户 ID                |
| `send.sendTextMessage`     | `(text, ext?) => Promise<any>`                 | 发送文本消息                   |
| `send.sendCustomMessage`   | `(event, params?, ext?) => Promise<any>`       | 发送自定义消息（核心扩展能力） |
| `send.sendImageMessage`    | `(data: File \| string, ext?) => Promise<any>` | 发送图片消息                   |
| `send.sendFileMessage`     | `(file: File, ext?) => Promise<any>`           | 发送文件消息                   |
| `send.sendAudioMessage`    | `(file, duration, ext?) => Promise<any>`       | 发送语音消息                   |
| `send.sendVideoMessage`    | `(file, duration, ext?) => Promise<any>`       | 发送视频消息                   |
| `send.sendLocationMessage` | `(body, ext?) => Promise<any>`                 | 发送位置消息                   |
| `getUserDisplayName`       | `(userId: string) => string`                   | 解析用户展示名称               |
| `getUserAvatar`            | `(userId: string) => string \| undefined`      | 获取用户头像 URL               |
| `setText`                  | `(text: string) => void`                       | 设置输入框文本                 |
| `getText`                  | `() => string`                                 | 读取输入框当前文本             |
| `focus`                    | `() => void`                                   | 聚焦输入框                     |

```ts
import { useChatPlugin } from '@easemob/uikit-im'

const { currentConversation, send, setText } = useChatPlugin()
```

### 插槽 API

#### #toolbar-extra

在输入框工具栏中追加自定义按钮。适用于快捷回复入口、名片发送入口等触发器。

**插槽 Props：**

| 属性          | 类型         | 说明                                      |
| ------------- | ------------ | ----------------------------------------- |
| `togglePanel` | `() => void` | 切换自定义面板（#input-panel）的展开/收起 |
| `showPanel`   | `boolean`    | 当前面板是否展开                          |
| `closePanel`  | `() => void` | 关闭自定义面板                            |

#### #input-panel

在输入框下方渲染自定义面板。面板由 `#toolbar-extra` 中的按钮触发（调用 `togglePanel`），也可通过组件内部逻辑控制。

**插槽 Props：**

| 属性         | 类型         | 说明         |
| ------------ | ------------ | ------------ |
| `showPanel`  | `boolean`    | 面板是否可见 |
| `closePanel` | `() => void` | 关闭面板     |

#### #message-custom

自定义消息类型的渲染映射。当消息列表中遇到 `type === 'custom'` 的消息时，UIKIT 会将渲染委托给此插槽，开发者可在此根据 `body.event` 将不同类型的自定义消息映射到不同的展示组件。

**插槽 Props：**

| 属性      | 类型        | 说明                                                        |
| --------- | ----------- | ----------------------------------------------------------- |
| `message` | `UiMessage` | 当前自定义消息对象（`message.body` 为 `CustomMessageBody`） |

### 完整示例：快捷回复面板

以下示例展示了如何利用 `#toolbar-extra` + `#input-panel` 实现一个客服常用的快捷回复面板。

**Step 1 — 在 chat-container 上注册 slot：**

```vue
<script setup lang="ts">
import { EmChatContainer } from '@easemob/uikit-im'
import DemoQuickReplyPanel from './demo-quick-reply-panel.vue'

const chatContainerRef = ref<InstanceType<typeof EmChatContainer>>()
</script>

<template>
  <EmChatContainer ref="chatContainerRef">
    <!-- 工具栏：追加快捷回复按钮 -->
    <template #toolbar-extra="{ togglePanel }">
      <button title="快捷回复" @click="togglePanel">
        <EmIcon name="chat/3lines_n_arrow" :size="22" />
      </button>
    </template>

    <!-- 面板：快捷回复内容 -->
    <template #input-panel="{ showPanel, closePanel }">
      <DemoQuickReplyPanel
        v-if="showPanel"
        @select="(text) => { chatContainerRef?.setText?.(text); closePanel() }"
      />
    </template>
  </EmChatContainer>
</template>
```

**Step 2 — 实现面板组件（demo-quick-reply-panel.vue）：**

```vue
<script setup lang="ts">
import { useChatPlugin } from '@easemob/uikit-im'

const emit = defineEmits<{ (e: 'select', text: string): void }>()

// 通过 useChatPlugin 获取会话信息
const { currentConversation } = useChatPlugin()

const quickReplies = [
  { label: '您好，请问有什么可以帮您？', text: '您好，请问有什么可以帮您？' },
  { label: '感谢您的咨询，祝您生活愉快！', text: '感谢您的咨询，祝您生活愉快！' },
]

function onSelect(item) {
  emit('select', item.text)
}
</script>

<template>
  <div class="quick-reply-panel">
    <div v-if="!currentConversation" class="empty">
      请先选择一个会话
    </div>
    <div v-else class="reply-list">
      <button
        v-for="item in quickReplies"
        :key="item.label"
        class="reply-item"
        @click="onSelect(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
```

### 完整示例：用户名片消息

名片是自定义消息类型的典型场景 —— 需要同时定义「发送端」（如何选名片并发送）和「展示端」（如何渲染名片气泡）。

**Step 1 — 在 chat-container 上注册 slot：**

```vue
<template>
  <EmChatContainer>
    <!-- 工具栏：追加名片发送按钮 -->
    <template #toolbar-extra>
      <button title="发送名片" @click="showCardPicker = true">
        <EmIcon name="people/person_single" :size="22" />
      </button>
    </template>

    <!-- 展示：自定义消息气泡 -->
    <template #message-custom="{ message }">
      <DemoCardMessage
        v-if="message.body?.event === 'send_card'"
        :message="message"
        @card-click="(uid) => showCardModal(uid)"
      />
    </template>
  </EmChatContainer>
</template>
```

**Step 2 — 发送名片（在工具栏按钮的点击回调中）：**

```ts
import { useChatPlugin } from '@easemob/uikit-im'

const { send } = useChatPlugin()

function sendCard(userId: string) {
  send.sendCustomMessage('send_card', {
    uid: userId,
    nickname: '张三',
    avatar: 'https://...',
  })
}
```

**Step 3 — 渲染名片气泡（DemoCardMessage.vue）：**

```vue
<script setup lang="ts">
import { useUserInfo } from '@easemob/uikit-im'
import type { CustomMessageBody, UiMessage } from '@easemob/uikit-im'

const props = defineProps<{ message: UiMessage }>()
const emit = defineEmits<{ (e: 'card-click', userId: string): void }>()

const body = computed(() => props.message.body as CustomMessageBody)
const uid = computed(() => body.value.params?.uid || '')

// 用 useUserInfo 拉取用户资料
const { displayName, avatarUrl } = useUserInfo(uid)
</script>

<template>
  <div class="card-bubble" @click="emit('card-click', uid)">
    <EmAvatar :src="avatarUrl" :name="displayName" :size="40" />
    <span>{{ displayName || uid }}</span>
    <div class="footer">
      名片
    </div>
  </div>
</template>
```

### 消息类型扩展原理

1. 业务代码通过 `send.sendCustomMessage(event, params, ext)` 发送一条 `type: 'custom'` 的消息，其中 `event` 为自定义类型标识（如 `'send_card'`、`'order_share'`）。
2. 消息列表渲染到该消息时，匹配 `#message-custom` 插槽，将 `UiMessage` 传入。
3. 业务组件在插槽内根据 `message.body.event` 分发到不同的渲染组件（`v-if="event === 'send_card'"`）。

通过这套机制，开发者可以在不修改 UIKIT 源码的前提下，为聊天页面扩展任意自定义消息类型与交互面板。

> **参考 Demo**：`apps/demo/src/components/demo-quick-reply-panel.vue`、`apps/demo/src/components/demo-card-message.vue`、`apps/demo/src/components/demo-card-picker-modal.vue`。

<script setup>
import { chatContainerPlaygroundFiles } from './chat-container/demo/playground/template'
</script>
