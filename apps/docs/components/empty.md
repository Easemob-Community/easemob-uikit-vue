# Empty 空状态

列表、页面无数据时的空状态占位组件，内置 IM 场景图标。

## 使用方式

组件以 `EmEmpty` 为名导出，全局注册后可直接使用：

```vue
<template>
  <em-empty icon="empty/contact" title="暂无联系人" description="你可以通过搜索添加新的联系人" />
</template>
```

## 业务场景

<demo src="./demo/scenes.vue" title="业务场景" desc="联系人、聊天、群组三种 IM 内置空态图标与文案。" />

## 尺寸与插槽

<demo src="./demo/sizes.vue" title="尺寸与插槽" desc="small / normal / large 三种尺寸；description 插槽支持自定义内容与操作按钮。" />

## API

<!-- @include: ../.vitepress/gen/empty.md -->
