# ChatroomContainer 聊天室容器

`EmChatroomContainer` 是聊天室场景的页面容器：负责加入/退出房间、历史消息、
消息收发、成员面板、系统通知，并把每个 UI 边界开放为命名插槽。
场景 = 纯配置（`scene` prop）+ 插槽覆盖，变种时优先插槽、其次 config、最后才考虑 fork。

> 完整能力评估见仓库根目录 [CHATROOM-CAPABILITY-REVIEW.md](https://github.com/Easemob-Community/easemob-uikit-vue/blob/main/CHATROOM-CAPABILITY-REVIEW.md)。

## 快速接入

```vue
<script setup lang="ts">
import { useChatroomProvider, EmChatroomContainer } from '@easemob/uikit-chatroom'
useChatroomProvider({ appKey })
</script>

<template>
  <EmChatroomContainer room-id="room123" scene="live" auto-join />
</template>
```

## API

<!-- @include: ../../.vitepress/gen/chatroom/chatroom-container.md -->

> 插槽 scope 与默认内容见下方「插槽说明」表（gen 表仅列插槽名）。

### 场景配置（`ChatroomSceneConfig`，可经 `scene` 传部分覆盖）

```ts
interface ChatroomSceneConfig {
  name: 'live' | 'voice' | 'class' | (string & {})
  layout: 'fullscreen' | 'split' | 'auto'   // 缺省 fullscreen；auto 按视口 <768px 选择
  features: {
    gift?: boolean                 // 礼物栏 / 礼物消息渲染
    micQueue?: boolean             // 麦位管理（语聊房）
    memberList?: 'panel' | 'popup' | 'none'
    announcement?: boolean         // 公告展示
    header?: boolean               // 是否渲染内置顶部栏（缺省 true，见下方「隐藏/重写 header」）
    messageFilter?: (msg) => boolean
    messageArea?: { height?, transparent? }  // 直播消息区限高 + 透明（弹幕叠加画面）
    management?: { mute?, kick?, muteAll?, announcement?, blocklist?, admin? }
    multilineInput?: boolean       // PC 输入条多行（textarea + Shift+Enter）
    keyboard?: boolean             // 键盘快捷键（Esc 关闭弹层）
  }
  panels?: { stageWidth?, memberWidth? }   // split 分栏尺寸
  popupMode?: 'auto' | 'sheet' | 'dialog'  // 弹层形态（缺省 auto）
  themeOverrides?: Record<string, string>  // CSS 变量覆盖（容器根元素应用）
  i18nOverrides?: Record<string, string>   // 文案覆盖（mergeLocaleMessages 并入）
}
```

## 插槽说明

> 插槽名清单与 gen 表一致；下表补充 **scope 与默认内容**（gen 表仅列插槽名）：

| 插槽 | scope | 默认内容 | 覆盖粒度 |
|---|---|---|---|
| `header` | `{ status, room-info, on-exit }` | `ChatroomHeader` | 整条（完全重写） |
| `header-title` | `{ room-info }` | 房间名 | 标题区 |
| `header-extra` | `{ room-info }` | 无 | 右侧扩展区 |
| `toolbar` | `{ status }` | 无 | header 与消息区之间的业务工具条 |
| `manage-actions` | `{ can-manage, is-owner, current-role }` | 无 | 管理位操作条（仅 owner/admin 可见） |
| `stage` | `{ status, room-info }` | 无 | split 舞台区（视频/白板/商品区） |
| `mic-queue` | — | `ChatroomMicQueue` | 麦位栏 |
| `notice` | `{ content }` | `ChatroomNoticeBanner` | 公告条 |
| `message-item` | `{ message }` | `ChatroomMessageItem` | 单条消息渲染 |
| `message-custom` | `{ message }` | 兜底渲染 | custom 消息优先渲染 |
| `message-list` | `{ messages, status, history-has-more, loading-history, load-more }` | 加载更多 + VirtualList + 空态 | **消息列表整块替换**（滚动/加载职责转移业务） |
| `empty` | `{ status }` | 「未进房/暂无消息」 | 消息区空态 |
| `gift-bar` | `{ disabled }` | `ChatroomGiftBar` | 礼物栏 |
| `input-bar` | `{ disabled }` | `ChatroomInputBar` | 输入条 |
| `member-panel` | `{ show, on-close }` | `ChatroomMemberPanel` | 成员面板整层 |
| `member-item` | 透传 | `ChatroomMemberItem` | 成员列表项 |
| `member-sidebar` | — | `ChatroomMemberSidebar` | PC 常驻成员侧栏 |
| `terminal` | `{ status, kicked, destroyed, on-exit }` | 被踢/解散提示 | 终态视图 |
| `announcement-editor` | `{ show, content, save, close }` | 内置编辑弹窗 | 公告编辑弹窗 |

## 隐藏 / 重写 header

接入方自绘导航头（如直播间顶部栏）时，容器内置 `ChatroomHeader`（返回 + 房间名 + 人数 + 退出）
可能与业务头部重叠。三种接管形态：

```vue
<!-- 1. 完全重写：header 插槽替换内置（header-title / header-extra 可局部覆盖） -->
<EmChatroomContainer room-id="r1" scene="custom">
  <template #header="{ roomInfo, onExit }">
    <MyRoomHeader :room="roomInfo" @exit="onExit" />
  </template>
</EmChatroomContainer>

<!-- 2. 隐藏内置 + 容器内接管：features.header: false，插槽仍渲染 -->
<EmChatroomContainer room-id="r1" :scene="{ name: 'custom', features: { header: false } }">
  <template #header="{ roomInfo }">
    <MyRoomHeader :room="roomInfo" />
  </template>
</EmChatroomContainer>

<!-- 3. 完全无头区：features.header: false，自绘头部放容器外 -->
<EmChatroomContainer room-id="r1" :scene="{ name: 'custom', features: { header: false } }" />
```

## 消息列表整体替换（容器内弹幕形态）

直播场景若要在容器内把普通消息流换成弹幕/轨道渲染，用 `#message-list` 插槽整体接管
（提供后容器不再渲染 VirtualList/空态/加载更多，滚动跟随与加载职责转移给业务）：

```vue
<EmChatroomContainer room-id="r1" scene="live">
  <template #message-list="{ messages, loadMore, historyHasMore, loadingHistory }">
    <button v-if="historyHasMore" :disabled="loadingHistory" @click="loadMore">加载更多</button>
    <div class="my-danmaku">
      <div v-for="msg in messages" :key="msg.msgLocalId || msg.msgServerId" class="my-danmaku__item">
        <b>{{ msg.from }}</b>：{{ (msg.body as any)?.content }}
      </div>
    </div>
  </template>
</EmChatroomContainer>
```

## 相关文档

- [直播弹幕流 DanmakuStream](./live-danmaku)
- [PC 模式组件（split / 成员侧栏 / 右键菜单）](./pc-mode-components)
- [双 UIKit 架构](../guide/architecture)
- [权限模型与业务角色](../guide/permissions-roles)
