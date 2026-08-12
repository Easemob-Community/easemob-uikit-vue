<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Resizable API

### Props

| 属性         | 类型                           | 默认值            | 说明                                                                                                                                                               |
| --- | --- | --- | --- |
| axis       | `'horizontal' \| 'vertical'` | `'horizontal'` | 调整方向：horizontal 沿水平轴（右缘拖宽）/ vertical 沿垂直轴（下缘拖高），默认 'horizontal' / Resize axis: horizontal (drag right edge) or vertical (drag bottom edge), default 'horizontal' |
| modelValue | `number`                     | —              | 当前尺寸（v-model），单位 px；未传时使用 initial / Current size (v-model) in px; falls back to initial when omitted                                                             |
| initial    | `number`                     | `200`          | 初始尺寸（px），默认 200 / Initial size in px, default 200                                                                                                                |
| min        | `number`                     | `160`          | 最小尺寸（px），默认 160 / Minimum size in px, default 160                                                                                                                |
| max        | `number`                     | —              | 最大尺寸（px），默认不限制 / Maximum size in px, no limit by default                                                                                                         |
| disabled   | `boolean`                    | `false`        | 是否禁用拖拽，默认 false / Whether resizing is disabled, default false                                                                                                    |
| handleSize | `number`                     | `6`            | 手柄命中区尺寸（px），默认 6 / Handle hit area size in px, default 6                                                                                                         |
| showLine   | `boolean`                    | `false`        | 是否显示手柄视觉分隔线，默认 false（仅保留光标提示）/ Whether to show the visual divider line on the handle, default false (cursor hint only)                                           |

### Events

| 事件名                  | 参数           | 说明 |
| --- | --- | --- |
| `update:model-value` | size: number | —  |
| `resize-start`       | —            | —  |
| `resize-end`         | size: number | —  |
