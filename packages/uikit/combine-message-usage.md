# 合并转发消息（Combine Message）使用侧文档

> 本文档基于 websdk2 SDK 源码提取，供 AI 在实际项目中校验用法是否正确。

---

## 1. 概述

合并消息（`combine`）允许业务侧将一组已有消息打包为一条合并消息发送，接收方可按需下载并解析合并消息中的子消息列表。

**核心能力：**

- 创建合并消息（`createCombineMessage`）
- 发送合并消息（`sendMessage`，SDK 自动编码 → 上传 → 发送）
- 接收合并消息（通过 `onMessage` 事件回调，`message.type === 'combine'`）
- 按需下载并解析合并消息详情（`downloadAndParseCombineMessage`）
- 支持合并消息再次转发，通过 `combineLevel` 限制最多 10 级嵌套

---

## 2. 前置条件

```ts
import { ChatClient } from 'easemob-websdk';
import { ChatManager } from 'easemob-websdk';

const client = ChatClient.init({ appKey: 'your#app' });
client.use(ChatManager);

// 登录后才能使用消息域 API
await client.login('user_1', 'token');
```

---

## 3. API 签名

### 3.1 createCombineMessage

```ts
public createCombineMessage(params: CreateCombineMessageParams): Message
```

创建合并消息对象，用于发送聊天记录合集。**仅创建本地消息对象，不发送**。

#### 参数类型

```ts
interface CreateCombineMessageParams extends CreateMessageBaseParams {
  /** 合并消息标题（必填，非空字符串） */
  title: string;
  /** 合并消息摘要（必填，非空字符串） */
  summary: string;
  /** 兼容展示文本，默认 `[聊天记录]`。仅写入上行协议文本字段，不出现在返回的 Message 对象中 */
  compatibleText?: string;
  /** 被合并的消息列表（必填，1～300 条） */
  messageList: ReadonlyArray<Message>;
}
```

`CreateMessageBaseParams` 公共字段：

```ts
interface CreateMessageBaseParams {
  /** 会话 ID；单聊为对端用户 ID，群聊为 groupId，聊天室为 chatroomId */
  conversationId: string;
  /** 会话类型：'singleChat' | 'groupChat' | 'chatRoom' */
  conversationType: 'singleChat' | 'groupChat' | 'chatRoom';
  /** 消息扩展字段，需 JSON 可序列化 */
  ext?: Record<string, unknown>;
  /** 本地时间戳（毫秒），不传由 SDK 生成 */
  timestamp?: number;
  /** 定向消息接收者列表（仅群聊有效） */
  receiverList?: string[];
  /** 是否仅投递给在线用户 */
  deliverOnlineOnly?: boolean;
  /** webhookEnv 字段 */
  webhookEnv?: string;
  /** 消息优先级：'high' | 'normal' | 'low' */
  priority?: 'high' | 'normal' | 'low';
  /** 是否需要消息已读回执 */
  needReadReceipt?: boolean;
  /** 是否创建 Thread 回复消息（仅群聊 Thread 有效） */
  isChatThread?: boolean;
}
```

#### 返回值

`Message` 对象，其关键结构：

```ts
interface Message {
  type: 'combine';
  body: CombineMessageBody;
  // ... 其他标准 Message 字段
}

interface CombineMessageBody {
  title: string;            // 合并消息标题
  summary: string;          // 合并消息摘要
  messageList?: ReadonlyArray<Message>; // 详情子消息列表（仅发送阶段保留）
  url?: string;             // 合并载荷下载地址（发送上传后填充）
  filename: string;         // 合并载荷文件名（默认 'combine'）
  filetype: string;         // 合并载荷文件类型（默认 'application/octet-stream'）
  fileLength?: number;      // 合并载荷文件大小（上传后填充）
  secret?: string;          // 合并载荷下载密钥（上传后填充）
  combineLevel: number;     // 当前合并消息层级（SDK 自动计算）
}
```

#### 错误码

| Code | Key                       | 原因                                           | 处理建议                                     |
| ---- | ------------------------- | ---------------------------------------------- | -------------------------------------------- |
| 110  | validation_invalid        | 会话参数非法，或 title/summary/messageList 为空，或合并消息条目格式非法 | 传入合法的标题、摘要和 1～300 条可合并消息   |
| 4    | combine_level_exceeded    | 合并消息嵌套层级超过 10                         | 减少合并消息嵌套层级后重试                   |
| 500  | combine_encode_failed     | 合并消息内容无法编码                           | 检查被合并消息的消息体和扩展字段是否合法     |

---

### 3.2 sendMessage

```ts
public async sendMessage(message: Message, options?: SendMessageOptions): Promise<Message>
```

发送已创建的合并消息。SDK 会自动执行以下流程：

1. 将 `messageList` 编码为二进制载荷（JSON 序列化 + 长度前缀 + 校验和）
2. 通过附件上传链路上传载荷，获取 `url`、`secret`、`fileLength`
3. 用上传返回的资源地址补齐消息体后发送

> 合并消息的发送行为与图片/文件等附件类消息一致：先上传，后发送。

#### 返回值

发送成功后的 `Message` 对象（包含 `msgServerId`、更新后的 `body.url` 等）。

---

### 3.3 downloadAndParseCombineMessage

```ts
public async downloadAndParseCombineMessage(
  params: DownloadCombineMessageInput
): Promise<ReadonlyArray<Message>>
```

下载并解析合并消息内容，返回合并消息中的子消息列表。

#### 参数类型（联合类型，两种调用方式）

**方式一：传完整合并消息对象**

```ts
interface DownloadCombineMessageByMessageInput {
  /** 合并消息对象。SDK 会从 message.body 读取下载地址与密钥 */
  message: Message;
  /** 下载超时（毫秒），不传使用 SDK 默认值 */
  timeoutMs?: number;
  /** 单次允许解码的最大消息条数，不传默认最多 300 条 */
  maxItems?: number;
}
```

**方式二：传最小下载参数（从 body 中取出的 url 和 secret）**

```ts
interface DownloadCombineMessageParams {
  /** 合并消息详情下载地址（必填） */
  url: string;
  /** 下载密钥；服务端未下发时可不传 */
  secret?: string;
  /** 下载超时（毫秒） */
  timeoutMs?: number;
  /** 单次允许解码的最大消息条数，默认 300 */
  maxItems?: number;
}
```

#### 返回值

`ReadonlyArray<Message>` —— 合并消息中的子消息列表，顺序与发送时传入的 `messageList` 一致。

#### 错误码

| Code | Key                  | 原因                                                 | 处理建议                                                                     |
| ---- | -------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| 110  | validation_invalid   | 传入消息不是合并消息，或缺少下载地址                 | 传入 `type` 为 `combine` 且包含有效 `url` 的消息，或直接传入有效的 `url/secret` |
| 110  | invalid_param        | 消息为空                                             | -                                                                            |
| 500  | invalid_type         | 消息不是合并消息类型                                 | -                                                                            |
| 401  | parse_failed         | 合并消息解析失败（任一子消息解析失败则整体失败）     | 检查合并消息载荷是否完整                                                     |
| 403  | download_failed      | 合并消息下载失败                                     | 检查网络或 url 是否有效                                                       |

---

## 4. 使用示例

### 4.1 发送合并消息

```ts
// 1. 准备要合并的消息列表（来自历史消息、当前会话等）
const selectedMessages: Message[] = [
  // 可以是文本、图片、文件、语音、视频、位置、自定义、以及合并消息
  textMessage1,
  imageMessage1,
  // ...
];

// 2. 创建合并消息
const combineMessage = client.chatManager.createCombineMessage({
  conversationId: 'group_1',
  conversationType: 'groupChat',
  title: '聊天记录',
  summary: '3 条消息',
  messageList: selectedMessages,
});

// 3. 发送（SDK 自动编码 → 上传 → 发送）
const sent = await client.chatManager.sendMessage(combineMessage);
console.log(sent.msgServerId); // 服务端消息 ID
console.log(sent.body.url);    // 上传后的资源地址
console.log(sent.body.combineLevel); // 合并层级
```

### 4.2 发送合并消息（带兼容文本）

```ts
const combineMessage = client.chatManager.createCombineMessage({
  conversationId: 'user_2',
  conversationType: 'singleChat',
  title: '聊天记录',
  summary: '2 条消息',
  compatibleText: '[旧端提示：这是一条合并消息]',
  messageList: [msg1, msg2],
});

await client.chatManager.sendMessage(combineMessage);
```

> `compatibleText` 仅写入上行协议的文本字段，用于旧版本客户端展示兜底文本。返回的 `Message` 对象的 `body` 中**不包含** `compatibleText` 字段。

### 4.3 接收合并消息

合并消息没有独立的事件回调，通过标准 `onMessage` 事件接收：

```ts
client.chatManager.addEventHandler('chat-page', {
  onMessage: (message) => {
    if (message.type === 'combine') {
      console.log('收到合并消息:');
      console.log('  标题:', message.body.title);
      console.log('  摘要:', message.body.summary);
      console.log('  下载地址:', message.body.url);
      console.log('  合并层级:', message.body.combineLevel);
      // 注意：接收到的合并消息 body 中不包含 messageList
      // 需要调用 downloadAndParseCombineMessage 获取子消息详情
    }
  },
});
```

### 4.4 下载并解析合并消息详情

```ts
// 方式一：传完整合并消息对象
const messages = await client.chatManager.downloadAndParseCombineMessage({
  message: combineMessage,
});
console.log(messages.length); // 子消息条数
console.log(messages[0].type); // 'text' | 'image' | ...
```

```ts
// 方式二：从 body 中取 url 和 secret
const messages = await client.chatManager.downloadAndParseCombineMessage({
  url: combineMessage.body.url,
  secret: combineMessage.body.secret,
});
```

### 4.5 合并消息再次转发（嵌套）

```ts
// 将已收到的合并消息加入新的 messageList 再次转发
const newCombine = client.chatManager.createCombineMessage({
  conversationId: 'user_3',
  conversationType: 'singleChat',
  title: '转发的聊天记录',
  summary: '包含合并消息的合集',
  messageList: [textMessage, receivedCombineMessage], // messageList 中包含 combine 类型
});

// SDK 自动计算新的 combineLevel = max(子消息中最高 combineLevel) + 1
// 如果计算后超过 10，createCombineMessage 会抛出 combine_level_exceeded (code=4) 错误
await client.chatManager.sendMessage(newCombine);
```

---

## 5. messageList 子消息约束

`messageList` 中的每条消息必须满足以下条件：

| 字段              | 要求                                                   |
| ----------------- | ------------------------------------------------------ |
| `type`            | 非空字符串；支持 `text`/`image`/`file`/`voice`/`video`/`location`/`custom`/`cmd`/`combine` |
| `sender.userId`   | 非空字符串                                             |
| `conversationId`  | 非空字符串                                             |
| `conversationType`| `singleChat` / `groupChat` / `chatRoom`               |
| `timestamp`       | 正整数（毫秒）                                         |
| `body`            | 普通对象                                               |
| `combineLevel`    | 若 `type === 'combine'`，必须为 0～10 的整数           |

**条数限制：** 1～300 条，超过 300 条会被拒绝。

**顺序保证：** SDK 严格保持传入 `messageList` 的原始顺序，不自动重排。下载解析后的子消息顺序与发送时一致。

**系统消息：** ACK/回执/撤回等系统消息不允许作为 `messageList` 子项。

---

## 6. 合并层级（combineLevel）规则

| 规则              | 说明                                                        |
| ----------------- | ----------------------------------------------------------- |
| 初始层级          | 不包含子合并消息时，`combineLevel = 1`                      |
| 嵌套计算          | `新 combineLevel = max(messageList 中子合并消息的 combineLevel) + 1` |
| 最大层级          | 10，超过则 `createCombineMessage` 抛出 `combine_level_exceeded` (code=4) |
| 层级来源          | 优先读取 `message.body.combineLevel`；兼容旧格式 `message.combineLevel` |

---

## 7. 错误码汇总

| Code | 内部 Key                     | 场景                              | 含义                             |
| ---- | ----------------------------- | --------------------------------- | -------------------------------- |
| 110  | COMBINE_INVALID_INPUT         | createCombineMessage / download   | 合并消息输入参数非法             |
| 4    | COMBINE_LEVEL_EXCEEDED        | createCombineMessage              | 合并消息嵌套层级超过 10          |
| 4    | COMBINE_ITEM_LIMIT_EXCEEDED   | createCombineMessage / download   | 合并消息条数超过 300             |
| 500  | COMBINE_ENCODE_FAILED         | sendMessage                       | 合并消息内容编码失败             |
| 402  | COMBINE_UPLOAD_FAILED         | sendMessage                       | 合并消息上传失败                 |
| 2    | COMBINE_DOWNLOAD_FAILED       | downloadAndParseCombineMessage    | 合并消息下载失败                 |
| 500  | COMBINE_PARSE_FAILED          | downloadAndParseCombineMessage    | 合并消息解析失败（整体失败语义） |

> **解析失败语义：** 按需下载并解析合并消息详情时，采用"全量成功或整体失败"策略。任一子消息解析失败，SDK 返回整体失败错误，不返回部分成功结果。

---

## 8. 完整闭环示例

```ts
import { ChatClient, ChatManager } from 'easemob-websdk';

// 初始化
const client = ChatClient.init({ appKey: 'your#app' });
client.use(ChatManager);

// 注册事件
client.chatManager.addEventHandler('main', {
  onMessage: (message) => {
    if (message.type === 'combine') {
      console.log(`[合并消息] ${message.body.title} - ${message.body.summary}`);
      // 按需下载详情
      client.chatManager
        .downloadAndParseCombineMessage({ message })
        .then((children) => {
          console.log(`解析到 ${children.length} 条子消息`);
        })
        .catch((err) => {
          console.error('合并消息解析失败:', err);
        });
    }
  },
});

await client.login('user_1', 'token');

// 从历史消息中选取要合并的消息
const history = await client.chatManager.getHistoryMessages({
  conversationId: 'user_2',
  conversationType: 'singleChat',
  pageSize: 10,
});

// 创建并发送合并消息
const combineMsg = client.chatManager.createCombineMessage({
  conversationId: 'user_3',
  conversationType: 'singleChat',
  title: '与 user_2 的聊天记录',
  summary: `${history.messages.length} 条消息`,
  messageList: history.messages,
});

const sent = await client.chatManager.sendMessage(combineMsg);
console.log('合并消息已发送，msgServerId:', sent.msgServerId);
```

---

## 9. 注意事项

1. **合并消息不是独立事件类型**：接收方通过 `onMessage` 收到，需自行判断 `message.type === 'combine'`。
2. **接收时不自动下载**：SDK 默认只回调合并消息的元信息（标题、摘要、url 等），不自动下载子消息详情。
3. **`compatibleText` 不出现在返回对象中**：该字段仅写入上行协议文本字段，用于旧端兜底展示。
4. **发送流程含上传步骤**：`sendMessage` 会先编码 `messageList` 为二进制载荷并上传，上传成功后才发送最终消息。如果上传失败，发送流程终止。
5. **`combineLevel` 由 SDK 自动计算**：业务侧不能手动设置，SDK 在 `createCombineMessage` 阶段计算并校验。
6. **跨平台一致**：Web、微信小程序等受支持平台上的 API 签名与行为一致。
