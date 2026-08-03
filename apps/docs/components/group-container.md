# 群组模块

群组列表容器，开箱即用的「我的群组」列表页：内置搜索、排序 / 分组、字母导航、成员数展示、选择模式（单选 / 多选）与触底加载，点击行为可完全交给外部接管。

## 使用方式

组件以 `EmGroupListContainer` 为名导出。需在 `EmUIKitProvider` 内使用：

```vue
<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'

function onGroupClick() {
  // 跳转群详情或进入群聊
}
</script>

<template>
  <EmUIKitProvider
    app-key="your-app-key"
    :auto-init="true"
  >
    <div style="height: 100vh; width: 360px;">
      <em-group-list-container
        title="我的群组"
        group-by="alphabet"
        @click="onGroupClick"
      />
    </div>
  </EmUIKitProvider>
</template>
```

> Provider 需开启群组能力（`enable-group`，默认开启）才会自动拉取已加入群组；`group-by="alphabet"` 可开启按拼音首字母分组。

## 群组列表项

`EmGroupItem` 是群组列表的基础展示单元，支持成员数、副标题、头像形状与选择模式：

<demo src="./demo/item.vue" title="群组列表项" desc="静态展示成员数、副标题（最近消息 / 未读）、头像形状与 large 尺寸形态。" />

## Props

### 容器外观

- `showHeader`：是否展示头部，默认 `true`
- `title`：Header 标题文本
- `headerAlign`：Header 对齐方式，默认 `'left'`
- `showSearch`：是否展示搜索框，默认 `true`
- `showScrollToTop`：是否展示滚动置顶按钮，默认 `true`
- `searchComponent`：自定义搜索组件（完全接管搜索逻辑与 UI，传入后 `showSearch` 失效）

### 列表配置

- `sortBy`：排序方式（如 `'alphabet'`、`'pinyin'`），默认 `'none'`
- `groupBy`：分组方式，默认 `'none'`
- `showGroupHeader` / `showAlphabetNav`：分组标题 / 字母导航，默认 `true`
- `showCount`：是否展示计数，默认 `false`
- `selectMode`：选择模式，`'none' | 'single' | 'multiple'`，默认 `'none'`
- `selectedIds`：受控选中 id 列表（`v-model:selectedIds`）
- `maxSelected`：最大可选数量
- `disabledFn`：disabled 判定函数
- `subtitleFn`：副标题提取函数
- `showAvatar` / `showMemberCount`：头像与成员数开关，默认 `true`
- `avatarSize` / `avatarShape`：头像尺寸与形状
- `itemSize`：`'compact' | 'normal' | 'large'`，默认 `'normal'`
- `loading` / `enableLoadMore` / `loadMoreThreshold`：加载与触底分页配置
- `emptyText` / `noMoreText`：空列表 / 没有更多提示
- `filterFn`：自定义搜索过滤函数
- `bodySticky` / `footerSticky`：插槽固定开关
- `clickBehavior`：列表项点击行为，`'default'`（触发事件 + 内部选中）或 `'event-only'`（仅触发事件，由外部完全接管），默认 `'default'`
- `autoFetch`：mount 时自动拉取群组列表，默认 `true`

## 事件

- `click`：点击群组项，参数 `group: Group`
- `select`：选中群组项，参数 `group: Group`
- `contextmenu`：右键群组项，参数 `(event, group)`
- `load-more`：触底请求加载更多
- `max-exceed`：超出最大选择，参数 `max: number`
- `update:selectedIds`：选中变化，参数 `ids: string[]`
- `search`：搜索关键字变化，参数 `keyword: string`

## 插槽

- `header`：自定义头部内容
- `body` / `footer`：列表顶部 / 底部附加内容
- `loading` / `loading-more` / `no-more`：加载中 / 加载更多 / 没有更多状态
- `empty`：空列表状态
- `group-header`：分组标题自定义
- `item`：群组列表项自定义
- `search`：搜索框区域自定义

## 实例方法

- `scrollToGroup(key)`：滚动到指定分组
