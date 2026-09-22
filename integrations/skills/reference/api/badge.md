<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## Badge API

### Props

| 属性        | 类型               | 默认值                                | 说明                                                            |
| --- | --- | --- | --- |
| count     | `number`         | —                                  | 徽标数字；超过 max 显示为 "max+"；为 0 或未传时不显示（dot 模式除外）                  |
| max       | `number`         | `99`                               | 数字显示上限，超出后显示为 "max+"，默认 99                                    |
| dot       | `boolean`        | `false`                            | 红点模式：仅显示小圆点不显示数字，默认 false                                     |
| color     | `string`         | `'var(--uikit-badge-bg, #FF7070)'` | 徽标颜色（默认 --uikit-badge-bg #FF7070）：filled 作背景色，stroked 作文字与描边色 |
| size      | `BadgeSize`      | `'l'`                              | 尺寸：xs（仅圆点）/ s / m / l（默认）/ xl / xxl                           |
| variant   | `BadgeVariant`   | `'filled'`                         | 风格：filled（实心，默认）/ stroked（描边）                                 |
| placement | `BadgePlacement` | `'top-right'`                      | 徽标相对容器的位置：top-right（默认）/ bottom-right                         |
| bordered  | `boolean`        | `false`                            | 是否给徽标加 2px 描边与底层内容（如头像）分界；颜色跟随 --uikit-bg-base，暗色自适应          |
| inline    | `boolean`        | `false`                            | 内联模式：徽标不占位覆盖，按文档流渲染（如会话列表行尾未读数），默认 false；开启后 placement 不生效    |
