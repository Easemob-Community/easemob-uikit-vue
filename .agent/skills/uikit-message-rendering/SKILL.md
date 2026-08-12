# Vue3 UIKit 消息渲染契约（message-renderer / message-bubble-wrapper / 各类型消息组件）

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-message-rendering**。

## 触发词

- `改消息渲染` / `消息气泡` / `消息样式`
- `message-renderer` / `message-bubble-wrapper`
- `图片三级展示` / `图片预览` / `图片消息`
- `语音消息` / `语音播放` / `语音转文字`
- `文本消息` / `@提及高亮` / `消息翻译`
- `合并消息` / `combine` / `未知消息类型`
- `消息状态` / `已读回执` / `送达回执`

## 目标

在 `packages/uikit/src/modules/chat/message-item/` 里新增或修改消息渲染组件时，
**保证与既有 13 个渲染组件的类型读取、插槽契约、状态展示逻辑一致**，避免三类翻车：

1. 渲染层直接 `(msg as any).xxx` 读 SDK 裸字段，绕过类型守卫，改 SDK 后编译不过；
2. 新增消息类型只在 `message-renderer.vue` 加映射，漏掉插槽/事件转发链路；
3. 重复造状态展示、图片降级、语音互斥等已沉淀逻辑。

## 1. 渲染入口：`message-renderer.vue` 的类型路由与插槽契约

所有消息渲染统一走 `message-renderer.vue`，**禁止在别的组件里再写一套 `switch (type)` 分派**：

```ts
const messageComponentMap: Record<string, Component> = {
  [MESSAGE_TYPE.TEXT]: TextMessage,
  [MESSAGE_TYPE.IMAGE]: ImageMessage,
  [MESSAGE_TYPE.VOICE]: VoiceMessage,
  [MESSAGE_TYPE.VIDEO]: VideoMessage,
  [MESSAGE_TYPE.FILE]: FileMessage,
  [MESSAGE_TYPE.COMBINE]: CombineMessage,
  [MESSAGE_TYPE.CUSTOM]: CustomMessage,
  [MESSAGE_TYPE.LOCATION]: LocationMessage,
}
```

渲染优先级（template 顺序即优先级）：

1. **`cmd` 消息不渲染**（透传消息，直接 `v-if="!isCmd"` 整块跳过）；
2. **`notice` 类型**：居中灰色小字，内容取 `(message.body as any).content || (message as any).content`；
3. **类型级插槽覆盖**：`#message-{type}` 存在时完全替换该类型渲染（如 `#message-txt`），
   插槽透出 `{ message, emitAction }`，其中 `emitAction` 转发 `custom-message-action` 事件；
4. **默认组件渲染**：按 `messageComponentMap` 渲染，统一透传 `:message` `:is-self`，
   并转发 6 个公共事件（`reedit / toggle-translation / toggle-voice-text / view / mention-click / location-click`）；
5. **未识别类型**：渲染 `[未知消息类型: xxx]` 兜底块。

**底部扩展插槽**：`#message-footer-{type}` 存在时渲染在内容下方（翻译/引用等附加内容），
透出 `{ message }`。

> 新增消息类型时三件事缺一不可：`messageComponentMap` 加映射 + `MESSAGE_TYPE` 常量已存在 +
> 事件转发在 renderer 与 bubble-wrapper 两层都透传。插槽名由 `MessageSlotName = \`message-${UiMessage['type']}\`` 约束。

## 2. body 类型守卫：渲染前必须窄化，禁止 `as any` 裸读

`src/sdk/types/message.ts` 提供 9 个 SDK body 类型守卫，**渲染组件一律先用守卫窄化再读字段**：

```ts
isTextBody / isImageBody / isFileBody / isVoiceBody / isVideoBody / isLocationBody
isCustomBody / isCombineBody / isCmdBody // (body: MessageBody) => body is XxxMessageBody
```

守卫判据（修改 SDK 时注意这些"指纹"字段）：

- `isTextBody` — `'content' in body`
- `isImageBody` — `'localUrl' in body`
- `isFileBody` — `'url' in body && !('duration' in body) && !('localUrl' in body)`
- `isVoiceBody` — `'duration' in body && !('thumbnailUrl' in body) && !('width' in body)`
- `isVideoBody` — `'duration' in body && ('thumbnailUrl' in body || 'width' in body)`
- `isLocationBody` — `'latitude' in body && 'longitude' in body`
- `isCustomBody` — `'event' in body`
- `isCombineBody` — `'title' in body && 'summary' in body`
- `isCmdBody` — `'action' in body`

**硬规则**：

- 渲染组件内访问 `msg.body.xxx` 前必须经过对应守卫窄化（或组件按类型固定接收，如
  `text-message.vue` 用 `TextMessageType` 类型化 prop）。
- `*MessageBody` 类型直接从 `easemob-websdk` 再导出（`sdk/types/message.ts`），**不本地复刻**，避免双源漂移。
- 消息状态类型：SDK `Message.status` 在 0.20.0 起改名 `sendStatus`（仅 sending/sent/failed）；
  UIKit 展示层 `status` 额外含 `delivered/read`（由回执事件驱动），类型即 `MessageStatusValue`。

## 3. `message-bubble-wrapper.vue`：气泡外壳的职责边界（1131 行，改前必读）

气泡外壳负责**所有消息类型公用的展示逻辑**，改单个类型渲染不要动它：

- **`isSelf` 实时校准**：渲染层用 `normalizeUserId(msg.from) === normalizeUserId(clientStore.currentUser)`
  重新计算，**不信任 adapter 阶段算好的 `isSelf`**（解决登录时序/多端登录/资源后缀导致的己方消息错位）。
- **发送者信息**：`useUserInfo(() => props.message.from)` 取 `displayName/avatarUrl`；
  `usePresence()` 取在线状态，**己方消息不展示在线指示器**。
- **状态图标**：两套映射 `classicStatusIconMap` / `capsuleStatusIconMap`（`style: 'classic' | 'capsule'`），
  键为 `MESSAGE_STATUS` 常量；`SENDING` 用 `message-status/loading`（小尺寸 14px 用小弧 loading）。
- **群已读回执激活**：`isGroupReadReceiptActive` 的判定顺序——己方 + 群聊 → 失败消息强制经典状态 →
  `requireGroupAck || groupReadCount > 0` → `config.enabled` 兜底；激活后**用圆圈替代普通状态图标**。
- **合并消息嵌套弹窗**：`modalStack` 数组管理多层弹窗，关闭延迟 300ms 等动画完成。
- **操作菜单/多选/引用定位**：操作菜单走 `message-action-menu`（见 `uikit-chat-interactions`）；
  引用定位用 `useQuote()` 的 `highlightedMessageId / requestLocate`。

## 4. 各类型渲染要点

### 4.1 文本消息（text-message.vue）

- 内容：`props.message.body.content`。
- **分片渲染顺序**：先按 `ext.em_at_list` 的 `@name` 拆分（`/@(\S+)/g`），每段再做 `linkify()`，
  `LinkSegment` 类型来自 `utils/linkify.ts`；无 mention 时整体 linkify。
- 链接点击：`onLinkClick` 拦截器（返回 `false` 阻止 / `string` 跳转指定地址 / 默认 `window.open(url, '_blank', 'noopener,noreferrer')`）。
- @提及点击：配置回调 `onMentionClick` 优先，否则 `emit('mention-click', userId)`。
- 翻译：`translation?.text` / `showTranslation !== false` / `translating` 三态；
  **翻译中或已有译文都显示译文卡片**（仅文本与切换按钮不同）。
- 重新编辑：`recalled && isSelf && originalMsg` 时显示（`emit('reedit')`）。
- 修改标识：以 `modifiedInfo` 为准（历史消息拉取也会带），兼容本地 `modified` 标记。
- 配置注入：`INJECTION_KEY.TEXT_MESSAGE_CONFIG`（chat.vue provide），开关 `enableLinkify / enableMentionHighlight`。

### 4.2 图片消息（image-message.vue）— 三级展示策略

- **气泡展示**：`thumbnailUrl || localUrl || bigImageUrl || originalImageUrl`（优先最小图，避免气泡拉大图流量）。
- **点击中图**：`bigImageUrl || localUrl || originalImageUrl`。
- **原图**：`localUrl || originalImageUrl`（预览高清/下载用）。
- **展示尺寸**：按 body `width/height` 等比缩放，上限 `MAX_WIDTH/MAX_HEIGHT = 240`，无尺寸时默认 `160×120`。
- **预览**：`EmImageViewer` 受控（`v-model:show` + `v-model:index`），srcs = `[中图, 原图]` 去重；
  底部按钮「查看原图/切回中图」做 toggle。
- **失败降级**：`degradedIndexes: Set<number>` 记录已降级索引，中图失败升原图、原图失败回中图，
  **同一索引只降级一次，防止互跳死循环**。
- 加载失败显示 `t('message.image.loadFailed')`；无 URL 显示 `t('message.image')` 占位。

### 4.3 语音消息（voice-message.vue）

- **互斥播放**：`AudioController`（play/stop/isPlaying）模块级单例，通过
  `inject(AudioControllerKey, createAudioController(), true)` 注入；播放新语音自动暂停旧语音。
- 播放失败/结束/卸载时 `cleanupAudio()` 清理并复位。
- URL 缺失时 `logger.warn` 不播放。
- 语音转文字：`emit('toggle-voice-text')`（见聊天交互 skill）。

### 4.4 合并消息（combine-message.vue / combine-message-modal.vue）

- 渲染层入口 `combine-message.vue` 是**单条预览**（标题/摘要/消息数），点击后由
  `bubble-wrapper` 的 `modalStack` 打开 `combine-message-modal.vue`。
- 弹窗内子消息渲染**必须拆 `combine-message-modal-item.vue` 子组件**，每个子组件独立调
  `useUserInfo(() => props.message.from)`（列表场景规范，见 `uikit-user-attribute-extraction`）。
- 合并消息 body 的 `messageList` 大数组在 adapter 层已 `markRaw`（见 `uikit-store-composable` 第 7 节），
  渲染层不要试图让其响应式。

## 5. 消息列表（message-list.vue）的配置契约

- `ChatConfig['messageList']` 控制：`layout`（left/conversation）、`showAvatar`、`showTime`
  （false/'always'/'hover'）、`bubbleShape`、`avatarSize`、`messageGap/messagePadding`（未配置时
  跟随 `--uikit-message-gap / --uikit-message-padding` 密度变量）、`groupInterval`（默认 5 分钟）、
  `virtualScrollThreshold`（默认 100，超过启用 `MessageVirtualList`）、`loadHistory`（mode：
  'auto' 时 PC 触摸设备→pull-down、PC 非触摸→scroll-top、移动端→pull-down）、
  `maxMessageCount`（默认 300 裁剪）、`pinnedBar`、`search`、`autoLocateAtMe`、`messageStatus`。
- 历史加载三态：`loadingHistory / hasMoreHistory / historyLoadFailed`（失败保留 hasMoreHistory，
  顶部显示重试入口）。
- 滚动底部判定：虚拟滚动模式由虚拟列表上报，普通模式用 `useScroll` 的 `arrivedState.bottom`。

## 硬规则 vs 软约定

**硬规则：**

- 消息渲染统一走 `message-renderer.vue`，禁止另写 `switch (type)` 分派。
- 访问 `msg.body` 字段前必须用 `sdk/types/message.ts` 的类型守卫窄化，禁止 `as any` 裸读。
- 新增消息类型必须同步：`messageComponentMap` 映射 + `MESSAGE_TYPE` 常量 + renderer/bubble-wrapper
  两层事件转发；`cmd` 不渲染、`notice` 居中灰字、未知类型兜底块这三条分支不要动。
- 图片三级展示顺序（thumbnail → big → original）与降级防死循环逻辑是共识，不要另起一套。
- 语音播放互斥必须用 `AudioController` 注入，禁止组件内各自 `new Audio()` 互不感知。
- 合并消息子消息渲染必须拆子组件调 `useUserInfo`。

**软约定：**

- 公共展示逻辑（isSelf 校准/状态图标/已读回执激活）放 `bubble-wrapper`，单类型组件只做自己的渲染。
- 状态图标映射键必须用 `MESSAGE_STATUS` 常量，不要硬编码字符串。
- 消息展示相关文案走 `useLocale().t()`（见 `uikit-i18n-locale`）。

## 已知漂移（改到相关文件时注意，见根 `TECH-DEBT.md`）

- 图片三级展示曾做过策略调整（气泡统一优先缩略图），改 `image-message.vue` 前先看 git 历史，
  不要退回「气泡直接拉原图」的旧实现。
- 语音格式兼容（WebM→WAV 转码、iOS 兼容）在发送链路处理，渲染层只负责播放；改播放逻辑
  前确认发送侧已产出兼容格式，避免两头各改一套。

## 反面清单

- ❌ 渲染组件里 `(msg as any).body.xxx` 裸读，不用类型守卫——SDK 升级后编译期失守。
- ❌ 新消息类型忘了加 `messageComponentMap` 映射，用户看到 `[未知消息类型]` 兜底块。
- ❌ 改单类型渲染时顺手动 `bubble-wrapper` 的 isSelf/状态/已读逻辑——外壳逻辑影响所有消息。
- ❌ 图片气泡直接显示原图 URL——三级展示策略要求气泡最小图、点击中图、原图仅预览/下载用。
- ❌ 图片预览失败降级不记录 `degradedIndexes`——中图/原图互跳死循环。
- ❌ 每个语音组件各自维护一个 audio 实例——必须经 `AudioController` 互斥。
- ❌ 合并消息弹窗里 `v-for` 内联渲染子消息不拆子组件——`useUserInfo` 跟踪失效（见用户属性 skill）。
- ❌ 在 `message-list.vue` 里写死间距/圆角替代 `--uikit-message-gap / --uikit-message-padding` 密度变量。
