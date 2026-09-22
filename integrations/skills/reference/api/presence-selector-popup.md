<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## PresenceSelectorPopup API

### Props

| 属性        | 类型                                       | 默认值 | 说明                                        |
| --- | --- | --- | --- |
| show      | `boolean`                                | —   | —                                         |
| anchor    | `HTMLElement`                            | —   | 锚定元素，popup 将相对于该元素定位                      |
| placement | `'bottom' \| 'top' \| 'left' \| 'right'` | —   | 相对锚点的位置，默认 'bottom'                       |
| align     | `'start' \| 'center' \| 'end'`           | —   | 锚定轴上的对齐方式，默认 'start'                      |
| value     | `string`                                 | —   | 当前在线状态描述（ext），未传时自动从当前登录用户的 presence 缓存读取 |

### Events

| 事件名           | 参数             | 说明 |
| --- | --- | --- |
| `update:show` | value: boolean | —  |
| `close`       | —              | —  |
| `changed`     | —              | —  |
