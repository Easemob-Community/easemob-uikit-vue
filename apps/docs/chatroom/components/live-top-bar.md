# ChatroomLiveTopBar 直播顶部栏

直播间顶部的红色渐变信息横幅：左侧主播头像 + 直播间标题 + 🔥热度，右侧更多 / 投诉按钮。
纯 UI 壳子（props + 插槽驱动），业务可注入分享、关注、在线数等自定义动作。

## 使用方式

组件以 `ChatroomLiveTopBar` 为名导出（具名导出，按需 import），可脱离容器独立使用：

```vue
<script setup lang="ts">
import { ChatroomLiveTopBar } from '@easemob/uikit-chatroom'
</script>

<template>
  <ChatroomLiveTopBar title="会员年中福利" avatar-url="..." heat="1.4万">
    <!-- 右侧动作区：分享 / 关注 / 在线数等（在更多、投诉按钮之后） -->
    <template #extra>
      <button @click="share">分享</button>
    </template>
  </ChatroomLiveTopBar>
</template>
```

## 运行示例

<demo src="./demo/live-top-bar.vue" title="直播顶部栏" desc="红色渐变横幅 + 右侧动作区；点击「分享」演示 `#extra` 插槽。纯 UI 演示，无需登录。" />

## API

::: v-pre
<!-- @include: ../../.vitepress/gen/chatroom/chatroom-live-top-bar.md -->
:::

## 插槽说明

| 插槽 | scope | 说明 |
| --- | --- | --- |
| `#extra` | — | 右侧动作区（更多 / 投诉按钮之后）：分享 / 关注 / 在线数等业务动作 |

## 相关文档

- [ChatroomLiveInputBar 直播间输入条](./live-input-bar)
- [ChatroomLiveDanmakuStream 直播弹幕流](./live-danmaku)
- [ChatroomContainer 聊天室容器](./chatroom-container)
