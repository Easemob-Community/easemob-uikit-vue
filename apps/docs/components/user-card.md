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

## API

<!-- @include: ../.vitepress/gen/user-card.md -->
