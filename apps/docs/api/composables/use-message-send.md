# useMessageSend

向当前会话发送文本、媒体、位置、自定义、CMD 和 `multi_body` 复合消息，并支持失败重发。

## 导入与签名

```ts
import { useMessageSend } from '@easemob-community/uikit-im'

const sender = useMessageSend()
```

## 主要方法

| 方法 | 关键参数 |
| --- | --- |
| `sendTextMessage(text, ext?, options?)` | 文本、业务扩展、群已读配置 |
| `sendImageMessage(data, options?, ext?)` | `File` 或图片 URL |
| `sendFileMessage(file, options?, ext?)` | 浏览器 `File` |
| `sendAudioMessage(file, duration, options?, ext?)` | 音频与时长 |
| `sendVideoMessage(file, duration, options?, ext?)` | 视频与时长 |
| `sendCustomMessage(event, params?, ext?)` | 自定义事件与载荷 |
| `sendMultiBodyMessage(bodies, ext?, options?)` | 2～20 个有序复合分段、业务扩展、群已读配置 |
| `resendMessage(message)` | 重发失败消息；复合消息复用原对象以保留附件上传进度 |

## 最小用法

```ts
const { sendTextMessage } = useMessageSend()
await sendTextMessage('你好')
```

所有发送方法使用当前会话；群已读回执由会话类型、群规模和 `SendMessageOptions` 共同决定。

## 发送复合消息

`MultiBodySegmentInput` 支持 `text/image/file/voice/video/location/custom`。本地文件使用 `data: File`，远端资源使用 `originalUrl`；分段顺序就是接收方的展示顺序。

```ts
const { sendMultiBodyMessage } = useMessageSend()

await sendMultiBodyMessage([
  { type: 'text', content: '请看设计稿' },
  { type: 'image', data: imageFile, filename: imageFile.name },
  { type: 'text', content: '第三版已更新' },
], { source: 'composer' }, { groupReadReceiptEnabled: true })
```

发送创建限制为 2～20 段。websdk4 不支持此能力，调用会得到 `MULTI_BODY_UNSUPPORTED`；内置输入入口还需要同时设置 `input.features.multiBody: true`。复合消息不可编辑或翻译，附件下载可调用 domain 的 `downloadMultiBodyAttachments(message)`，返回按分段顺序排列的附件数组。
