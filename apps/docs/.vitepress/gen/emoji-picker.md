<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## EmojiPicker API

### Props

| 属性            | 类型                   | 默认值        | 说明                                                                         |
| --- | --- | --- | --- |
| show          | `boolean`            | —          | —                                                                          |
| stickerPacks  | `EmojiStickerPack[]` | `() => []` | 表情包（sticker pack）列表，默认 [] 不展示表情包 tab / Sticker packs to show as extra tabs |
| closeOnSelect | `boolean`            | `false`    | 选择 emoji / sticker 后自动关闭，默认 false                                          |

### Events

| 事件名              | 参数                                        | 说明 |
| --- | --- | --- |
| `update:show`    | value: boolean                            | —  |
| `select`         | emoji: string                             | —  |
| `select-sticker` | sticker: EmojiStickerItem, packId: string | —  |
