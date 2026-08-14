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

## 在线代码演练场

直接编辑下面的代码（群管理配置与 mock 群数据），切换角色视角与已读回执配置实时生效，点「重置代码」恢复初始模板：

<VuePlayground :files="groupPlaygroundFiles" title="群能力配置在线演练场" id="group-container" />

## API

<!-- @include: ../.vitepress/gen/group-container.md -->

## 插槽说明

- `header`：自定义头部内容
- `body` / `footer`：列表顶部 / 底部附加内容
- `loading` / `loading-more` / `no-more`：加载中 / 加载更多 / 没有更多状态
- `empty`：空列表状态
- `group-header`：分组标题自定义
- `item`：群组列表项自定义
- `search`：搜索框区域自定义

## 实例方法

- `scrollToGroup(key)`：滚动到指定分组

<script setup>
import { groupPlaygroundFiles } from './group-container/demo/playground/template'
</script>
