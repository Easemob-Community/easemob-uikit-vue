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

<demo src="./demo/types.vue" title="语义类型" desc="通过 type 属性切换 primary / success / warning / danger / danger-outline / outline / default 七种语义；`pill` 可叠加全圆角形态。" />

## 尺寸

<demo src="./demo/sizes.vue" title="尺寸" desc="通过 size 属性切换 small / medium / large 三种尺寸。" />

## 状态

<demo src="./demo/states.vue" title="状态" desc="disabled 禁用、loading 加载中、block 通栏三种常用状态。" />

## 事件

<demo src="./demo/events.vue" title="点击事件" desc="点击按钮触发 click 事件；loading 状态下自动拦截点击。" />

## 使用建议

| ✅ Do | ❌ Don't |
| --- | --- |
| 主操作使用 `type="primary"`，次操作使用 `type="default"` | 同一区域出现多个 primary 按钮 |
| 删除、退群等不可逆操作使用 `type="danger"` | 用 primary 按钮表达危险语义 |
| 按钮文案使用动词，如「发送」「保存」「删除」 | 使用「确定」「点击这里」等模糊文案 |
| 表单提交等耗时操作用 `loading` 状态反馈 | 点击后无任何状态变化 |
| 移动端 bottom sheet 中的主操作可用 `block` 通栏 | 在狭窄空间并排多个 large 按钮 |

## API

<!-- @include: ../.vitepress/gen/button.md -->
