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

## API

<!-- @include: ../.vitepress/gen/presence-selector.md -->
