# 地址簿容器

地址簿容器是通讯录模块的底层基础组件（`EmContactContainer` 内部即由其组合好友列表 / 群组列表 / 通知子视图），适合需要完全自定义子视图内容的场景，或单独作为「聚合入口 + 内容区」的壳使用。

## 使用方式

组件以 `EmAddressBookContainer` 为名导出。需在 `EmUIKitProvider` 内使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob-community/uikit-im'

const customEntries = [
  { key: 'blacklist', label: '黑名单', icon: 'people/person_remove', count: 2 },
  { key: 'tags', label: '我的标签', icon: 'misc/tag', to: false },
]
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
  >
    <div style="height: 100vh; width: 360px;">
      <em-address-book-container
        title="通讯录"
        :entries="customEntries"
        :notice-count="3"
      >
        <!-- 自定义入口对应的子视图内容 -->
        <template #default="{ view }">
          <div v-if="view === 'blacklist'" style="padding: 16px;">
            黑名单内容
          </div>
        </template>
      </em-address-book-container>
    </div>
  </EmUIKitProvider>
</template>
```

> 默认插槽接收 `{ view }`，按当前视图渲染对应子视图内容；「通知」视图不传 `#notice` 插槽时会渲染内置通知列表。

## API

<!-- @include: ../.vitepress/gen/address-book-container.md -->

> 语义注记：
>
> - `showBlocklist`：仅黑名单一个入口启用时自动降级为黑名单子视图。
> - `initialView`：单入口时自动降级为该入口视图。
> - `entries` 元素类型 `AddressBookContainerEntry`：`key` / `label` / `count`（0 时不展示）/ `icon` / `visible`（false 不渲染）/ `to`（false 时仅触发 `entry-click`，不自动切换视图）/ `sort`（排序权重，越小越靠前）。
> - `noticeCount` 不给默认值（外部注入）；`groupCount` / `contactCount` 不传默认取 store 实际数量。
> - `blocklist-add`：点击黑名单子视图头部的「添加黑名单」按钮（通讯录聚合容器内默认打开添加黑名单选人弹窗）。

## 插槽

- `header` / `header-extra`：头部与头部附加内容
- `nav`：首页导航整体自定义，接收 `{ entries, onEntryClick }`
- `nav-entry` / `nav-entry-extra`：单个入口项自定义
- `home-body` / `home-footer`：首页入口下方 / 底部内容
- `back-icon`：子视图返回按钮
- `subheader-extra`：子视图头部附加操作，接收 `{ view }`
- `default`：子视图内容，接收 `{ view }`
- `notice`：「通知」视图内容（不传则渲染内置通知列表）

## 实例方法

- `goHome()` / `goContact()` / `goGroup()` / `goNotice()` / `goBlocklist()` / `goTo(key)`：命令式切换视图
- `view`：只读当前视图 ref
