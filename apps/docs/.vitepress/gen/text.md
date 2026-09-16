<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Text API

### Props

| 属性       | 类型           | 默认值         | 说明                                                         |
| --- | --- | --- | --- |
| level    | `TextLevel`  | `'body'`    | 排版层级（字号 + 行高配对 + 默认字重），默认 body（14px）                       |
| weight   | `TextWeight` | `undefined` | 字重覆盖；不传时按 level 默认字重                                       |
| color    | `TextColor`  | `'primary'` | 文本颜色（语义 token），默认 primary                                  |
| ellipsis | `boolean`    | `false`     | 单行截断（overflow + text-overflow: ellipsis）；开启后以块级渲染，默认 false |
| tag      | `string`     | `'span'`    | 渲染标签，默认 span                                               |
