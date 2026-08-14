<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Avatar API

### Props

| 属性           | 类型                      | 默认值         | 说明                                                |
| --- | --- | --- | --- |
| src          | `string`                | —           | 头像图片地址；为空或加载失败时回退为文字头像（取 name 前 2 个字符）            |
| name         | `string`                | —           | 用户名，用于生成文字头像内容与背景色                                |
| size         | `number`                | `40`        | 头像尺寸（px），默认 40；文字字号与在线状态指示器随之自适应                  |
| shape        | `'circle' \| 'square'`  | `undefined` | 头像形状：circle（圆形）/ square（圆角方形）；不传时跟随主题 avatarShape |
| presence     | `PresenceDisplayStatus` | —           | 在线状态，传入则展示右下角指示器                                  |
| presenceSize | `number`                | —           | 指示器直径（px），默认按头像尺寸自适应                              |
| editable     | `boolean`               | `false`     | 是否可编辑（通常仅当前用户自己的头像使用），点击时触发 presence-click        |

### Events

| 事件名              | 参数 | 说明                                 |
| --- | --- | --- |
| `presence-click` | —  | 头像为可编辑态（editable）时点击触发，用于唤起更换头像等操作 |
