# PresenceSelector 在线状态选择器

在线状态选择器，供用户在 在线 / 忙碌 / 离开 / 自定义 之间切换自己的状态。

## 使用方式

组件以 `EmPresenceSelector` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
function onSelect(status: 'online' | 'busy' | 'away' | 'custom', ext: string) {
  console.log(status, ext)
}
</script>

<template>
  <em-presence-selector @select="onSelect" />
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="选择状态后触发 select 事件（状态值 + 附加文案）；cancel 事件在取消时触发。" />

## 自定义

<demo src="./demo/custom.vue" title="自定义" desc="value 预设当前状态文案；show-custom 关闭自定义状态选项。" />

## 弹窗 / 弹出层形态

`EmPresenceSelector` 还有两个业务封装形态（实现于 `@easemob-community/uikit-core`，经 `@easemob-community/uikit-im` 具名 re-export，`app.use(UIKit)` 全局注册后可直接使用；均依赖登录态，自动向 SDK 发布状态变更）：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const showModal = ref(false)

// 弹出层形态：锚定任意触发元素（如头像）
const showPopup = ref(false)
const triggerRef = ref<HTMLElement>()
</script>

<template>
  <!-- 弹窗形态 -->
  <em-presence-selector-modal v-model:show="showModal" />

  <!-- 弹出层形态 -->
  <button ref="triggerRef" @click="showPopup = true">切换状态</button>
  <em-presence-selector-popup
    v-model:show="showPopup"
    :anchor="triggerRef"
    @changed="/* 状态发布成功，可刷新本地指示器 */"
  />
</template>
```

### EmPresenceSelectorModal

居中弹窗形态：选择后**保持弹窗开启**，让用户看到已切换的状态，点击遮罩或关闭按钮再关闭（无 `changed` 事件）。

<!-- @include: ../.vitepress/gen/presence-selector-modal.md -->

### EmPresenceSelectorPopup

无遮罩锚定弹出层形态：选择后自动关闭；「自定义」状态走独立的输入弹窗（最多 32 字），状态发布成功后触发 `changed`。

<!-- @include: ../.vitepress/gen/presence-selector-popup.md -->

## API

<!-- @include: ../.vitepress/gen/presence-selector.md -->
