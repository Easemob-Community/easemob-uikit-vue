# useQuote

在消息列表与输入框之间共享引用消息、定位请求和高亮状态。

## 导入与签名

```ts
import { useQuote } from '@easemob-community/uikit-im'

const quote = useQuote()
```

## 返回值

| 成员 | 说明 |
| --- | --- |
| `quotedMessage` | 当前待引用消息 |
| `highlightedMessageId` | 需要高亮的消息 ID |
| `locateRequest` | 带递增 token 的定位请求 |
| `setQuote(message)` / `clearQuote()` | 设置或清空引用 |
| `requestLocate(msgID)` / `setHighlight(msgID)` | 请求定位并控制高亮 |
| `buildQuoteExt(message)` | 构造发送消息所需的引用扩展 |
| `getQuotePreview(message)` | 获取引用摘要 |

## 最小用法

```ts
const { quotedMessage, setQuote, clearQuote, buildQuoteExt } = useQuote()
setQuote(message)
const ext = buildQuoteExt(message)
clearQuote()
```
