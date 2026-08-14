<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## UserCard API

### Props

| 属性                | 类型                                       | 默认值        | 说明                             |
| --- | --- | --- | --- |
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

| 事件名                | 参数          | 说明                                                       |
| --- | --- | --- |
| `action-click`     | key: string | 点击底部操作按钮时触发，负载为按钮对应的 action key                          |
| `info-click`       | key: string | 点击信息行时触发（仅当该行 clickable 为 true），负载为行对应的 key              |
| `avatar-click`     | —           | 点击头像时触发（不含在线状态指示器点击，避免与 presence-click 重复）               |
| `presence-click`   | —           | 点击头像上的在线状态指示器时触发（由 Avatar 内部转发）；editable 时同时弹出在线状态选择器    |
| `presence-changed` | —           | 在线状态选择器中成功变更状态后触发（转发 PresenceSelectorPopup 的 changed 事件） |
