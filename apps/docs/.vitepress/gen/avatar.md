<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Avatar API

### Props

| 属性             | 类型                      | 默认值                                | 说明                                                                                     |
| --- | --- | --- | --- |
| src            | `string`                | —                                  | 头像图片地址；为空或加载失败时回退为文字头像（取 name 前 2 个字符）                                                 |
| name           | `string`                | —                                  | 用户名，用于生成文字头像内容与背景色                                                                     |
| size           | `number`                | `40`                               | 头像尺寸（px），默认 40；文字字号与在线状态指示器随之自适应                                                       |
| shape          | `'circle' \| 'square'`  | `undefined`                        | 头像形状：circle（圆形）/ square（圆角方形）；不传时跟随主题 avatarShape                                      |
| presence       | `PresenceDisplayStatus` | —                                  | 在线状态，传入则展示右下角指示器（Figma 1994:26192：固定 8px 彩色核心，不随头像缩放；<br>1.5px 分界环为 mask 镂空，与当地背景融为一体） |
| presenceSize   | `number`                | —                                  | 指示器总直径（px，含 1.5px 分界环），默认 11（核心 8 + 环 1.5 × 2）                                         |
| editable       | `boolean`               | `false`                            | 是否可编辑（通常仅当前用户自己的头像使用），点击时触发 presence-click                                             |
| badge          | `number`                | —                                  | 徽标数字；超过 badgeMax 显示为 "max+"；为 0 或未传时不显示（badgeDot 红点模式除外）                               |
| badgeDot       | `boolean`               | `false`                            | 徽标红点模式：仅显示小圆点不显示数字，默认 false                                                            |
| badgeMax       | `number`                | `99`                               | 徽标数字显示上限，默认 99                                                                         |
| badgePlacement | `BadgePlacement`        | `'top-right'`                      | 徽标位置：top-right（默认，避开右下角 presence 指示器）/ bottom-right                                    |
| badgeColor     | `string`                | `'var(--uikit-badge-bg, #FF7070)'` | 徽标颜色，默认 --uikit-badge-bg（#FF7070）                                                      |

### Events

| 事件名              | 参数 | 说明                                 |
| --- | --- | --- |
| `presence-click` | —  | 头像为可编辑态（editable）时点击触发，用于唤起更换头像等操作 |
