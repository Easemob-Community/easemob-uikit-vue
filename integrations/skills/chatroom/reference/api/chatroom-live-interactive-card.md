<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomLiveInteractiveCard API

### Props

| 属性              | 类型        | 默认值              | 说明                               |
| --- | --- | --- | --- |
| active          | `boolean` | `true`           | 激活态（金色呼吸灯边框）                     |
| soldOut         | `boolean` | `false`          | 已抢光/已领完遮罩                        |
| closable        | `boolean` | `true`           | 是否显示右上角关闭（false = 常驻，用户无法关闭）     |
| soldOutText     | `string`  | `''`             | 已售罄/已结束文案                        |
| autoCloseMs     | `number`  | —                | 自动关闭倒计时（毫秒），到达后触发 close；常用于抢购倒计时 |
| countdownFormat | `string`  | `'{{seconds}}s'` | 倒计时文案格式（{{seconds}} 为剩余秒数占位）     |

### Events

| 事件名      | 参数 | 说明            |
| --- | --- | --- |
| `click`  | —  | 点击卡片主体        |
| `close`  | —  | 关闭卡片          |
| `action` | —  | 行动按钮（如「抢」「领」） |

### Slots

| 插槽名      | 说明 |
| --- | --- |
| `title`  | —  |
| `close`  | —  |
| `footer` | —  |
