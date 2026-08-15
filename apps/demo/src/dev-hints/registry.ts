/**
 * Dev Hints 元数据注册表
 *
 * 一张声明式配置表：功能区域（DOM 选择器） → 环信接口 + UIKit 实现思路。
 * 素材来源：packages/uikit-im/src/sdk/domain/*.ts（接口调用唯一入口）、
 * packages/uikit-im/src/modules/**（UI 实现）、node_modules/easemob-websdk
 * 内的 d.ts（SDK 权威签名）。
 *
 * 维护约定：
 * - refs 引用文件路径而非行号，uikit 迭代时随代码改动同步更新；
 * - 5.x 官方文档站未上线，api.docUrl 暂留空，上线后统一补录。
 */
import type { DevHintEntry } from './types'

const SDK_TYPES = 'packages/uikit-im/src/sdk/types'

/** UIKit SDK 类型契约文件（气泡类条目的参考文件公共部分） */
const SDK_TYPE_REFS = [
  {
    path: SDK_TYPES,
    desc: 'UiMessage 等 UI 层消息类型契约',
  },
  {
    path: 'packages/uikit-im/src/sdk/adapter/message-adapter.ts',
    desc: 'SDK 消息 → UiMessage 适配（toUiMessage）',
  },
]

/** 气泡类条目的公共参考文件 */
const BUBBLE_REFS = [
  {
    path: 'packages/uikit-im/src/sdk/domain/message-domain.ts',
    desc: '消息域：发送/历史/已读回执/置顶/翻译等全部 SDK 调用入口',
  },
  ...SDK_TYPE_REFS,
]

export const DEV_HINT_REGISTRY: DevHintEntry[] = [
  /* ==================== 会话列表 ==================== */

  {
    id: 'conversation-list',
    selectors: ['.conversation-container'],
    scope: 'container',
    highlight: true,
    title: '会话列表',
    summary: '本地缓存 + 服务端同步双通道填充列表（整区触发，避免逐项重复提示）',
    apis: [
      { name: 'chatManager.getConversationList()', note: '读取 SDK 本地缓存的会话列表（首屏秒开）' },
      { name: 'chatManager.refreshSessionList()', note: '主动拉取服务端会话（onConversationListUpdate 事件回填）' },
      { name: 'chatManager.setCurrentConversation()', note: '进入会话，通知 SDK 当前浏览状态' },
      { name: 'chatManager.clearConversationUnreadMessageCount()', note: '进入会话清未读（channel ack）' },
    ],
    implNotes: [
      'conversation-domain.syncLocal() 读本地缓存 → toUiConversations 适配为 UiConversation → 写 conversationStore',
      'refresh() 拉服务端列表，onConversationListUpdate 事件驱动 store 回填，增量 diff 更新',
      '会话项右键操作：置顶 setConversationPinned / 免打扰 pushManager.setConversationSilentMode / 标记 addConversationMark',
    ],
    refs: [
      { path: 'packages/uikit-im/src/sdk/domain/conversation-domain.ts', desc: '会话域：enter/leave/syncLocal/refresh/pin/setMuted 等' },
      { path: 'packages/uikit-im/src/containers/conversation-container/conversation-container.vue', desc: '会话容器：tabs + 搜索 + 列表编排' },
      { path: 'packages/uikit-im/src/modules/conversation/conversation-list.vue', desc: '会话列表 UI + 本地/服务端数据合并渲染' },
    ],
  },

  /* ==================== 通讯录 ==================== */

  {
    id: 'contact-list',
    selectors: ['.contact-list-container'],
    scope: 'container',
    highlight: true,
    title: '联系人列表',
    summary: '分页拉取联系人/黑名单 + 好友请求处理',
    apis: [
      { name: 'contactManager.getContacts()', note: '分页拉取联系人列表（含备注、头像等用户属性）' },
      { name: 'contactManager.addContact()', note: '发起好友申请（userId + reason）' },
      { name: 'contactManager.acceptContactInvitation() / declineContactInvitation()', note: '同意/拒绝好友请求' },
      { name: 'contactManager.getBlocklist()', note: '拉取黑名单列表' },
    ],
    implNotes: [
      'contact-domain.getContacts() 分页拉取 → 写 contactStore；onContactChanged 事件驱动增量更新',
      '好友请求通过 Notification 机制实时通知，点击卡片在 demo 中打开 EmAddContactModal',
      '联系人搜索：searchContactsByNoUser 按 userId/昵称匹配，支持本地过滤',
    ],
    refs: [
      { path: 'packages/uikit-im/src/sdk/domain/contact-domain.ts', desc: '联系人域：getContacts/addContact/acceptInvitation/blocklist' },
      { path: 'packages/uikit-im/src/containers/contact-list-container/contact-list-container.vue', desc: '联系人列表容器' },
      { path: 'packages/uikit-im/src/modules/contact/contact-list.vue', desc: '联系人列表 UI（BEM 分组渲染）' },
    ],
  },

  /* ==================== 群组列表 ==================== */

  {
    id: 'group-list',
    selectors: ['.group-list-container'],
    scope: 'container',
    highlight: true,
    title: '群组列表',
    summary: '分页拉取已加入群组列表 + 创建/加入群操作',
    apis: [
      { name: 'groupManager.getGroupInfoList()', note: '分页拉取已加入群组列表（含群名/成员数/头像）' },
      { name: 'groupManager.createGroup()', note: '创建群：群名 + 初始成员列表 + 描述（可选）' },
      { name: 'groupManager.joinGroup() / leaveGroup()', note: '加入/退出群组' },
      { name: 'groupManager.destroyGroup()', note: '解散群组（仅群主）' },
    ],
    implNotes: [
      'group-domain.getGroupInfoList() 分页拉取 → 写 groupStore；onGroupChanged 事件驱动增量更新',
      '创建群：demo 中由 EmCreateGroupModal 收集群名/成员 → group-domain.createGroup()',
      '群搜索：searchGroupsByNoUser 按群 ID/群名匹配',
    ],
    refs: [
      { path: 'packages/uikit-im/src/sdk/domain/group-domain.ts', desc: '群组域：getGroupInfoList/create/join/leave/destroy' },
      { path: 'packages/uikit-im/src/containers/group-list-container/group-list-container.vue', desc: '群组列表容器' },
      { path: 'packages/uikit-im/src/modules/group/group-list.vue', desc: '群组列表 UI' },
    ],
  },

  /* ==================== 联系人详情 ==================== */

  {
    id: 'contact-detail',
    selectors: ['.contact-detail'],
    title: '联系人详情',
    summary: '备注编辑/删好友/拉黑等单联系人操作，数据来自 contactStore',
    apis: [
      { name: 'contactManager.setContactRemark({ userId, remark })', note: '设置/修改联系人备注' },
      { name: 'contactManager.removeContact({ userId })', note: '删除联系人' },
      { name: 'contactManager.addUsersToBlocklist() / removeUsersFromBlocklist()', note: '加入/移出黑名单' },
    ],
    implNotes: [
      'contact-detail.vue 从 contactStore.getContact(userId) 取联系人数据渲染',
      '在线状态通过 usePresence(userId) 获取并实时更新',
      '备注编辑内联交互：双击进入编辑 → enter 保存 → esc 取消',
    ],
    refs: [
      { path: 'packages/uikit-im/src/sdk/domain/contact-domain.ts', desc: '备注/删除/黑名单 API 入口' },
      { path: 'packages/uikit-im/src/modules/contact/contact-detail.vue', desc: '联系人详情面板 UI' },
      { path: 'packages/uikit-im/src/modules/contact/contact-user-card.vue', desc: '联系人头像+昵称+在线状态卡片' },
    ],
  },

  /* ==================== 群组详情 ==================== */

  {
    id: 'group-detail',
    selectors: ['.group-detail'],
    title: '群组详情',
    summary: '群信息查看/编辑 + 群主转让 + 管理员管理 + 全员禁言',
    apis: [
      { name: 'groupManager.getGroupInfo({ groupId })', note: '获取群详情（群名/描述/成员数/群主等）' },
      { name: 'groupManager.changeGroupOwner({ groupId, newOwnerId })', note: '转让群主' },
      { name: 'groupManager.addGroupAdmins() / removeGroupAdmins()', note: '添加/移除管理员' },
      { name: 'groupManager.setMuteAll() / setMemberMute()', note: '全员禁言 / 指定成员禁言' },
    ],
    implNotes: [
      'group-detail.vue 从 groupStore.getGroupById(groupId) 取群数据渲染',
      '群名编辑：群主可内联编辑，enter 保存 → groupManager.setGroupName()（非标准 API，走 updateGroupInfo）',
      '群成员入口 → 展开 group-member-list 子组件',
    ],
    refs: [
      { path: 'packages/uikit-im/src/sdk/domain/group-domain.ts', desc: '群域：getGroupInfo/changeOwner/admins/mute 等全量 SDK 调用' },
      { path: 'packages/uikit-im/src/modules/group/group-detail.vue', desc: '群详情面板 UI' },
    ],
  },

  /* ==================== 聊天头部 ==================== */

  {
    id: 'chat-header',
    selectors: ['.chat__header'],
    title: '聊天头部',
    summary: '会话标题/在线状态/群信息入口的连接层',
    apis: [
      { name: 'chatManager.setCurrentConversation()', note: '进入会话，SDK 标记当前浏览上下文' },
      { name: 'presenceManager.subscribePresence() / getPresenceStatus()', note: '订阅对方在线状态并实时更新' },
      { name: 'chatManager.sendMessageReadReceipts()', note: '进入会话补发未回执消息（入群/切会话触发）' },
    ],
    implNotes: [
      'chat-header.vue 从 conversationStore 取当前会话信息渲染标题/状态',
      '在线状态：usePresence(conversationId) 读取 + subscribePresence 被动更新',
      '群聊点击更多 → EmChatDrawer → chat-info-drawer（群管理全套入口）',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/chat-header.vue', desc: '聊天头部 UI：标题/状态/更多菜单' },
      { path: 'packages/uikit-im/src/modules/chat/chat.vue', desc: '聊天编排：header + messageList + input' },
      { path: 'packages/uikit-im/src/sdk/domain/presence-domain.ts', desc: '在线状态订阅/发布' },
    ],
  },

  /* ==================== 聊天信息抽屉 ==================== */

  {
    id: 'chat-info-drawer',
    selectors: ['.chat-info-drawer'],
    title: '聊天信息抽屉',
    summary: '群成员管理/群公告/共享文件等全套群管理 SDK 调用的入口层',
    apis: [
      { name: 'groupManager.getGroupInfo({ groupId })', note: '群信息展示（名称/头像/成员数）' },
      { name: 'groupManager.fetchGroupMembers()', note: '分页拉取群成员列表（含角色/昵称/在线状态）' },
      { name: 'groupManager.fetchGroupAnnouncement() / updateGroupAnnouncement()', note: '群公告获取/发布（含公告横幅提示）' },
      { name: 'groupManager.getSharedFileList() / uploadSharedFile() / downloadSharedFile()', note: '共享文件列表/上传/下载，removeSharedFile 删除' },
    ],
    implNotes: [
      'chat-info-drawer.vue 按 isGroup 分支：单聊展示联系人信息、群聊展示成员/公告/共享文件入口',
      '群成员列表通过 group-member-list 子组件渲染，支持搜索与角色筛选',
      '群公告有独立公告横幅组件 group-announcement-banner.vue，随新公告自动弹出',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/drawer/chat-info-drawer.vue', desc: '聊天信息抽屉：成员/公告/共享文件编排' },
      { path: 'packages/uikit-im/src/modules/group/group-member-list.vue', desc: '群成员列表：搜索/角色筛选/分页加载' },
      { path: 'packages/uikit-im/src/sdk/domain/group-domain.ts', desc: '群域：全部群管理 SDK 调用入口' },
    ],
  },

  /* ==================== 转发弹窗 ==================== */

  {
    id: 'forward-modal',
    selectors: ['.forward-modal'],
    title: '转发弹窗',
    summary: '合并转发：createCombineMessage 将多条消息打包为一条，sendMessage 发送',
    apis: [
      { name: 'chatManager.createCombineMessage({ summary, messageIdList })', note: '将选中的多条消息合并为一条组合消息（含摘要）' },
      { name: 'chatManager.sendMessage(combineMsg)', note: '发送合并消息到目标会话' },
      { name: 'chatManager.downloadAndParseCombineMessage()', note: '接收方点击展开时下载并解析被合并的消息列表' },
    ],
    implNotes: [
      'forward-modal.vue：会话选择 + 预览 → 确认后 createCombineMessage → sendMessage',
      '摘要生成逻辑与 conversation-item 的 lastMessageText 共享 toConversationSummary',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/forward-modal/forward-modal.vue', desc: '转发弹窗 UI：会话列表选择 + 预览' },
      { path: 'packages/uikit-im/src/sdk/domain/message-domain.ts', desc: '消息域：createCombineMessage/sendMessage 入口' },
    ],
  },

  /* ==================== 群已读详情弹窗 ==================== */

  {
    id: 'group-read-receipt',
    selectors: ['.group-read-receipt-modal'],
    title: '群已读详情弹窗',
    summary: 'getGroupMessageReadReceipts 拉取群消息已读/未读成员列表',
    apis: [
      { name: 'chatManager.getGroupMessageReadReceipts({ messageId, groupId })', note: '拉取群消息已读/未读成员详情列表' },
    ],
    implNotes: [
      'group-read-receipt-modal.vue 分页展示已读/未读成员（头像+昵称+在线状态）',
      '群历史消息批量补全：fillGroupReadCounts 按 20 条分批请求 getGroupMessageReadReceipts',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/group-read-receipt-modal/group-read-receipt-modal.vue', desc: '群已读详情弹窗 UI' },
      { path: 'packages/uikit-im/src/sdk/domain/message-domain.ts', desc: 'fillGroupReadCounts 批量补全逻辑' },
    ],
  },

  /* ==================== 在线状态选择器 ==================== */

  {
    id: 'presence-selector',
    selectors: ['.presence-selector'],
    title: '在线状态选择器',
    summary: 'publishPresence 发布自身状态 + subscribePresence 订阅他人状态',
    apis: [
      { name: 'presenceManager.publishPresence({ status })', note: '发布自身在线状态（Online/Offline/Busy/Custom）' },
      { name: 'presenceManager.getPresenceStatus()', note: '获取当前用户在线状态' },
      { name: 'presenceManager.subscribePresence({ userIds })', note: '订阅指定用户的在线状态变更通知' },
    ],
    implNotes: [
      'presence-selector.vue：选项列表 + 自定义状态输入（compact/完整两种模式）',
      '在线状态变更是全应用范围事件（不是会话级），状态变化通过 onPresenceChanged 事件通知',
    ],
    refs: [
      { path: 'packages/uikit-im/src/components/presence-selector/presence-selector.vue', desc: '在线状态选择器 UI' },
      { path: 'packages/uikit-im/src/sdk/domain/presence-domain.ts', desc: '在线状态域：发布/订阅/查询' },
    ],
  },

  /* ==================== 消息气泡（总） ==================== */

  {
    id: 'message-bubble',
    selectors: ['.message-bubble-wrapper[data-msg-id]'],
    title: '消息气泡（通用）',
    summary: '气泡统一外壳：头像/昵称/状态/已读，内部按类型渲染',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.createTextMessage() / createImageMessage() / …', note: '按类型创建消息，统一走 sendMessage 发送' },
      { name: 'chatManager.sendMessage()', note: '统一发送入口，文件类消息带上传进度回调' },
      { name: 'chatManager.sendMessageReadReceipts()', note: '单聊/群聊已读回执' },
      { name: 'chatManager.getGroupMessageReadReceipts()', note: '群消息已读数（历史消息批量补全）' },
    ],
    implNotes: [
      'message-bubble-wrapper 是气泡外壳：布局（左右/头像/昵称）、消息状态（发送中/失败/已读）、群已读数、多选模式',
      'data-msg-id 供滚动定位与消息反查；内部按 message.type 分发到各类型气泡组件',
      '进入会话补发未回执消息（sendPendingReadReceipts，sentReadReceiptIds 去重）',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-item/message-bubble-wrapper.vue', desc: '气泡外壳：布局/状态/已读/多选' },
      { path: 'packages/uikit-im/src/modules/chat/message-list/message-list.vue', desc: '消息列表：时间线/滚动加载/置顶消息区' },
      ...BUBBLE_REFS,
    ],
  },

  /* ==================== 各类型气泡 ==================== */

  {
    id: 'bubble-stream-markdown',
    selectors: ['.demo-md-msg'],
    title: 'AI 流式消息气泡（Demo 插件）',
    summary: 'onStreamMessage 分片合并 → store 覆盖更新 → #message-txt 插槽接管 markdown 渲染',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.addEventHandler({ onStreamMessage })', note: '流式分片事件：按 msgServerId 排序合并，body.content = stream.fullText' },
      { name: 'messageStore.updateMessageById(msgId, patch)', note: '分片覆盖更新同一条消息，不产生新气泡' },
      { name: 'stream.customType', note: '业务自定义流类型：\'text\' 内核纯文本流式；\'markdown\' 由插件插槽接管' },
    ],
    implNotes: [
      'chat-events.onStreamMessage：msgServerId 幂等合并 fullText + 挂载 stream 状态（M1）',
      'text-message.vue：纯文本流式光标/终态/异常（M2，customType 非 text 时由插件接管）',
      'demo 侧 #message-txt 插槽 → demo-markdown-message.vue（markdown-it 渲染 + 打字机光标）',
      'demo 分片模拟器 use-stream-demo.ts 直接驱动 messageStore，完整走响应式更新链路',
    ],
    refs: [
      { path: 'packages/uikit-im/src/sdk/event/chat-events.ts', desc: 'onStreamMessage 分片合并与丢片补偿' },
      { path: 'packages/uikit-im/src/modules/chat/message-item/text-message.vue', desc: '内核纯文本流式状态渲染' },
      { path: 'apps/demo/src/components/ai/demo-markdown-message.vue', desc: '插件 markdown 流式气泡参考实现' },
      { path: 'apps/demo/src/components/ai/use-stream-demo.ts', desc: '流式分片模拟器 + mock AI 回复' },
    ],
  },

  {
    id: 'bubble-text',
    selectors: ['.text-message'],
    title: '文本消息气泡',
    summary: '渲染链路：createTextMessage → sendMessage → 气泡渲染；支持翻译/修改',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.createTextMessage({ conversationId, conversationType, content })', note: '创建文本消息（ext/needReadReceipt 可选）' },
      { name: 'chatManager.sendMessage(msg)', note: '统一发送入口，成功后 localId 替换为 serverId' },
      { name: 'chatManager.translateMessage()', note: '消息翻译（气泡内译文卡片）' },
      { name: 'chatManager.modifyMessage()', note: '修改已发送文本（显示「已编辑」）' },
    ],
    implNotes: [
      'message-domain.sendText()：createTextMessage → _send()（写 store 本地消息 → SDK 发送 → 回调替换为服务端消息）',
      'text-message.vue：链接/提及/译文卡片渲染；翻译后消息做「译文 → 原文」切换',
      '@提及：SDK 侧无独立 API，正文内嵌 @xxx 标记 + atMeMap 驱动会话列表「@我」角标',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-item/text-message.vue', desc: '文本气泡 UI：译文卡片/链接/提及' },
      ...BUBBLE_REFS,
    ],
  },

  {
    id: 'bubble-image',
    selectors: ['.image-message'],
    title: '图片消息气泡',
    summary: '上传带进度：createImageMessage(data) → sendMessage 的 progress 回调',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.createImageMessage({ data: File })', note: 'File 上传自动走上传通道；传 originalUrl 则为 URL 直发' },
      { name: 'chatManager.sendMessage(msg)', note: '文件类消息 onProgress 回调 → store 更新上传进度' },
      { name: 'chatManager.downloadAndParseCombineMessage()', note: '（合并消息内图片）下载解析' },
    ],
    implNotes: [
      '上传进度写入 store 有 150ms 节流（PROGRESS_FLUSH_INTERVAL），避免高频重渲染',
      '本地预览：未上传完成显示本地缩略图 + 进度条，失败可点击重发',
      '点击大图预览：消息列表内放大查看，左右切换相邻图片',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-item/image-message.vue', desc: '图片气泡：进度/失败重发/预览' },
      ...BUBBLE_REFS,
    ],
  },

  {
    id: 'bubble-file',
    selectors: ['.file-message'],
    title: '文件消息气泡',
    summary: 'createFileMessage 上传 + 点击下载打开文件',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.createFileMessage({ data: File })', note: '文件消息创建（文件名/大小由 SDK 填充）' },
      { name: 'chatManager.sendMessage(msg)', note: '带 onProgress 上传进度' },
    ],
    implNotes: [
      'file-message.vue：文件名/大小/下载图标；下载用 fileUrl 直链（SDK 已处理鉴权 token 拼接）',
      '本地文件消息未上传完时点击无操作，失败态支持重发',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-item/file-message.vue', desc: '文件气泡 UI' },
      ...BUBBLE_REFS,
    ],
  },

  {
    id: 'bubble-voice',
    selectors: ['.voice-message'],
    title: '语音消息气泡',
    summary: 'createVoiceMessage 录制上传；voiceMessageToText 转文字',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.createVoiceMessage({ data: File, duration })', note: '语音消息创建（播放时长由客户端计算）' },
      { name: 'chatManager.voiceMessageToText(body)', note: '语音转文字（需 url 解析出 fileId）' },
    ],
    implNotes: [
      '语音录制与播放由 demo/业务侧完成，UIKit 只负责创建与渲染',
      '转文字：isVoiceBody 类型守卫收窄 → VoiceMessageSource 补 type 字段 → voiceMessageToText',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-item/voice-message.vue', desc: '语音气泡：播放/转文字入口' },
      ...BUBBLE_REFS,
    ],
  },

  {
    id: 'bubble-video',
    selectors: ['.video-message'],
    title: '视频消息气泡',
    summary: 'createVideoMessage 上传缩略图+视频，点击播放',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.createVideoMessage({ data: File, thumb: File })', note: '视频 + 缩略图创建' },
    ],
    implNotes: [
      'video-message.vue：封面图 + 播放按钮；点击进入播放层（原生 video 标签）',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-item/video-message.vue', desc: '视频气泡 UI' },
      ...BUBBLE_REFS,
    ],
  },

  {
    id: 'bubble-combine',
    selectors: ['.combine-message'],
    title: '合并转发消息气泡',
    summary: 'createCombineMessage 打包多条消息；downloadAndParseCombineMessage 展开',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.createCombineMessage({ summary, messages })', note: '将多条消息合并为一条转发（会话列表显示摘要）' },
      { name: 'chatManager.downloadAndParseCombineMessage({ message })', note: '点击展开时下载并解析被合并的消息列表' },
    ],
    implNotes: [
      '摘要生成：toConversationSummary 统一生成「N 条消息」+ 首条类型文本（会话列表与气泡一致）',
      '展开后按类型复用各消息渲染组件；发送者昵称解析走 useUserInfo 缓存',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-item/combine-message.vue', desc: '合并消息气泡 UI' },
      { path: 'packages/uikit-im/src/modules/chat/message-item/combine-message-detail.vue', desc: '合并消息展开详情（若存在）' },
      ...BUBBLE_REFS,
    ],
  },

  {
    id: 'bubble-custom',
    selectors: ['.custom-message'],
    title: '自定义消息气泡',
    summary: 'createCustomMessage({ event, params }) 承载业务扩展消息（如名片）',
    badgeDelay: 2000,
    apis: [
      { name: 'chatManager.createCustomMessage({ event, params })', note: '事件名 + 自定义字段，SDK 原样透传' },
    ],
    implNotes: [
      'demo 的名片消息 = custom 消息 event=userCard，params 携带 uid/nickname/avatar',
      'demo-page.vue 通过 #message-custom 插槽接管渲染，未识别事件回落 EmCustomMessage',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-item/custom-message.vue', desc: '默认自定义消息渲染' },
      { path: 'apps/demo/src/components/demo-card-message.vue', desc: 'demo 名片消息示例（插槽接管）' },
      ...BUBBLE_REFS,
    ],
  },

  /* ==================== 历史消息 ==================== */

  {
    id: 'history-load',
    selectors: ['.message-list__top-loading', '.message-list__scroll'],
    scope: 'container',
    title: '历史消息加载',
    summary: 'getHistoryMessages 游标分页 + 群已读数批量补全',
    apis: [
      { name: 'chatManager.getHistoryMessages({ cursor, pageSize, searchDirection })', note: '游标分页上滑加载（searchDirection: up）' },
      { name: 'chatManager.getGroupMessageReadReceipts()', note: '群历史消息已读数批量补全（单次最多 20 条，自动分批）' },
    ],
    implNotes: [
      'fetchHistory 返回 { items, cursor, hasMore }，prependMessages 头插；H5 下拉刷新复用同路径',
      '群聊历史消息不带已读数 → fillGroupReadCounts 按 20 条分批请求补全，异步不阻塞渲染',
    ],
    refs: [
      { path: 'packages/uikit-im/src/sdk/domain/message-domain.ts', desc: 'fetchHistory / fillGroupReadCounts' },
      { path: 'packages/uikit-im/src/modules/chat/message-list/message-list.vue', desc: '滚动触顶加载 / 下拉刷新' },
    ],
  },

  /* ==================== 输入框 ==================== */

  {
    id: 'message-input',
    selectors: ['.message-input'],
    title: '消息输入框',
    summary: '富文本编辑 → 按类型创建消息发送；支持 @提及/表情/附件',
    apis: [
      { name: 'chatManager.createTextMessage() / createImageMessage() / …', note: '输入面板按功能选择对应创建 API' },
      { name: 'chatManager.sendMessage(msg)', note: '统一发送（含上传进度/失败重试）' },
      { name: 'chatManager.getGroupMemberList()', note: '输入 @ 时拉取群成员列表供选择' },
    ],
    implNotes: [
      'simple 模式：纯文本 textarea；rich 模式：Tiptap 富文本（@提及、表情、贴图、附件工具栏）',
      '发送后清空编辑器并滚动到底部；离线/失败消息保留在列表中可重发',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/message-input/index.vue', desc: '输入框容器（simple/rich 切换、工具栏）' },
      { path: 'packages/uikit-im/src/sdk/domain/message-domain.ts', desc: 'sendText/sendImage/… 各类型发送' },
    ],
  },

  /* ==================== 聊天容器 ==================== */

  {
    id: 'chat-container',
    selectors: ['.chat'],
    scope: 'container',
    title: '聊天容器',
    summary: '消息列表 + 输入框 + 置顶消息 + 群管理入口的编排层',
    apis: [
      { name: 'chatManager.setCurrentConversation()', note: '进入会话（header 标题/已读回执/滚动定位都依赖它）' },
      { name: 'chatManager.getPinnedMessageList()', note: '顶部置顶消息条' },
      { name: 'chatManager.sendMessageReadReceipts()', note: '补发未回执消息（进入会话时）' },
    ],
    implNotes: [
      'chat.vue 按 conversationType 编排：单聊/群聊 header 差异、群管理入口（EmGroupDetail 等）',
      'config 透传：header/input/messageList/groupReadReceipt 等分组配置',
    ],
    refs: [
      { path: 'packages/uikit-im/src/modules/chat/chat.vue', desc: '聊天容器编排' },
      { path: 'packages/uikit-im/src/modules/chat/chat-header.vue', desc: '会话标题/状态/更多入口' },
    ],
  },
]

/**
 * 从事件目标向上匹配注册表条目。
 * 两轮匹配：先匹配具体内容条目（气泡类型/输入框/详情面板等），
 * 无命中时再匹配容器级条目（.chat、.conversation-container 等）。
 * 同轮内取最近命中：目标可能同时命中外层（如 .message-bubble-wrapper）
 * 与内层（如 .text-message），深度越小（离 target 越近）优先级越高。
 */
export function resolveDevHint(target: Element): { entry: DevHintEntry, el: HTMLElement } | null {
  for (const scope of ['specific', 'container'] as const) {
    let best: { entry: DevHintEntry, el: HTMLElement, depth: number } | null = null
    for (const entry of DEV_HINT_REGISTRY) {
      if ((entry.scope ?? 'specific') !== scope)
        continue
      for (const selector of entry.selectors) {
        const el = target.closest<HTMLElement>(selector)
        if (!el)
          continue
        if (entry.verify && !entry.verify(el))
          continue
        // 深度 = 命中元素到目标之间的节点数；值越小表示命中越具体（离目标越近）
        let depth = 0
        let cur: Element | null = target
        while (cur && cur !== el) {
          depth++
          cur = cur.parentElement
        }
        if (!best || depth < best.depth)
          best = { entry, el, depth }
      }
    }
    if (best)
      return { entry: best.entry, el: best.el }
  }
  return null
}
