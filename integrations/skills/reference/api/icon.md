<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Icon API

### Props

| 属性    | 类型                                                                       | 默认值              | 说明                                                                                                                                                                                               |
| --- | --- | --- | --- |
| name  | `string`                                                                 | —                | 图标名称，格式 "category/icon-name"，如 "actions/trash"；传入 name 后无需 slot                                                                                                                                  |
| size  | `number`                                                                 | `20`             | 图标尺寸（px），同时作用于宽高，默认 20                                                                                                                                                                           |
| color | `string`                                                                 | `'currentColor'` | 图标颜色，默认 currentColor（跟随文字颜色）；描边图标与填充图标均适用                                                                                                                                                        |
| type  | `'default' \| 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | —                | 语义色类型；与 color 同时存在时 color 优先级更高                                                                                                                                                                  |
| anim  | `'spin' \| 'pulse' \| 'shake' \| 'flash'`                                | —                | 内置动画：spin 旋转（无限）/ pulse 脉冲（无限）/ shake 摇摆（一次）/ flash 闪烁（一次）。<br>时长与曲线跟随主题动画 token（--uikit-anim-duration / --uikit-anim-easing），<br>全局动画开关与 prefers-reduced-motion 自动生效；触发一次性动画请用 :key 或切换 anim 值。 |
