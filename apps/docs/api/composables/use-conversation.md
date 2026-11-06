# useConversation

管理会话选择、同步、分页、置顶、免打扰、已读、删除和草稿。

## 导入与签名

```ts
import { useConversation } from '@easemob-community/uikit-im'

const conversation = useConversation()
```

## 返回值

- **状态**：`conversationList`、`currentConversation`、`isSyncing`、`hasMore`、`loadingMore`。
- **会话操作**：`selectConversation`、`leaveConversation`、`refreshConversations`、`loadMoreConversations`、`pinConversation`、`muteConversation`、`markConversationRead`、`deleteConversation` 等。
- **本地数据**：`syncLocalConversations`、`setLocalConversationList`。
- **文本草稿**：`saveDraft(conversationId, text)`、`loadDraft(conversationId)`、`clearDraft(conversationId)`。
- **完整输入快照**：`saveInputDraft(conversationId, draft)`、`loadInputDraft(conversationId)`，主要由 Chat 在切换会话时自动调用；快照包含有序摘要，PC 复合模式还包含编辑器与附件状态。

## 最小用法

```ts
const { conversationList, selectConversation, saveDraft } = useConversation()

selectConversation('user-b')
saveDraft('user-b', '待发送内容')
```

草稿功能受 `features.enableDraft` 控制；持久化方式由会话容器的 `draftStorage` 配置决定。完整附件快照仅在当前页面生命周期内有效，`local/session` 刷新后只恢复文本，旧字符串 API 行为不变。
