# 通讯录模块

通讯录容器，聚合「通知 / 群组 / 联系人」三大入口：首页入口导航 + 联系人子列表（字母分组、在线状态、多选）+ 群组子列表 + 通知子视图，内置视图切换过场动画。

## 使用方式

组件以 `EmContactContainer` 为名导出。需在 `EmUIKitProvider` 内使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'

function goDetail() {
  // 跳转联系人详情页
}

function onCreateGroup() {
  // 打开创建群组弹窗
}
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
    enable-contact
  >
    <div style="height: 100vh; width: 360px;">
      <em-contact-container
        title="通讯录"
        :notice-count="3"
        @contact-click="goDetail"
        @create-group="onCreateGroup"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> Provider 需开启 `enable-contact`（默认开启）才会自动拉取好友与群组数据；`notice-count` 用于展示「通知」入口的徽标数量。

## 联系人列表项

`EmContactItem` 是联系人列表的基础展示单元，支持副标题、在线状态、头像形状与选择模式：

<demo src="./demo/item.vue" title="联系人列表项" desc="静态展示在线状态（online / away / busy / offline）、备注名与副标题；select-mode 可切换单选 / 多选交互。" />

## Props

### 容器外观

- `showHeader`：是否展示头部，默认 `true`
- `title`：Header 标题文本
- `headerAlign`：Header 对齐方式，默认 `'left'`
- `showSearch`：统一搜索框开关，默认 `true`
- `showScrollToTop`：是否展示滚动置顶按钮，默认 `true`
- `transition`：视图切换过场，`'none' | 'slide' | 'fade'`，默认 `'slide'`

### 聚合入口

- `showNotice`：是否展示「通知」入口，默认 `true`（`showNewRequest` 为废弃别名）
- `showGroup` / `showContact`：是否展示「群组」/「联系人」入口，默认 `true`
- `noticeCount`：通知徽标数量，默认 `0`（`newRequestCount` 为废弃别名）
- `groupCount` / `contactCount`：入口右侧数量，不传默认取 store 实际数量
- `autoEntryCount`：是否自动推断入口数量，默认 `true`
- `entryOrder`：入口顺序，默认 `['notice', 'group', 'contact']`
- `noticeLabel` / `groupLabel` / `contactLabel`：自定义入口文案
- `noticeIcon` / `groupIcon` / `contactIcon`：自定义入口图标
- `entries`：自定义入口列表（`AddressBookContainerEntry[]`），可与内置入口共存
- `initialView`：初始视图，默认 `'home'`
- `showContactAddButton`：联系人子视图头部是否展示「添加好友」按钮，默认 `true`
- `showGroupCreateButton`：群组子视图头部是否展示「创建群组」按钮，默认 `true`

### 联系人子列表

- `emptyText`：空列表提示文字
- `filterFn`：自定义搜索过滤函数
- `sortBy`：排序方式（如 `'alphabet'`、`'pinyin'`）
- `groupBy`：分组方式，默认 `'alphabet'`
- `showGroupHeader` / `showAlphabetNav`：分组标题 / 字母导航，默认 `true`
- `selectMode`：选择模式，`'none' | 'single' | 'multiple'`，默认 `'none'`
- `selectedIds`：受控选中 id 列表（`v-model:selectedIds`）
- `maxSelected`：最大可选数量
- `disabledFn`：disabled 判定函数
- `subtitleFn`：副标题提取函数
- `onlineStatusFn`：在线状态提取函数
- `showAvatar` / `avatarSize` / `avatarShape`：头像展示配置
- `itemSize`：`'compact' | 'normal' | 'large'`，默认 `'normal'`
- `loading` / `enableLoadMore` / `loadMoreThreshold` / `noMoreText`：加载与分页配置

### 群组子列表

- `groupSortBy` / `groupGroupBy`：群组排序与分组
- `groupSelectMode` / `groupSelectedIds` / `groupMaxSelected` / `groupDisabledFn`：群组选择配置
- `groupSubtitleFn` / `groupShowAvatar` / `groupShowMemberCount` / `groupItemSize`：群组项展示配置
- `groupLoading` / `groupEnableLoadMore` / `groupFilterFn` / `groupEmptyText`：群组加载与过滤

### 在线状态与自治拉取

- `enablePresence`：联系人头像是否展示在线状态；不传则使用 Provider 全局配置
- `autoFetch` / `autoFetchGroups`：mount 时自动拉取联系人 / 群组列表，默认 `true`

## 事件

- `view-change`：视图切换，参数 `view: 'home' | 'group' | 'contact' | 'notice'`
- `entry-click`：点击入口，参数 `key: string`
- `notice-click`：点击「通知」入口（`new-request-click` 为废弃别名）
- `home-search` / `contact-search` / `group-search`：各视图搜索，参数 `keyword: string`
- `contact-click` / `contact-select`：点击 / 选中联系人，参数 `contact: Contact`
- `contact-contextmenu`：联系人右键，参数 `(event, contact)`
- `contact-load-more` / `contact-max-exceed`：联系人加载更多 / 超出最大选择
- `update:selectedIds`：联系人选中变化，参数 `ids: string[]`
- `group-click` / `group-select`：点击 / 选中群组，参数 `group: Group`
- `group-contextmenu` / `group-load-more` / `group-max-exceed`：群组右键 / 加载更多 / 超限
- `update:groupSelectedIds`：群组选中变化，参数 `ids: string[]`
- `add-contact`：点击「添加好友」按钮
- `create-group`：点击「创建群组」按钮

## 插槽

- `header` / `header-extra`：头部与头部附加内容
- `nav` / `nav-entry` / `nav-entry-extra`：首页入口导航自定义
- `home-body` / `home-footer`：首页入口下方内容
- `back-icon` / `subheader-extra`：子视图返回按钮与附加操作
- `item` / `contact-search`：联系人列表项与搜索框自定义
- `group-item` / `group-search`：群组列表项与搜索框自定义
- `notice`：通知子视图内容（不传则默认渲染通知列表）
- `body` / `footer` / `loading` / `empty` 等：列表通用插槽

## 实例方法

- `goHome()` / `goContact()` / `goGroup()` / `goNotice()` / `goTo(key)`：命令式切换视图
- `setView(key)`：`goTo` 的别名
- `scrollToGroup(key)`：滚动到指定分组
