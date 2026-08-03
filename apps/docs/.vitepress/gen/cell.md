<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Cell API

### Props

| 属性         | 类型                                 | 默认值        | 说明                                              |
| --- | --- | --- | --- |
| clickable  | `boolean`                          | `true`     | 是否可点击（影响 cursor 和 hover），默认 true                |
| active     | `boolean`                          | `false`    | 激活状态（当前选中项）                                     |
| selected   | `boolean`                          | `false`    | 选中状态（多选模式）                                      |
| disabled   | `boolean`                          | `false`    | 禁用状态                                            |
| size       | `'compact' \| 'normal' \| 'large'` | `'normal'` | 尺寸：compact / normal / large，默认 normal           |
| title      | `string`                           | —          | 标题文本（便捷模式，也可用 title slot）                       |
| subtitle   | `string`                           | —          | 副标题文本                                           |
| meta       | `string`                           | —          | 右侧元信息文本（计数、时间）                                  |
| showArrow  | `boolean`                          | `false`    | 是否显示右侧箭头（导航项常用）                                 |
| border     | `boolean \| 'top' \| 'bottom'`     | `false`    | 分隔线：true=bottom / false=none / 'top' / 'bottom' |
| autoHeight | `boolean`                          | `false`    | 内容驱动高度（而非固定高度）                                  |
| danger     | `boolean`                          | `false`    | 危险操作样式（文字/图标显示为红色）                              |

### Events

| 事件名           | 参数                | 说明 |
| --- | --- | --- |
| `click`       | —                 | —  |
| `contextmenu` | event: MouseEvent | —  |

### Slots

| 插槽名        | 说明 |
| --- | --- |
| `leading`  | —  |
| `title`    | —  |
| `subtitle` | —  |
| `trailing` | —  |
