<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## BlockListContainer API

### Props

| 属性            | 类型                          | 默认值         | 说明                                                                                          |
| --- | --- | --- | --- |
| showHeader    | `boolean`                   | `true`      | 是否展示头部，默认 true                                                                              |
| title         | `string`                    | —           | Header 标题                                                                                   |
| showCount     | `boolean`                   | `false`     | 是否在标题旁展示数量徽标 (n)，默认 false                                                                   |
| emptyText     | `string`                    | —           | 空列表提示文字                                                                                     |
| class         | `string`                    | —           | 自定义根元素 class                                                                                |
| style         | `Record<string, string>`    | —           | 自定义根元素 style                                                                                |
| showAvatar    | `boolean`                   | `true`      | 是否展示头像，默认 true                                                                              |
| avatarSize    | `number`                    | —           | 头像尺寸                                                                                        |
| avatarShape   | `AvatarShape`               | `undefined` | 头像形状                                                                                        |
| itemSize      | `ContactItemSize`           | `'normal'`  | Item 紧凑度                                                                                    |
| clickBehavior | `'default' \| 'event-only'` | `'default'` | 列表项点击行为模式，默认 'default'。<br>- 'default': 触发 click 事件<br>- 'event-only': 仅触发 click 事件，由外部完全接管 |
| autoFetch     | `boolean`                   | `true`      | mount 时自动拉取黑名单，默认 true。<br>需 Provider.enableBlocklist=true 才会生效；已加载则跳过（幂等）。                 |

### Events

| 事件名           | 参数                                  | 说明 |
| --- | --- | --- |
| `click`       | contact: Contact                    | —  |
| `contextmenu` | event: MouseEvent, contact: Contact | —  |
| `unblock`     | contact: Contact                    | —  |

### Slots

| 插槽名         | 说明 |
| --- | --- |
| `header`    | —  |
| `watermark` | —  |
