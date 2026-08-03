# Button 按钮

常用操作按钮，支持语义类型、尺寸、加载与禁用等状态。

## 使用方式

组件以 `EmButton` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-button type="primary">发送消息</em-button>
</template>
```

## 语义类型

<demo src="./demo/types.vue" title="语义类型" desc="通过 type 属性切换 primary / success / warning / danger / danger-outline / default 六种语义。" />

## 尺寸

<demo src="./demo/sizes.vue" title="尺寸" desc="通过 size 属性切换 small / medium / large 三种尺寸。" />

## 状态

<demo src="./demo/states.vue" title="状态" desc="disabled 禁用、loading 加载中、block 通栏三种常用状态。" />

## 事件

<demo src="./demo/events.vue" title="点击事件" desc="点击按钮触发 click 事件；loading 状态下自动拦截点击。" />

## API

<!-- @include: ../.vitepress/gen/button.md -->
