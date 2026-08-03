<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## PresenceAvatar API

### Props

| 属性                | 类型                                       | 默认值 | 说明                      |
| --- | --- | --- | --- |
| userId            | `string`                                 | —   | 用户 ID，用于自动订阅/拉取在线状态     |
| src               | `string`                                 | —   | 头像地址                    |
| name              | `string`                                 | —   | 展示名称（无头像时生成占位文字）        |
| size              | `number`                                 | —   | 头像尺寸，默认 40              |
| shape             | `'circle' \| 'square'`                   | —   | 头像形状，默认跟随主题             |
| presenceSize      | `number`                                 | —   | 指示器直径（px），默认按头像尺寸自适应    |
| editable          | `boolean`                                | —   | 是否可编辑，点击时打开在线状态选择 popup |
| selectorPlacement | `'bottom' \| 'top' \| 'left' \| 'right'` | —   | 弹层相对头像的位置，默认 'bottom'   |

### Events

| 事件名                | 参数 | 说明 |
| --- | --- | --- |
| `presence-click`   | —  | —  |
| `presence-changed` | —  | —  |
