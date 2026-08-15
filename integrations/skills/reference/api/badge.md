<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Badge API

### Props

| 属性      | 类型             | 默认值                           | 说明                                            |
| --- | --- | --- | --- |
| count   | `number`       | —                             | 徽标数字；超过 max 显示为 "max+"；为 0 或未传时不显示（dot 模式除外）  |
| max     | `number`       | `99`                          | 数字显示上限，超出后显示为 "max+"，默认 99                    |
| dot     | `boolean`      | `false`                       | 红点模式：仅显示小圆点不显示数字，默认 false                     |
| color   | `string`       | `'var(--uikit-danger-color)'` | 徽标颜色（默认 danger 色）：filled 作背景色，stroked 作文字与描边色 |
| size    | `BadgeSize`    | `'normal'`                    | 尺寸：normal（默认）/ small                          |
| variant | `BadgeVariant` | `'filled'`                    | 风格：filled（实心，默认）/ stroked（描边）                 |
