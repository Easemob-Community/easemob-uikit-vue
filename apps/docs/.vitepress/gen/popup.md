<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Popup API

### Props

| 属性                  | 类型                                                   | 默认值        | 说明                                           |
| show                | `boolean`                                            | —          | —                                            |
| position            | `'center' \| 'bottom' \| 'top' \| 'left' \| 'right'` | `'center'` | —                                            |
| zIndex              | `number`                                             | `2000`     | —                                            |
| overlay             | `boolean`                                            | `true`     | —                                            |
| closeOnClickOverlay | `boolean`                                            | `true`     | —                                            |
| showClose           | `boolean`                                            | `false`    | —                                            |
| anchor              | `HTMLElement`                                        | —          | 相对定位的锚点元素，传入后 popup 将相对于该元素定位                |
| placement           | `'bottom' \| 'top' \| 'left' \| 'right'`             | `'bottom'` | 相对锚点的位置，默认 'bottom'                          |
| align               | `'start' \| 'center' \| 'end'`                       | `'center'` | 锚定轴上的对齐方式，默认 'center'                        |
| offset              | `number`                                             | `8`        | 与锚点的间距（px），默认 8                              |
| boundary            | `HTMLElement`                                        | —          | 边界约束元素，传入后 popup 将被限制在该元素范围内                 |
| group               | `string`                                             | —          | 互斥分组：同一 group 内同时只能有一个 popup 打开，打开新的会自动关闭其他的 |

### Events

| 事件名           | 参数             | 说明 |
| `update:show` | value: boolean | —  |
| `close`       | —              | —  |
