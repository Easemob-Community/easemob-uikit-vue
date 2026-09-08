# Switch 开关

开关选择器，用于在两个互斥状态（开 / 关）之间切换，支持双尺寸与禁用状态。

## 使用方式

组件以 `EmSwitch` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-switch v-model="enabled" />
</template>

<script setup>
import { ref } from 'vue'

const enabled = ref(true)
</script>
```

## 尺寸

<demo src="./demo/sizes.vue" title="尺寸" desc="通过 size 属性切换 medium（默认 36×20）/ small（28×16）两种尺寸；也可覆盖 --uikit-switch-track-* 主题变量全局自定义宽高。" />

## 状态

<demo src="./demo/states.vue" title="禁用状态" desc="disabled 禁用后不可点击，开 / 关两种取值均有对应的弱化样式。" />

## 事件

<demo src="./demo/events.vue" title="切换事件" desc="点击切换时同步 v-model 并触发 change 事件，负载为切换后的新值。" />

## 使用建议

| ✅ Do | ❌ Don't |
| --- | --- |
| 用于即时生效的设置项（如消息免打扰、已读回执） | 用于需要提交确认才生效的表单字段 |
| 配合文字标签说明开关控制的含义 | 单独放置开关让用户猜测用途 |
| 空间有限时使用 `size="small"` | 在同一列表中混用两种尺寸 |

## API

<!-- @include: ../.vitepress/gen/switch.md -->
