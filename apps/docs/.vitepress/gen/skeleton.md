<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Skeleton API

### Props

| 属性       | 类型                                            | 默认值        | 说明                                                  |
| --- | --- | --- | --- |
| variant  | `'avatar' \| 'text' \| 'paragraph' \| 'card'` | `'text'`   | 变体：avatar 头像 / text 单行文字 / paragraph 多行段落 / card 卡片 |
| shape    | `'circle' \| 'square' \| 'rounded'`           | `'circle'` | avatar 形状：circle（默认）/ square / rounded              |
| rows     | `number`                                      | `3`        | 段落行数，默认 3                                           |
| animated | `boolean`                                     | `true`     | 是否启用闪烁动画，默认 true                                    |
| width    | `string`                                      | —          | 自定义宽度（CSS 值），默认按变体自适应                               |
| height   | `string`                                      | —          | 自定义高度（CSS 值），默认按变体自适应                               |
