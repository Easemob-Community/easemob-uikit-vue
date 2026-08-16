<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->
## ChatroomLiveInputBar API

### Props

| 属性               | 类型                                                                      | 默认值        | 说明                                                 |
| --- | --- | --- | --- |
| placeholder      | `string`                                                                | —          | 占位文案                                               |
| disabled         | `boolean`                                                               | `false`    | 是否禁用（未进房/被禁言）                                      |
| disabledHint     | `string`                                                                | `''`       | 禁用提示                                               |
| quickPhrases     | `string[]`                                                              | `() => []` | 快捷短语列表（点击即发送）                                      |
| showQuickPhrases | `boolean`                                                               | `true`     | 是否显示快捷短语行                                          |
| maxLength        | `number`                                                                | —          | 最大输入长度                                             |
| sendIntervalMs   | `number`                                                                | —          | 发送最小间隔（ms），小于此间隔触发 send-too-fast                   |
| sendTooFastHint  | `string`                                                                | `''`       | 发送过快提示文案（&#123;&#123;remaining&#125;&#125; 占位剩余毫秒） |
| blockWords       | `string[]`                                                              | —          | 拦截词库，命中则禁止发送并触发 block                              |
| blockHint        | `string`                                                                | `''`       | 拦截提示文案（&#123;&#123;word&#125;&#125; 占位命中词）         |
| beforeSend       | `(text: string) => string \| undefined \| Promise<string \| undefined>` | —          | 发送前自定义校验，返回错误文案则拦截                                 |
| optimistic       | `boolean`                                                               | `false`    | 乐观发送模式：跳过客户端拦截/节流/敏感词检查，直接 emit send，由业务/服务端兜底     |

### Events

| 事件名             | 参数                           | 说明               |
| --- | --- | --- |
| `send`          | text: string                 | 发送文本             |
| `phrase`        | phrase: string               | 点击快捷短语           |
| `block`         | text: string, reason: string | 发送被拦截（敏感词/自定义校验） |
| `send-too-fast` | remainingMs: number          | 发送过快             |

### Slots

| 插槽名             | 说明 |
| --- | --- |
| `quick-phrases` | —  |
| `actions`       | —  |
| `panels`        | —  |
