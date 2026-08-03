<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## UserCard API

### Props

| 属性                | 类型                                       | 默认值        | 说明                             |
| userId            | `string`                                 | —          | 用户 ID                          |
| name              | `string`                                 | —          | 展示名称                           |
| avatar            | `string`                                 | —          | 头像 URL                         |
| banner            | `string`                                 | —          | 顶部背景图 URL，不传时使用默认渐变            |
| status            | `PresenceDisplayStatus`                  | —          | 在线状态                           |
| editable          | `boolean`                                | `false`    | 头像是否可编辑（用于当前用户变更在线状态），默认 false |
| selectorPlacement | `'bottom' \| 'top' \| 'left' \| 'right'` | —          | 弹层相对头像的位置，默认 'bottom'          |
| actions           | `UserCardAction[]`                       | `() => []` | 底部操作按钮                         |
| infoRows          | `UserCardInfoRow[]`                      | `() => []` | 信息行                            |

### Events

| 事件名                | 参数          | 说明 |
| `action-click`     | key: string | —  |
| `info-click`       | key: string | —  |
| `avatar-click`     | —           | —  |
| `presence-click`   | —           | —  |
| `presence-changed` | —           | —  |
