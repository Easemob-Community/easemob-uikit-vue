<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ContactListContainer API

### Props

| 属性                | 类型                              | 默认值          | 说明                                                                                                                            |
| --- | --- | --- | --- |
| showHeader        | `boolean`                       | `true`       | 是否展示头部，默认 true                                                                                                                |
| title             | `string`                        | —            | Header 标题                                                                                                                     |
| headerAlign       | `'left' \| 'center' \| 'right'` | `'left'`     | Header 对齐方式，默认 left                                                                                                           |
| showSearch        | `boolean`                       | `true`       | 是否展示搜索框，默认 true                                                                                                               |
| showScrollToTop   | `boolean`                       | `true`       | 是否展示滚动置顶按钮，默认 true                                                                                                            |
| class             | `string`                        | —            | 自定义根元素 class                                                                                                                  |
| style             | `Record<string, string>`        | —            | 自定义根元素 style                                                                                                                  |
| emptyText         | `string`                        | —            | 空列表提示文字                                                                                                                       |
| filterFn          | `ContactFilterFn`               | —            | 自定义搜索过滤函数                                                                                                                     |
| sortBy            | `ContactSortBy`                 | `'none'`     | 排序方式，默认 'none'                                                                                                                |
| groupBy           | `ContactGroupBy`                | `'alphabet'` | 分组方式，默认 'alphabet'                                                                                                            |
| showGroupHeader   | `boolean`                       | `true`       | 是否展示分组标题，默认 true                                                                                                              |
| showAlphabetNav   | `boolean`                       | `true`       | 字母导航，默认 true                                                                                                                  |
| showCount         | `boolean`                       | `false`      | 是否展示计数                                                                                                                        |
| selectMode        | `ContactSelectMode`             | `'none'`     | 选择模式，默认 'none'                                                                                                                |
| selectedIds       | `string[]`                      | —            | 受控选中 id 列表 (v-model:selectedIds)                                                                                              |
| maxSelected       | `number`                        | —            | 最大可选数量                                                                                                                        |
| disabledFn        | `ContactDisabledFn`             | —            | disabled 判定                                                                                                                   |
| subtitleFn        | `ContactSubtitleFn`             | —            | 副标题提取                                                                                                                         |
| onlineStatusFn    | `ContactOnlineStatusFn`         | —            | 在线状态提取                                                                                                                        |
| showAvatar        | `boolean`                       | `true`       | 是否展示头像，默认 true                                                                                                                |
| avatarSize        | `number`                        | —            | 头像尺寸                                                                                                                          |
| avatarShape       | `AvatarShape`                   | `undefined`  | 头像形状                                                                                                                          |
| itemSize          | `ContactItemSize`               | `'normal'`   | Item 紧凑度                                                                                                                      |
| loading           | `boolean`                       | `false`      | 加载态                                                                                                                           |
| enableLoadMore    | `boolean`                       | `false`      | 启用触底加载                                                                                                                        |
| loadMoreThreshold | `number`                        | `60`         | 触底阈值                                                                                                                          |
| noMoreText        | `string`                        | —            | "没有更多"提示文案                                                                                                                    |
| bodySticky        | `boolean`                       | `false`      | #body slot 是否固定不随列表滚动                                                                                                         |
| footerSticky      | `boolean`                       | `false`      | #footer slot 是否固定不随列表滚动                                                                                                       |
| enablePresence    | `boolean`                       | `undefined`  | 是否展示联系人头像在线状态；不传则使用 Provider 全局 enablePresence 配置                                                                             |
| searchComponent   | `Component`                     | —            | 自定义搜索组件（完全接管搜索逻辑与UI），传入后 showSearch 失效                                                                                        |
| clickBehavior     | `ContactListClickBehavior`      | `'default'`  | 列表项点击行为模式，默认 'default'。<br>- 'default': 触发 click 事件，同时执行内部默认行为（设置 activeId）<br>- 'event-only': 仅触发 click 事件，不执行内部默认行为，由外部完全接管 |
| autoFetch         | `boolean`                       | `true`       | mount 时自动拉取联系人列表，默认 true。<br>需 Provider.enableContact=true 才会生效；<br>已加载则跳过（幂等），如需强制刷新请手动调用 useContact().refresh(true)。        |

### Events

| 事件名                  | 参数                                  | 说明 |
| --- | --- | --- |
| `select`             | contact: Contact                    | —  |
| `click`              | contact: Contact                    | —  |
| `contextmenu`        | event: MouseEvent, contact: Contact | —  |
| `load-more`          | —                                   | —  |
| `max-exceed`         | max: number                         | —  |
| `update:selectedIds` | ids: string[]                       | —  |
| `search`             | keyword: string                     | —  |

### Slots

| 插槽名            | 说明 |
| --- | --- |
| `header`       | —  |
| `body`         | —  |
| `footer`       | —  |
| `loading`      | —  |
| `loading-more` | —  |
| `no-more`      | —  |
| `empty`        | —  |
| `group-header` | —  |
| `item`         | —  |
| `search`       | —  |
| `watermark`    | —  |
