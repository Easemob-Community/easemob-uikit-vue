<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Popup API

### Props

| 属性                  | 类型                                                   | 默认值        | 说明                                                                         |
| --- | --- | --- | --- |
| show                | `boolean`                                            | —          | 是否显示弹层（v-model:show 受控）                                                    |
| position            | `'center' \| 'bottom' \| 'top' \| 'left' \| 'right'` | `'center'` | 弹层位置：center 居中 / bottom 底部 / top 顶部 / left 左侧 / right 右侧，锚定模式（传 anchor）时忽略 |
| zIndex              | `number`                                             | —          | 显式指定 z-index；不传时由全局分配器自动递增                                                 |
| overlay             | `boolean`                                            | `true`     | 是否显示遮罩层，默认 true；锚定模式设为 false 时点击可穿透到下层                                     |
| closeOnClickOverlay | `boolean`                                            | `true`     | 点击遮罩（弹层外部）是否关闭，默认 true；锚定模式下点击 anchor 本身不关闭                                |
| closeOnEsc          | `boolean`                                            | `true`     | 按 ESC 关闭，默认 true                                                           |
| showClose           | `boolean`                                            | `false`    | 是否显示右上角关闭按钮，默认 false                                                       |
| anchor              | `HTMLElement`                                        | —          | 相对定位的锚点元素，传入后 popup 将相对于该元素定位                                              |
| placement           | `'bottom' \| 'top' \| 'left' \| 'right'`             | `'bottom'` | 相对锚点的位置，默认 'bottom'                                                        |
| align               | `'start' \| 'center' \| 'end'`                       | `'center'` | 锚定轴上的对齐方式，默认 'center'                                                      |
| offset              | `number`                                             | `8`        | 与锚点的间距（px），默认 8                                                            |
| boundary            | `HTMLElement`                                        | —          | 边界约束元素，传入后 popup 将被限制在该元素范围内                                               |
| group               | `string`                                             | —          | 互斥分组：同一 group 内同时只能有一个 popup 打开，打开新的会自动关闭其他的                               |

### Events

| 事件名           | 参数             | 说明                                                         |
| --- | --- | --- |
| `update:show` | value: boolean | 弹层关闭时触发（ESC/点击遮罩/关闭按钮/互斥分组关闭），负载 false，供 v-model:show 双向同步 |
| `close`       | —              | 弹层关闭时触发（与 update:show(false) 同时发出），供业务侧感知关闭                |
