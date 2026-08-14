<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## EmojiPicker API

### Props

| 属性            | 类型                   | 默认值        | 说明                                                                         |
| --- | --- | --- | --- |
| show          | `boolean`            | —          | 是否显示面板，内部按 v-if 渲染；关闭时通过 update:show 通知父组件 / Whether to show the picker    |
| stickerPacks  | `EmojiStickerPack[]` | `() => []` | 表情包（sticker pack）列表，默认 [] 不展示表情包 tab / Sticker packs to show as extra tabs |
| closeOnSelect | `boolean`            | `false`    | 选择 emoji / sticker 后自动关闭，默认 false                                          |

### Events

| 事件名              | 参数                                        | 说明                                                                                 |
| --- | --- | --- |
| `update:show`    | value: boolean                            | 面板显隐状态变化时触发（关闭携带 false），用于 v-model:show 同步 / Emitted when visibility changes       |
| `select`         | emoji: string                             | 点击 emoji 时触发，负载为选中的 emoji 字符 / Emitted when an emoji is picked                     |
| `select-sticker` | sticker: EmojiStickerItem, packId: string | 点击表情包中的 sticker 时触发，负载为 sticker 项与其所属 pack 的 id / Emitted when a sticker is picked |
