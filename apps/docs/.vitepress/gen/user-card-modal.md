<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## UserCardModal API

### Props

| 属性                | 类型                                       | 默认值       | 说明                                                                                                                                                                               |
| --- | --- | --- | --- |
| show              | `boolean`                                | —         | —                                                                                                                                                                                |
| userId            | `string`                                 | —         | —                                                                                                                                                                                |
| enableAudioAction | `boolean`                                | `false`   | 是否展示语音通话入口（SDK 无 RTC 能力，点击仅抛 audio-call 事件由消费方接管），默认 false                                                                                                                       |
| enableVideoAction | `boolean`                                | `false`   | 是否展示视频通话入口（SDK 无 RTC 能力，点击仅抛 video-call 事件由消费方接管），默认 false                                                                                                                       |
| showAlias         | `boolean`                                | `true`    | 联系人档是否展示备注（User Alias）编辑区，默认 true                                                                                                                                                |
| anchor            | `HTMLElement`                            | —         | 锚定触发元素：传入后名片相对该元素无遮罩弹出（仅桌面端，移动端回落为底部抽屉）；不传维持居中弹窗                                                                                                                                 |
| placement         | `'bottom' \| 'top' \| 'left' \| 'right'` | `'right'` | 相对锚点的位置，默认 'right'（仅锚定模式生效，边界不足时自动翻转）                                                                                                                                            |
| align             | `'start' \| 'center' \| 'end'`           | `'start'` | 锚定轴上的对齐方式，默认 'start'（仅锚定模式生效）                                                                                                                                                    |
| offset            | `number`                                 | `8`       | 与锚点的间距（px），默认 8（仅锚定模式生效）                                                                                                                                                         |
| enablePresence    | `boolean`                                | —         | 是否展示在线状态，默认跟随 Provider 全局 enablePresence 配置；<br>主动查看场景（名片）默认展示，传 false 可单独关闭。<br>Whether to show presence. Defaults to the global enablePresence feature; pass false to opt out. |

### Events

| 事件名              | 参数                               | 说明                                             |
| --- | --- | --- |
| `update:show`    | value: boolean                   | —                                              |
| `send-message`   | userId: string                   | —                                              |
| `contact-added`  | userId: string                   | 陌生人档点击「加好友」且申请发送成功后触发                          |
| `deleted`        | userId: string                   | 删除联系人成功后触发                                     |
| `block-changed`  | userId: string, blocked: boolean | 拉黑/取消拉黑成功后触发                                   |
| `remark-changed` | userId: string, remark: string   | 备注保存成功后触发                                      |
| `audio-call`     | userId: string                   | 点击语音通话入口时触发（需 enableAudioAction 开启，通话能力由消费方实现） |
| `video-call`     | userId: string                   | 点击视频通话入口时触发（需 enableVideoAction 开启，通话能力由消费方实现） |
| `close`          | —                                | —                                              |
