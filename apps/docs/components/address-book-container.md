# 地址簿容器

地址簿容器是通讯录模块的底层基础组件（`EmContactContainer` 内部即由其组合联系人 / 群组 / 通知子视图），适合需要完全自定义子视图内容的场景，或单独作为「聚合入口 + 内容区」的壳使用。

## 使用方式

组件以 `EmAddressBookContainer` 为名导出。需在 `EmUIKitProvider` 内使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'

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

## Props

### 容器外观

- `showHeader`：是否展示头部，默认 `true`
- `title`：Header 标题文本
- `headerAlign`：Header 对齐方式，默认 `'left'`
- `showSearch`：首页搜索框开关，默认 `true`
- `transition`：视图切换过场，`'none' | 'slide' | 'fade'`，默认 `'slide'`

### 聚合入口

- `entries`：自定义入口列表，类型 `AddressBookContainerEntry[]`（`key` / `label` / `count` / `icon` / `visible` / `to` / `sort`）
- `showNotice` / `showGroup` / `showContact`：内置入口开关，默认 `true`
- `noticeCount` / `groupCount` / `contactCount`：入口右侧数量；群组 / 联系人数量不传默认取 store 实际数量
- `autoEntryCount`：是否自动推断入口数量，默认 `true`
- `entryOrder`：入口顺序，默认 `['notice', 'group', 'contact']`
- `noticeLabel` / `groupLabel` / `contactLabel`：自定义入口文案
- `noticeIcon` / `groupIcon` / `contactIcon`：自定义入口图标
- `noticePersistInvites`：是否持久化未处理通知（好友申请 + 群邀请），支持 `boolean | 'local' | 'session'`，默认 `false`
- `initialView`：初始视图，默认 `'home'`；单入口时自动降级为该入口视图
- `showContactAddButton` / `showGroupCreateButton`：子视图头部操作按钮，默认 `true`

## 事件

- `view-change`：视图切换，参数 `view: string`
- `entry-click`：点击入口，参数 `key: string`；声明 `to: false` 的入口不会自动切换视图
- `notice-click`：点击「通知」入口
- `home-search`：首页搜索，参数 `keyword: string`
- `add-contact`：点击「添加好友」按钮
- `create-group`：点击「创建群组」按钮

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

- `goHome()` / `goContact()` / `goGroup()` / `goNotice()` / `goTo(key)`：命令式切换视图
- `view`：只读当前视图 ref
