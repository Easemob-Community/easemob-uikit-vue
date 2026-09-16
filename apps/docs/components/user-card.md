# UserCard 用户卡片

展示用户信息的卡片组件，支持在线状态、操作按钮与信息行配置，适用于聊天侧边栏、通讯录详情等场景。

## 使用方式

组件以 `EmUserCard` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-user-card user-id="user_001" name="张三" avatar="https://..." />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="传入 user-id / name / avatar 即可渲染用户卡片。" />

## 在线状态

<demo src="./demo/status.vue" title="在线状态" desc="status 支持 online / busy / custom 等状态，在头像右下角渲染状态指示器。" />

## 操作与信息行

<demo src="./demo/actions.vue" title="操作与信息行" desc="actions 配置底部操作按钮（含图标与语义色）；info-rows 配置信息行，clickable 行可点击并触发 info-click 事件。" />

## 弹窗形态 EmUserCardModal

`EmUserCardModal` 是用户卡片的弹窗形态：在 `EmUserCard` 之上封装数据加载与联系人操作（加好友 / 删除 / 拉黑 / 备注编辑），按查看对象自动呈现自己档 / 好友档 / 陌生人档。默认居中弹窗；传入 `anchor` 后改为相对触发元素的无遮罩弹出（仅桌面端，移动端一律回落为底部抽屉）。依赖登录态，需在 `EmUIKitProvider` 内使用。

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
const userId = 'user_001'

function onSendMessage(id: string) {
  // 跳转到与该用户的会话
}
</script>

<template>
  <em-user-card-modal
    v-model:show="show"
    :user-id="userId"
    @send-message="onSendMessage"
  />
</template>
```

打开弹窗时自动拉取在线状态与黑名单；`enableAudioAction` / `enableVideoAction` 仅展示语音 / 视频通话入口（SDK 无 RTC 能力），点击后抛 `audio-call` / `video-call` 事件，通话能力由消费方实现。

<!-- @include: ../.vitepress/gen/user-card-modal.md -->

> `send-message` / `deleted` 触发后会自动关闭弹窗。

## API

<!-- @include: ../.vitepress/gen/user-card.md -->
