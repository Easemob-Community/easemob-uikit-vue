# PresenceAvatar 在线状态头像

带在线状态指示的头像组件，状态数据由 Presence 服务订阅而来，支持点击切换自己的状态。

## 使用方式

组件以 `EmPresenceAvatar` 为名导出，全局注册后可直接使用。状态依赖 `EmUIKitProvider` 的 Presence 能力，需要包裹在 Provider 内：

```vue
<template>
  <EmUIKitProvider :auto-init="false" :enable-presence="true">
    <em-presence-avatar user-id="u_alice" name="Alice" :size="40" />
  </EmUIKitProvider>
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="通过 user-id 订阅在线状态，自动渲染 online / busy / away / offline 指示器；文档站使用 mock 数据源演示。" />

## 可编辑状态

<demo src="./demo/editable.vue" title="可编辑状态" desc="editable 模式下点击头像右下角指示器，可在头像下方打开在线状态选择 popup。" />

## API

<!-- @include: ../.vitepress/gen/presence-avatar.md -->
