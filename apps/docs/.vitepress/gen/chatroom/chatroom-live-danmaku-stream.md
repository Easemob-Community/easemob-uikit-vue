<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomLiveDanmakuStream API

### Props

| 属性             | 类型                                | 默认值         | 说明                                                                                                                                                                                                                                                                              |
| --- | --- | --- | --- |
| items          | `LiveDanmakuItem[]`               | —           | 弹幕条目流（页面 push 追加，本组件按 id 增量消费）                                                                                                                                                                                                                                                  |
| maskName       | `boolean`                         | `true`      | 是否对用户名脱敏（默认 true）                                                                                                                                                                                                                                                               |
| maxChatItems   | `number`                          | `5`         | 聊天区最多同时显示条数                                                                                                                                                                                                                                                                     |
| maxNoticeItems | `number`                          | `3`         | 通知区最多同时显示条数                                                                                                                                                                                                                                                                     |
| shape          | `'rounded' \| 'pill' \| 'square'` | `'rounded'` | 弹幕气泡圆角预设：rounded（普通圆角）/ pill（胶囊大圆角）/ square（方圆角）；默认 rounded                                                                                                                                                                                                                     |
| maxLines       | `number`                          | `2`         | 单条弹幕最大展示行数，超出截断省略；默认 2<br>Max lines shown per danmaku bubble before truncating with ellipsis (default: 2)                                                                                                                                                                       |
| size           | `'small' \| 'medium' \| 'large'`  | `undefined` | 字号档位：small（默认，H5 弹幕推荐）/ medium / large；<br>不传时走 --live-danmaku-font-size token（祖先元素可覆盖），传了则以档位为准。<br>Font size preset: small (default, recommended for H5 danmaku) / medium / large.<br>When omitted, the --live-danmaku-font-size token governs (overridable on any ancestor). |

### Slots

| 插槽名      | 说明 |
| --- | --- |
| `item`   | —  |
| `prefix` | —  |
| `badge`  | —  |
| `empty`  | —  |
