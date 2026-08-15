# SDK 类型缺陷报告（im-sdk-web@5.x）

> 本文档汇总了 UIKit 在消除 `any` 类型过程中发现的 SDK 类型缺陷，供反馈给 SDK 开发团队。

---

## 1. `Message` 类型未从主入口导出

- **影响文件**: `sdk/client.ts`, `sdk/types.ts`
- **描述**: `Message` 接口定义在 `dist/types/index.d.ts`，但未通过 `dist/index.d.ts` 导出。
- **当前绕过方式**: 通过 `Awaited<ReturnType<ChatManager['sendMessage']>>` 间接提取类型。
- **建议**: 将 `Message` 添加到 `dist/index.d.ts` 的 `export type` 中。

## 2. `MessageBody` 联合类型未从主入口导出

- **影响文件**: `sdk/event-handler.ts`
- **描述**: `MessageBody`（`TextMessageBody | ImageMessageBody | ...` 联合类型）未导出。
- **当前绕过方式**: `body` 字段被标注为 `any`，无法在编译期约束精确类型。
- **建议**: 将 `MessageBody` 添加到 `dist/index.d.ts` 的 `export type` 中。

## 3. `msgConfig` 字段未在 `Message` 类型中暴露

- **影响文件**: `sdk/event-handler.ts`
- **描述**: WebSocket 层实际下发 `msgConfig.allowGroupAck` 用于群已读回执标记，但 `Message` 接口未声明此字段。
- **当前绕过方式**: `(sdkMsg as any).msgConfig?.allowGroupAck`。
- **建议**: 在 `Message` 接口中增加 `msgConfig?: { allowGroupAck?: boolean }` 字段。

## 4. `ContactManager.getContactsWithCursor()` 不存在

- **影响文件**: `use-contact.ts`, `uikit-provider.vue`, `sdk/client.ts`
- **描述**: SDK 仅提供 `getContacts()` 返回内存中的完整联系人列表，缺少带分页参数的 `getContactsWithCursor` 方法。
- **当前绕过方式**: `as any` 桥接，保留占位实现以维持 UIKit 分页接口兼容性。
- **建议**: 在 `ContactManager` 上新增 `getContactsWithCursor(params: { pageSize?: number; cursor?: string })` 方法。

## 5. `ConversationItem` 缺少 `isMuted`/`display`/`remindType` 字段

- **影响文件**: `use-conversation.ts`
- **描述**: 这些字段仅在 `SessionItem`（通过 `getSessionList` 获取）中可用，`ConversationItem`（通过 `getConversationList` 获取）不包含它们。
- **当前绕过方式**: `(item as any).isMuted`、`(item as any).display`、`(item as any).remindType`。
- **建议**: 考虑在 `ConversationItem` 中补齐这些字段，或提供文档说明两者的差异和适用场景。

## 6. `ConversationItem.lastMessage` 缺少 `from` 字段

- **影响文件**: `use-conversation.ts`
- **描述**: `lastMessage` 类型仅有 `msgId`、`type`、`body`、`timestamp`，缺少发送者 `from` 字段。
- **当前绕过方式**: `(lastMsg as any)?.from || ''`。
- **建议**: 在 `ConversationItem.lastMessage` 中增加 `from?: string` 字段。

## 7. `PinnedMessageSummary` 不包含 `message` 字段

- **影响文件**: `use-chat.ts`
- **描述**: `PinnedMessageSummary` 仅含 `messageId`、`conversationId`、`operatorId`、`pinnedAt`，无法获取完整的消息对象。
- **当前绕过方式**: 仅用 `messageId` 构造占位 UI Message，sender/body/type 等信息缺失。
- **建议**: 在 `PinnedMessageSummary` 中增加 `message?: Message` 字段，或提供根据 `messageId` 批量获取消息的便捷方法。

## 8. `modifyMessage` 返回的 `Message` 不含 `modifiedInfo`

- **影响文件**: `use-chat.ts`
- **描述**: `modifyMessage` 返回标准 `Message` 类型，不包含 `modifiedInfo`（操作者、修改次数、时间等）。
- **当前绕过方式**: `result as any` 后访问 `result?.modifiedInfo`。
- **建议**: 扩展返回值类型或新增 `ModifiedMessage` 类型包含 `modifiedInfo` 字段。

## 9. `downloadAndParseCombineMessage` 仅接受 `{ message: Message }` 参数

- **影响文件**: `combine-message-modal.vue`
- **描述**: SDK 公共 API `DownloadCombineMessageInput` 仅支持传入完整 `Message` 对象。业务层保存的是从消息体提取的 `{ url, secret }` 格式（即 `DownloadCombineMessageParams`），两者不兼容。
- **当前绕过方式**: `as any` 传入 `{ url, secret }`。
- **建议**: ChatManager 的 `downloadAndParseCombineMessage` 应同时支持 `DownloadCombineMessageParams`（`{ url, secret }`）格式。

## 10. `GroupListResult` 未声明 `total` 字段

- **影响文件**: `sdk/client.ts`
- **描述**: 服务端 `getJoinedGroupList` 实际返回中包含 `total`（群组总数），但 `GroupListResult` 类型未声明。
- **当前绕过方式**: `typeof (res as any)?.total === 'number' ? (res as any).total : 0`。
- **建议**: 在 `GroupListResult` 中增加 `total?: number` 字段。

## 11. `PublishPresenceParams` 未从主入口导出

- **影响文件**: `sdk/client.ts`
- **描述**: `PresenceManager.publishPresence` 所需参数类型未在 `dist/index.d.ts` 中导出。
- **当前绕过方式**: `{ customStatus: description } as any`。
- **建议**: 将 `PublishPresenceParams` 添加到 `dist/index.d.ts` 的 `export type` 中。

## 12. `ChatClient.logger` 未在公开 API 中暴露

- **影响文件**: `sdk/client.ts`
- **描述**: 无法通过类型安全的方式设置日志级别（debug 模式）。
- **当前绕过方式**: `(this._client as any).logger.setLevel('debug')`。
- **建议**: 在 `ChatClient` 上暴露 `logger` 属性或其类型定义。

## 13. 群组事件 payload 中字段类型为 `UserInfo` 而非裸字符串

- **影响文件**: `sdk/event-handler.ts`
- **描述**: 群管理员变更事件的 `administrator`、禁言事件的 `mutes` 等字段类型为 `UserInfo` 或 `UserInfo[]`，而 UIKit 当前仅处理 `userId` 字符串。
- **当前绕过方式**: 整个 `groupHandler` 的 payload 参数标注为 `any`。
- **建议**: 确认事件 payload 的实际运行时结构（`string` 还是 `UserInfo`），统一类型定义。

## 14. `getPinnedMessageList` 参数类型不支持分页

- **影响文件**: `sdk/client.ts`
- **描述**: `GetPinnedMessageListParams` 仅包含 `ConversationIdentifier`，不支持 `pageSize`/`cursor` 分页参数。
- **当前绕过方式**: `as any` 透传 `pageSize`/`cursor`。
- **建议**: 扩展 `GetPinnedMessageListParams` 支持分页参数。
