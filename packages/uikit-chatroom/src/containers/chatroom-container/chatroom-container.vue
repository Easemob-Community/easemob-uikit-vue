<script setup lang="ts">
/**
 * EmChatroomContainer —— 聊天室场景容器（P2-2 外壳：加入/退出/历史/消息收发/
 * 成员面板/系统通知/基础插槽，H5-first 全屏布局）。
 *
 * 三步接入（与 Provider 组合使用，见 demo 与 docs quickstart）：
 * ```vue
 * script setup:
 *   import { useChatroomProvider, EmChatroomContainer } from '@easemob/uikit-chatroom'
 *   useChatroomProvider({ appKey })   // 业务侧组合 core provider + 场景 manager 注入
 * template:
 *   <EmChatroomContainer room-id="room123" scene="live" auto-join />
 * ```
 *
 * 设计要点：
 * - **容器只消费公开 composable 契约**（useChatroom / useChatroomMessage /
 *   useChatroomMember / useChatroomScene），不直取 store 内部状态（防「第二 API 面」，
 *   见设计文档 §5.10）；headless 与容器共用同一内核；
 * - 场景 = 纯配置 + 插槽覆盖（§5.5）：scene prop 解析 features 控制内置块显隐，
 *   每个边界开命名插槽，业务变种优先插槽、其次 config；
 * - 接收侧渲染节流在 store 层（缓冲队列按窗口批量合并），容器直接绑定渲染列表；
 * - 被踢/解散终态：watch store 状态 → emit 事件 + 终态提示视图。
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { EmPopup, MESSAGE_TYPE, t, useClient } from '@easemob/uikit-core'
import type { UiMessage } from '@easemob/uikit-core'
import { CHATROOM_STATUS } from '../../constants'
import { normalizeUserId } from '../../sdk/adapter/chatroom-adapter'
import { useChatroom } from '../../composables/use-chatroom'
import { useChatroomMember } from '../../composables/use-chatroom-member'
import { useChatroomMessage } from '../../composables/use-chatroom-message'
import { useChatroomScene } from '../../composables/use-chatroom-scene'
import ChatroomHeader from '../../modules/chatroom/common/chatroom-header.vue'
import ChatroomGiftBar from '../../modules/chatroom/live/chatroom-gift-bar.vue'
import ChatroomInputBar from '../../modules/chatroom/common/chatroom-input-bar.vue'
import ChatroomMicQueue from '../../modules/chatroom/voice/chatroom-mic-queue.vue'
import ChatroomMemberPanel from '../../modules/chatroom/common/chatroom-member-panel.vue'
import ChatroomMessageItem from '../../modules/chatroom/common/chatroom-message-item.vue'
import ChatroomNoticeBanner from '../../modules/chatroom/common/chatroom-notice-banner.vue'
import type { ChatroomContainerEmits, ChatroomContainerProps } from './types'

const props = withDefaults(defineProps<ChatroomContainerProps>(), {
  roomId: '',
  scene: undefined,
  autoJoin: true,
  historyPageSize: 50,
  maxMessages: 200,
})

const emit = defineEmits<ChatroomContainerEmits>()

const { currentUser } = useClient()
const {
  status,
  roomInfo,
  announcement,
  isAllMuted,
  isJoined,
  kickReason,
  join,
  leave,
  joinSignalRoom,
  leaveSignalRoom,
  subscribeSignalMessages,
  subscribeSignalStatus,
} = useChatroom({
  historyPageSize: props.historyPageSize,
  maxMessages: props.maxMessages,
})
const { messages, historyHasMore, loadingHistory, sendText, sendImage, loadMoreHistory } = useChatroomMessage()
const { canManage, muteList, isInAllowlist, updateAnnouncement } = useChatroomMember()
const { sceneConfig, features } = useChatroomScene(() => props.scene)

/** 场景主题 CSS 变量覆盖：应用到容器根元素（P3，设计文档 §5.5；卸载恢复） */
const rootRef = ref<HTMLElement>()
/** 已应用的覆盖变量（卸载时逐条恢复原值） */
let appliedThemeOverrides: Record<string, string> = {}
watch(
  () => sceneConfig.value.themeOverrides,
  (overrides) => {
    const el = rootRef.value
    if (!el)
      return
    // 恢复上一场景覆盖的变量
    for (const key of Object.keys(appliedThemeOverrides))
      el.style.removeProperty(key)
    appliedThemeOverrides = {}
    if (overrides) {
      for (const [key, value] of Object.entries(overrides)) {
        el.style.setProperty(key, value)
        appliedThemeOverrides[key] = value
      }
    }
  },
  { immediate: true },
)
onUnmounted(() => {
  const el = rootRef.value
  if (el) {
    for (const key of Object.keys(appliedThemeOverrides))
      el.style.removeProperty(key)
    appliedThemeOverrides = {}
  }
})

/** 模板枚举常量（禁止模板内硬编码字符串） */
const JOINING = CHATROOM_STATUS.JOINING
const IDLE = CHATROOM_STATUS.IDLE

/** 当前用户 ID（归一化） */
const selfId = computed(() => normalizeUserId(currentUser.value ?? ''))

/** 自己是否在禁言名单中（onMuteListAdded 事件已同步到 store） */
const selfMuted = computed(() =>
  muteList.value.some(item => normalizeUserId(item.userId) === selfId.value))

/** 全员禁言时自己是否在白名单（白名单成员可发言豁免，P2 review P1-8；进房/全员禁言状态变化时刷新） */
const inAllowlist = ref(false)
watch(
  [isAllMuted, isJoined] as const,
  ([allMuted, joined]) => {
    if (joined && allMuted && !canManage.value) {
      void isInAllowlist().then((v) => {
        inAllowlist.value = v
      }).catch(() => {
        inAllowlist.value = false
      })
    }
    else {
      inAllowlist.value = false
    }
  },
  { immediate: true },
)

/** 输入条禁用：未进房 / 全员禁言且非管理员且不在白名单 / 自己被禁言 */
const inputDisabled = computed(
  () => !isJoined.value || (isAllMuted.value && !canManage.value && !inAllowlist.value) || selfMuted.value,
)

/** 输入条禁用原因提示（P2 review P2-8） */
const inputDisabledHint = computed(() => {
  if (!inputDisabled.value)
    return ''
  if (isAllMuted.value && !canManage.value && !inAllowlist.value)
    return t('chatroom.ui.allMuted')
  if (selfMuted.value)
    return t('chatroom.ui.selfMuted')
  return ''
})

/** 成员面板开关 */
const showMemberPanel = ref(false)

/** 公告编辑（P3：owner/admin 经公告条编辑按钮打开） */
const showAnnouncementEditor = ref(false)
const announcementDraft = ref('')
function openAnnouncementEditor() {
  announcementDraft.value = announcement.value
  showAnnouncementEditor.value = true
}
function saveAnnouncement() {
  const content = announcementDraft.value.trim()
  if (!content)
    return
  void updateAnnouncement(content).then(() => {
    showAnnouncementEditor.value = false
  }).catch(() => {
    // 失败已由 useChatroomMember toast
  })
}
/** 成员面板入口（场景配置开启成员列表时展示） */
const memberPanelEnabled = computed(() => features.value.memberList !== 'none')
const announcementEnabled = computed(() => features.value.announcement !== false)

/** 消息列表容器与滚动跟随 */
const listRef = ref<HTMLElement>()
const stickToBottom = ref(true)

/** 自动加入：roomId 就绪且已登录时 join（roomId 变化自动换房；换房重置滚动跟随） */
watch(
  () => props.roomId,
  (id) => {
    // 换房/退房重置滚底跟随（P2 review P1-4：旧房上翻状态不得带到新房）
    stickToBottom.value = true
    if (!props.autoJoin || !id)
      return
    if (currentUser.value) {
      void join(id).catch((error: unknown) => emit('join-error', error))
    }
  },
  { immediate: true },
)

/** 已登录后补 join（roomId 已存在但登录未就绪的场景） */
watch(
  () => currentUser.value,
  (user) => {
    if (user && props.autoJoin && props.roomId && status.value === IDLE) {
      void join(props.roomId).catch((error: unknown) => emit('join-error', error))
    }
  },
)

/**
 * 信令房订阅（§5.9：signal-rooms 数组存在即多房；join/离开按配置差量同步，
 * 失败/终态降级为 signal-status 事件，不拖累 UI 房）。
 */
watch(
  () => props.signalRooms,
  (rooms, prev) => {
    const prevIds = new Set((prev ?? []).map(r => r.roomId))
    const nextIds = new Set((rooms ?? []).map(r => r.roomId))
    // 移除已不在配置中的信令房
    for (const id of prevIds) {
      if (!nextIds.has(id))
        void leaveSignalRoom(id).catch(() => {})
    }
    // 新增/仍在配置中的信令房：保证已加入
    for (const config of rooms ?? []) {
      void joinSignalRoom(config.roomId, {
        pullHistory: config.pullHistory ?? false,
        autoRejoin: config.autoRejoin ?? true,
      }).catch(() => {
        // 失败已降级为 signal-status（joinSignalRoom 内派发）
      })
    }
  },
  { immediate: true, deep: true },
)

/** 信令房消息透传 → signal-message 事件（容器与 headless 同一契约） */
const stopSignalMessage = subscribeSignalMessages(payload => emit('signal-message', payload))
/** 信令房状态 → signal-status 事件 */
const stopSignalStatus = subscribeSignalStatus(payload => emit('signal-status', payload))

/** 被踢/解散终态：事件出口（真实原因码，P2 review P1-2）+ 视图提示 */
watch(
  () => status.value,
  (next, prev) => {
    if (next === CHATROOM_STATUS.KICKED && prev !== CHATROOM_STATUS.KICKED)
      emit('kicked', kickReason.value ?? 0)
    if (next === CHATROOM_STATUS.DESTROYED && prev !== CHATROOM_STATUS.DESTROYED)
      emit('destroyed')
  },
)

/** 新消息滚动跟随（用户停留在底部时） */
watch(
  () => messages.value.length,
  () => {
    if (!stickToBottom.value)
      return
    requestAnimationFrame(() => {
      const el = listRef.value
      if (el)
        el.scrollTop = el.scrollHeight
    })
  },
)

/** 用户滚动离开底部后停止跟随（向上 40px 视为离开） */
function handleListScroll(event: Event) {
  const el = event.target as HTMLElement
  stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40
}

/** 输入条组件引用（发送失败回填用，P2 review P1-6） */
const inputBarRef = ref<InstanceType<typeof ChatroomInputBar>>()

/** 发送文本：乐观上屏清空后失败回填输入框（不丢文本） */
function handleSend(text: string) {
  void sendText(text).catch(() => {
    inputBarRef.value?.setText(text)
  })
}

/** 发送图片 */
function handleSendImage(file: File) {
  void sendImage(file).catch(() => {})
}

/** 退出房间（header 按钮） */
function handleExit() {
  void leave()
}

/** 向上加载更早历史（记录滚动位置，加载后补偿防跳位，P2 review P1-3） */
function handleLoadMore() {
  const el = listRef.value
  const prevScrollGap = el ? el.scrollHeight - el.scrollTop : 0
  void loadMoreHistory(props.historyPageSize)
    .then(() => {
      requestAnimationFrame(() => {
        const target = listRef.value
        if (target && prevScrollGap > 0)
          target.scrollTop = target.scrollHeight - prevScrollGap
      })
    })
    .catch(() => {})
}

/** 终态（被踢/解散）视图 */
const terminalView = computed(() => {
  if (status.value === CHATROOM_STATUS.KICKED)
    return { text: t('chatroom.ui.kickedHint'), destroyed: false }
  if (status.value === CHATROOM_STATUS.DESTROYED)
    return { text: t('chatroom.ui.roomDestroyed'), destroyed: true }
  return null
})

/** 是否为 custom 消息（模板内 custom 插槽分支判断用，避免模板内 TS 断言） */
function isCustomMessage(message: UiMessage): boolean {
  return message.type === MESSAGE_TYPE.CUSTOM
}

/** 场景消息过滤器接线（features.messageFilter，如语聊房过滤图片；P2 review P1-5） */
const visibleMessages = computed(() => {
  const filter = features.value.messageFilter
  return filter ? messages.value.filter(filter) : messages.value
})

/** 容器卸载：退信令房订阅 + 自动退出房间（非终态；服务端成员资格不残留，P2 review P2-11） */
onUnmounted(() => {
  stopSignalMessage()
  stopSignalStatus()
  for (const config of props.signalRooms ?? [])
    void leaveSignalRoom(config.roomId).catch(() => {})
  if (status.value === CHATROOM_STATUS.JOINED || status.value === CHATROOM_STATUS.JOINING)
    void leave()
})

defineExpose({
  join: (id: string) => join(id),
  leave,
})
</script>

<template>
  <div ref="rootRef" class="chatroom-container">
    <!-- 顶部栏（可整条覆盖） -->
    <slot name="header" :status="status" :room-info="roomInfo" :on-exit="handleExit">
      <ChatroomHeader
        :title="roomInfo?.name ?? roomId"
        :member-count="roomInfo?.memberCount"
        :joining="status === JOINING"
        :member-panel-enabled="memberPanelEnabled"
        @back="emit('back')"
        @member-click="showMemberPanel = true"
        @exit="handleExit"
      >
        <template v-if="$slots['header-title']" #title>
          <slot name="header-title" :room-info="roomInfo" />
        </template>
        <template v-if="$slots['header-extra']" #extra>
          <slot name="header-extra" :room-info="roomInfo" />
        </template>
      </ChatroomHeader>
    </slot>

    <!-- 工具条（header 与消息区之间，业务注入） -->
    <slot name="toolbar" :status="status" />

    <!-- 礼物栏（P3：features.gift 开启时渲染，可整体覆盖；默认内置 GiftBar） -->
    <slot v-if="features.gift" name="gift-bar" :disabled="inputDisabled">
      <ChatroomGiftBar :disabled="inputDisabled" />
    </slot>

    <!-- 麦位栏（P3：features.micQueue 开启时渲染，可整体覆盖；默认内置 MicQueue） -->
    <slot v-if="features.micQueue" name="mic-queue">
      <ChatroomMicQueue />
    </slot>

    <!-- 公告条（场景配置开启时展示；owner/admin 可编辑，P3） -->
    <slot v-if="announcementEnabled" name="notice" :content="announcement">
      <ChatroomNoticeBanner
        :content="announcement"
        :editable="canManage"
        @edit="openAnnouncementEditor"
      />
    </slot>

    <!-- 消息区 -->
    <div ref="listRef" class="chatroom-container__list" @scroll="handleListScroll">
      <button
        v-if="historyHasMore && isJoined"
        class="chatroom-container__load-more"
        :disabled="loadingHistory"
        @click="handleLoadMore"
      >
        {{ loadingHistory ? t('chatroom.ui.loading') : t('chatroom.ui.loadMore') }}
      </button>

      <template v-if="visibleMessages.length > 0">
        <template v-for="message in visibleMessages" :key="message.msgLocalId || message.msgServerId || message.localId">
          <!-- custom 消息：业务 message-custom 插槽优先，否则回落消息项兜底渲染 -->
          <slot
            v-if="$slots['message-custom'] && isCustomMessage(message)"
            name="message-custom"
            :message="message"
          />
          <slot v-else name="message-item" :message="message">
            <ChatroomMessageItem :message="message" />
          </slot>
        </template>
      </template>

      <!-- 空态（未进房/暂无消息） -->
      <slot v-else name="empty" :status="status">
        <div class="chatroom-container__empty">
          {{ status === IDLE ? t('chatroom.ui.notJoined') : t('chatroom.ui.empty') }}
        </div>
      </slot>

      <!-- 终态（被踢/解散）提示 -->
      <div v-if="terminalView" class="chatroom-container__terminal">
        <div class="chatroom-container__terminal-text">
          {{ terminalView.text }}
        </div>
        <button class="chatroom-container__terminal-btn" @click="handleExit">
          {{ t('chatroom.ui.exit') }}
        </button>
      </div>
    </div>

    <!-- 输入条（可整体覆盖；ref 供发送失败回填） -->
    <slot name="input-bar" :disabled="inputDisabled">
      <ChatroomInputBar
        ref="inputBarRef"
        :disabled="inputDisabled"
        :disabled-hint="inputDisabledHint"
        @send="handleSend"
        @send-image="handleSendImage"
      />
    </slot>

    <!-- 成员面板（可整体覆盖；场景配置 memberList !== 'none' 时可用；
         mute-all-enabled 由场景 features.muteAll 驱动，P3） -->
    <slot
      v-if="memberPanelEnabled"
      name="member-panel"
      :show="showMemberPanel"
      :on-close="() => { showMemberPanel = false }"
    >
      <ChatroomMemberPanel
        v-model:show="showMemberPanel"
        :mute-all-enabled="features.muteAll === true"
      >
        <template v-if="$slots['member-item']" #item="slotProps">
          <slot name="member-item" v-bind="slotProps" />
        </template>
      </ChatroomMemberPanel>
    </slot>

    <!-- 公告编辑框（P3：owner/admin） -->
    <EmPopup
      v-model:show="showAnnouncementEditor"
      position="center"
      class="chatroom-container__announcement-editor"
    >
      <div class="chatroom-container__announcement-editor-body">
        <div class="chatroom-container__announcement-editor-title">
          {{ t('chatroom.ui.editAnnouncement') }}
        </div>
        <textarea
          v-model="announcementDraft"
          class="chatroom-container__announcement-editor-input"
          :placeholder="t('chatroom.ui.announcementPlaceholder')"
          rows="4"
        />
        <button
          class="chatroom-container__announcement-editor-save"
          :disabled="!announcementDraft.trim()"
          @click="saveAnnouncement"
        >
          {{ t('chatroom.ui.save') }}
        </button>
      </div>
    </EmPopup>
  </div>
</template>

<style scoped>
.chatroom-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--uikit-chat-bg, var(--uikit-bg-base));
  overflow: hidden;
}

.chatroom-container__list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: var(--uikit-safe-bottom, 0px);
}

.chatroom-container__load-more {
  display: block;
  margin: 8px auto;
  padding: 4px 12px;
  border: none;
  border-radius: 999px;
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.04));
  color: var(--uikit-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.chatroom-container__empty {
  text-align: center;
  padding: 48px 24px;
  color: var(--uikit-text-tertiary);
  font-size: 13px;
}

.chatroom-container__terminal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
}

.chatroom-container__terminal-text {
  color: var(--uikit-text-secondary);
  font-size: 14px;
}

.chatroom-container__terminal-btn {
  padding: 6px 20px;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-primary-color);
  color: var(--uikit-text-inverse, #fff);
  font-size: 14px;
  cursor: pointer;
}
</style>
