# Vue3 UIKit 聊天交互契约（操作菜单 / 引用 / 转发 / 多选 / 编辑 / 翻译 / 置顶 / 搜索）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-chat-interactions**。

## 触发词

- `消息操作` / `操作菜单` / `长按菜单` / `右键菜单`
- `引用` / `quote` / `回复消息`
- `转发` / `forward` / `合并转发`
- `多选` / `multi-select` / `批量删除`
- `编辑消息` / `重新编辑` / `reedit`
- `翻译` / `语音转文字` / `撤回消息` / `删除消息` / `重发`
- `置顶消息` / `pinned` / `消息搜索` / `群已读回执`

## 目标

在 `packages/uikit/src/modules/chat/` 的交互子系统（操作菜单/引用/转发/多选/编辑/翻译/
置顶/搜索/已读）里新增或修改行为时，**先看清 `ChatConfig` 契约与既有实现**，避免三类翻车：

1. 新增一个操作类型只改菜单 UI，漏掉 `MessageActionType` 联合、`bubble-wrapper` 事件转发、
   `chat.vue` 执行链路三层；
2. 引用/转发/翻译等状态各自造模块级 ref，绕过 `useQuote()` / `useMessageActions()` 已有单例；
3. 新增开关不在 `ChatConfig` 里声明并给默认值，外部用户无法配置。

> 边界：本 skill 讲 **消息之上的交互行为**；消息气泡的展示/状态/已读激活逻辑见
> `uikit-message-rendering`；输入框编辑器见 `uikit-tiptap-editor`；发送链路底层见
> `uikit-store-composable` / `websdk2-uikit-migration`。

## 1. 配置总闸：`ChatConfig`（`modules/chat/types.ts`，改行为先加配置）

聊天全部可配置行为集中在 `ChatConfig`，**新增行为 = 先在 `ChatConfig` 声明配置项并给默认值**：

- `enableDraft`：草稿（默认 true）
- `hooks: ChatSendHooks`：`beforeSend(message) => false 阻止发送`、`afterSend(message)` 回调
- `header`：`visible/align/customSlot/showAvatar/showMemberCount`
- `messageList`：见 `uikit-message-rendering` 第 5 节
- `messageAction`：**操作菜单开关总闸**（见下节）
- `groupReadReceipt`：`enabled`（默认 false）+ `maxGroupSize`（默认 200，超过不发已读回执）
- `groupMember`：`allowChat: 'all' | 'contact' | 'none'`
- `groupManagement`：`displayMode: 'drawer' | 'modal'`（默认 drawer）+ 各入口显隐
- `input`：`mode/style/features(emoji,image,file,voice,video,mention)/autoFocus/maxLength/mention/resizable/expandable/stickerPacks`
- `lastMessageTextResolver`：会话列表摘要解析器（custom 消息预览可自定义）
- `textMessage`：`enableLinkify/onLinkClick/enableMentionHighlight/onMentionClick`

## 2. 消息操作菜单：三层链路，缺一不可

**类型契约**（`modules/chat/types.ts`）：

```ts
export type MessageActionType =
  | 'quote' | 'copy' | 'download' | 'delete' | 'recall' | 'recallOther'
  | 'edit' | 'forward' | 'multiSelect' | 'translate' | 'voiceToText' | 'pin' | 'unpin'

export interface MessageActionItem {
  type: MessageActionType
  label: string
  icon?: string
  danger?: boolean // 危险操作红色高亮
  disabled?: boolean
  disabledTip?: string
}

export interface MessageActionEvent {
  action: MessageActionType
  message: UiMessage
}
```

**三层链路**（新增操作类型必须同步改）：

1. **菜单构建**（`bubble-wrapper.vue`）：按消息类型/身份/配置动态生成 `MessageActionItem[]`，由 `ChatConfig['messageAction']` 各开关过滤（`enableQuote`/`enableCopy`/`enableDownload`/`enableDelete`/`enableRecall`/`enableRecallOther`/`enableEdit`/`enableForward`/`enableMultiSelect`/`enableTranslate`/`enableVoiceToText`/`enablePin`，默认全 true）；
2. **菜单渲染**（`message-action-menu.vue`）：纯展示组件，只收 `actions` 数组、`emit('select', item)`，disabled 项点击直接忽略；`#extra` 插槽可追加自定义项；
3. **执行链路**（`chat.vue`）：`emit('action', { action, message })` 逐级上抛，`chat.vue` 按 action 分发到 `useChat()` 暴露的方法（`recallMessage`/`deleteMessage`/`pinMessage`/`unpinMessage`/`translateTextMessage`/`toggleTranslation`/`transcribeVoiceMessage`/`toggleVoiceText`/`resendMessage`/`enterMultiSelectMode`/`setQuote`...）。

**执行细节**：

- 撤回：`recallDisableDuration` 默认 2 分钟（120000ms），超时禁用并提示；`enableRecallOther`
  仅群主/管理员在群聊中生效；失败 Toast 用 `resolveSdkErrorMessage` 提取原因（`use-message-actions.ts`）。
- 编辑：仅 `isSelf` 文本消息，`emit('reedit')` 进编辑态（`editing-bar.vue`），发送链路走
  `modifyTextMessage(target, text)`，修改标识以 `modifiedInfo` 为准。
- 翻译：`translateTargetLang` 不设置时按 UIKIT locale 自动选择（zh-CN→zh-Hans，en→en，其他默认 en）；
  `resolveTranslateLang()` 在 `use-message-actions.ts`。
- 语音转文字：错误提示统一走 `resolveVoiceToTextErrorMessage()`（按 SDK code 映射文案）。
- 重发：`resendMessage` 仅失败消息可用。

## 3. 引用（quote）：`useQuote()` 模块级单例 + `ext.msgQuote` 协议

`composables/use-quote.ts` 的**模块级单例状态**（不是 provide/inject，全应用共享一份）：

```ts
quotedMessage // 当前输入框引用的消息
highlightedMessageId // 需要闪烁高亮的消息 ID
locateRequest // { msgID, token } 定位请求，token 递增保证相同 msgID 也能触发 watch
```

**引用协议 `MsgQuotePayload`**（写入 `ext.msgQuote`，跨端可读）：

```ts
interface MsgQuotePayload {
  msgID: string // 原消息 ID（msgServerId 优先，其次 msgLocalId）
  msgPreview: string // 预览文本
  msgSender: string // 发送人显示名 / ID
  msgType: 'text' | 'image' | 'video' | 'file' | 'voice' | 'custom' | 'location' | 'cmd'
  msgThumbUrl?: string // 图片/视频类消息带缩略图，接收方无需加载原消息
}
```

- 预览文本用 `getQuotePreview(message)`：文本取内容，其余类型用 `[图片]/[语音]/[视频]/[文件]/[位置]`
  兜底标签；custom 消息按 `event` 查 `customEventPreviewMap`（与会话列表摘要共用，如 `userCard → [名片]`）。
- 构造 ext 用 `buildQuoteExt(message)`，只返回 `{ msgQuote }` 片段，调用方与其他 ext 合并。
- 引用卡点击定位：气泡内 `QuoteCard` 点击 → `requestLocate(msgID)`；列表端 watch `locateRequest`
  滚动定位 + `highlightedMessageId` 闪烁；`setHighlight('')` 取消闪烁。

## 4. 转发（forward）：单选与合并两种模式

- 入口：操作菜单 `forward` → `forward-modal.vue`（会话搜索选择，移动端 bottom、PC center Popup）。
- 单选转发：`chat.vue` 调 `useChat().forwardMessage`（`FORWARD_MODE.ONE_BY_ONE`，逐条转发保留原消息）。
- 合并转发：操作菜单选择多消息后，走 `FORWARD_MODE.COMBINE`（`sendCombineMessage`），
  产物 body 为 `CombineMessageBody`（`title/summary/messageList`），渲染见 `uikit-message-rendering` 4.4。
- **合并转发子消息的昵称解析**：子消息 `from` 为远端文件内容，`useUserInfo` 查不到时
  回退 `ext.ease_chat_uikit_user_info` 快照（见 `uikit-user-attribute-extraction` 2.2）。

## 5. 多选模式：`useMessageActions` 的模块级单例

```ts
isMultiSelectMode // ref<boolean>
selectedMessageIds // ref<Set<string>>
toggleMessageSelection(messageId)
enterMultiSelectMode()
resetMultiSelectState() // 模块级导出函数，登出/切会话时调用
```

- 多选条（`multi-select-bar.vue`）展示选中数、支持全部删除/转发。
- **登出时必须 `resetMultiSelectState()`**（在 `use-uikit.ts` 的 logout 流程里），防止切账号残留选中态。

## 6. 置顶消息 / 消息搜索 / 群已读回执

- **置顶消息**（`pinned-bar.vue` + `pinned-bar-item.vue`）：顶部横幅展示最多 20 条置顶；
  `pinnedBar.visible` 默认 true、`maxPreviewLength` 默认 30；数据来自
  `chatManager.getPinnedMessageList`（不分页），点击置顶项可滚动定位（`requestLocate`）。
- **消息搜索**（`message-search-panel.vue`）：`search.enabled` 默认 false（入口默认关闭）；
  `enableServerSearch` 默认 false 时仅搜本地已加载消息，`pageSize` 默认 20。
- **群已读回执**（`group-read-receipt-modal.vue`）：点击气泡上的已读圆圈打开，
  展示已读成员列表与未读数；数据用 `fetchGroupReadDetail`（SDK 批量接口，按群会话获取），
  userId 去重 + 本地成员列表补全（见历史任务「群已读详情去重与批量补全修复」）。

## 7. 发送钩子与草稿

- `hooks.beforeSend(message)`：返回 `false` 或 `Promise<false>` 阻止发送（拦截器模式，沿用
  `text-message` 链接拦截器的返回值风格）；`afterSend(message)` 发送成功回调。
- 草稿：`enableDraft` 默认 true，切换会话自动保存/恢复输入内容（store 层 `draft` 字段）。

## 硬规则 vs 软约定

**硬规则：**

- 新增操作类型必须三层同步：`MessageActionType` 联合 + `bubble-wrapper` 菜单构建与事件转发 +
  `chat.vue` 执行分发；`message-action-menu` 是纯展示组件，不加业务逻辑。
- 引用状态/多选状态必须用 `useQuote()` / `useMessageActions()` 的**模块级单例**，禁止组件内各存一份。
- 引用协议字段必须符合 `MsgQuotePayload`（`msgID/msgPreview/msgSender/msgType`），
  图片/视频必须带 `msgThumbUrl`，这是跨端契约。
- 新行为开关必须进 `ChatConfig` 并给默认值；`messageAction` 各开关默认全 true。
- 登出/切会话必须清理多选、引用等模块级交互状态。

**软约定：**

- 菜单项文案/图标尽量复用既有 `MessageActionItem` 结构，危险操作标 `danger: true`。
- 转发/删除等异步操作失败用 `useToast` + `resolveSdkErrorMessage` 提示，错误文案走 locale。
- 预览文本规则（`getQuotePreview`）与会话列表摘要共用 `customEventPreviewMap`，改一边记得同步另一边。

## 反面清单

- ❌ 新增操作只改菜单 UI，漏掉类型联合与 `chat.vue` 执行分发——事件无人消费。
- ❌ 组件内自己 `const quoted = ref()` 存引用状态——绕过 `useQuote` 单例，跨组件不同步。
- ❌ 引用 ext 手写字段名与 `MsgQuotePayload` 不一致——接收方解析不到缩略图/预览。
- ❌ 多选模式登出后不 `resetMultiSelectState`——切账号残留选中态。
- ❌ 撤回超时/权限判断在菜单 UI 里硬编码 2 分钟——必须读 `recallDisableDuration` 配置。
- ❌ 新开关直接硬编码在 `chat.vue` 里不进 `ChatConfig`——外部用户无法配置。
- ❌ 操作失败直接 `console.log` 错误不提示用户——统一 `useToast` + 错误文案映射。
