# 会话摘要与显示名工具

用于生成会话最后消息摘要，以及按统一优先级解析用户展示名。

## 摘要函数与标签

| 名称 | 用途 |
| --- | --- |
| `resolveLastMessageText` | 根据消息类型、内容、扩展和标签生成摘要 |
| `defaultLastMessageTextResolver` | 默认摘要解析器 |
| `resolveMultiBodyPreview` | 按复合消息首段与配置后缀生成统一摘要 |
| `formatConversationPreview` | 格式化会话预览文本 |
| `mergeMessagePreviewLabels` | 合并自定义与默认摘要标签 |
| `defaultMessagePreviewLabels` | 默认标签集合 |
| `chineseMessagePreviewLabels` | 内置中文标签，如 `[图片]`、`[语音]`、`[聊天记录]` |
| `customEventPreviewMap` | 内置自定义事件到摘要的映射 |

```ts
import {
  mergeMessagePreviewLabels,
  resolveLastMessageText,
} from '@easemob-community/uikit-im'

const labels = mergeMessagePreviewLabels(customLabels)
const preview = resolveLastMessageText(message, undefined, undefined, undefined, labels)
```

`MessagePreviewLabels` 另包含 `multiBody`（无可用摘要时的兜底）与 `multiBodyMore`（首段后的附加后缀，默认为 `...`，自定义时可使用 `{count}` 插值）。复合消息统一使用：

```ts
import { resolveMultiBodyPreview } from '@easemob-community/uikit-im'

const preview = resolveMultiBodyPreview(message, chineseMessagePreviewLabels)
// 首段为“请看资料”时：'请看资料 ...'
```

## resolveUserDisplayName

```ts
resolveUserDisplayName(stores: RootStores, userId: string): string | undefined
```

按“联系人备注 → 用户资料昵称”解析；均无结果时返回 `undefined`。

## resolveSenderDisplayName

```ts
resolveSenderDisplayName(stores: RootStores, message: UiMessage): string
```

按“联系人备注 → 用户资料昵称 → 消息 ext 昵称快照 → ext 备注快照 → userId”解析发送者展示名。
