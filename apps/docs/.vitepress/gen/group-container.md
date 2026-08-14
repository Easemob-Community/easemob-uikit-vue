<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## GroupContainer API

### Props

| 属性                | 类型                              | 默认值         | 说明                                             |
| --- | --- | --- | --- |
| showHeader        | `boolean`                       | `true`      | 是否展示头部区域，默认 true                               |
| title             | `string`                        | —           | Header 标题文本，不传则使用 i18n 默认值                     |
| headerAlign       | `'left' \| 'center' \| 'right'` | `'left'`    | Header 内容对齐方式：left \| center \| right，默认 left  |
| showCount         | `boolean`                       | `false`     | 是否在标题旁展示数量徽标 (n)，默认 false                      |
| showSearch        | `boolean`                       | `true`      | 是否展示搜索框，默认 true                                |
| showScrollToTop   | `boolean`                       | `true`      | 是否展示滚动置顶按钮，默认 true                             |
| emptyText         | `string`                        | —           | 空列表提示文字                                        |
| filterFn          | `GroupFilterFn`                 | —           | 自定义搜索过滤函数                                      |
| sortBy            | `GroupSortBy`                   | `'none'`    | 排序方式，默认 'none'（保持 store 顺序）                    |
| groupBy           | `GroupGroupBy`                  | `'none'`    | 分组方式，默认 'none'（平铺）                             |
| showGroupHeader   | `boolean`                       | `true`      | 是否展示分组标题，默认 true（仅 groupBy !== 'none' 时）       |
| showAlphabetNav   | `boolean`                       | `true`      | 是否展示字母导航，默认 true（仅 groupBy === 'alphabet' 时）   |
| selectMode        | `GroupSelectMode`               | `'none'`    | 选择模式                                           |
| selectedIds       | `string[]`                      | —           | 已选中 id 列表（受控，配合 update:selectedIds 实现 v-model） |
| maxSelected       | `number`                        | —           | 最大可选数量（multiple 模式生效）                          |
| disabledFn        | `GroupDisabledFn`               | —           | disabled 判定                                    |
| subtitleFn        | `GroupSubtitleFn`               | —           | 副标题提取函数                                        |
| showAvatar        | `boolean`                       | `true`      | 是否展示群头像，默认 true                                |
| showMemberCount   | `boolean`                       | `true`      | 是否展示成员数，默认 true                                |
| avatarSize        | `number`                        | —           | 头像尺寸（px），覆盖 itemSize 推断                        |
| avatarShape       | `AvatarShape`                   | `undefined` | 头像形状，默认 rounded                                |
| itemSize          | `GroupItemSize`                 | `'normal'`  | Item 紧凑度，默认 'normal'                           |
| loading           | `boolean`                       | `false`     | 是否处于加载态                                        |
| hasMore           | `boolean`                       | `true`      | 是否还有更多数据可加载，默认 true                            |
| loadMoreThreshold | `number`                        | `60`        | 触底距离阈值（px），默认 60                               |
| enableLoadMore    | `boolean`                       | `true`      | 启用触底加载                                         |
| noMoreText        | `string`                        | —           | 自定义"没有更多"提示文案                                  |
| bodySticky        | `boolean`                       | `false`     | #body slot 是否固定不随列表滚动                          |
| footerSticky      | `boolean`                       | `false`     | #footer slot 是否固定不随列表滚动                        |
| searchComponent   | `Component`                     | —           | 自定义搜索组件（完全接管搜索逻辑与UI），传入后 showSearch 失效         |
| clickBehavior     | `GroupListClickBehavior`        | `'default'` | 列表项点击行为模式，默认 'default'                         |

### Events

| 事件名                  | 参数                              | 说明                                                           |
| --- | --- | --- |
| `select`             | group: Group                    | 列表项被选中时触发（clickBehavior 为 'event-only' 时不触发），负载为群组对象         |
| `click`              | group: Group                    | 点击列表项时触发（不受 clickBehavior 影响，始终发出），负载为群组对象                   |
| `contextmenu`        | event: MouseEvent, group: Group | 右键点击列表项时触发，负载为原生右键事件 MouseEvent 与群组对象                        |
| `group-jump`         | key: string                     | 通过字母导航跳转到分组后触发，负载为分组 key                                     |
| `update:selectedIds` | ids: string[]                   | 选中集合变化时触发（配合 selectedIds 实现 v-model:selectedIds），负载为新的 id 数组 |
| `max-exceed`         | max: number                     | 选中数量超过 maxSelected 上限时触发（内部回退到上次合法选中），负载为上限值                 |
| `load-more`          | —                               | 滚动接近底部且满足加载条件时触发；外部加载完成后需调用 expose 的 releaseLoadMoreLock 释放锁 |
| `search`             | keyword: string                 | 搜索关键词变化时触发，负载为去除首尾空格后的关键词                                    |

### Slots

| 插槽名            | 说明 |
| --- | --- |
| `header`       | —  |
| `search`       | —  |
| `body`         | —  |
| `loading`      | —  |
| `empty`        | —  |
| `group-header` | —  |
| `item`         | —  |
| `loading-more` | —  |
| `no-more`      | —  |
| `footer`       | —  |
