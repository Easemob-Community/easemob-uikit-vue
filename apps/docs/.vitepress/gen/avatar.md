<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Avatar API

### Props

| 属性           | 类型                      | 默认值         | 说明                                         |
| src          | `string`                | —           | —                                          |
| name         | `string`                | —           | —                                          |
| size         | `number`                | `40`        | —                                          |
| shape        | `'circle' \| 'square'`  | `undefined` | —                                          |
| presence     | `PresenceDisplayStatus` | —           | 在线状态，传入则展示右下角指示器                           |
| presenceSize | `number`                | —           | 指示器直径（px），默认按头像尺寸自适应                       |
| editable     | `boolean`               | `false`     | 是否可编辑（通常仅当前用户自己的头像使用），点击时触发 presence-click |

### Events

| 事件名              | 参数 | 说明 |
| `presence-click` | —  | —  |
