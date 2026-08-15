<script setup lang="ts">
/**
 * 麦位栏（P3，语聊房场景）：8 个麦位，状态存房间属性 KV
 * （key = voice:micQueue 场景前缀，见 CHATROOM_ATTR_PREFIX / 设计文档 §5.6）。
 * 数据协议：`voice:micQueue` → JSON `{ seats: [{ userId, nickname }] }`。
 * - 空麦位点击上麦（自己入座）；自己的麦位点击下麦；他人麦位（管理员）点击下麦；
 * - 属性四层同步（本地乐观 → set 推送 → 事件同步 → 拉取兜底）由 useChatroomAttributes 承担，
 *   麦位变更对全房间实时可见（直播间卖点：无需自建服务端）。
 */
import { computed } from 'vue'
import { normalizeUserId, t, useClient, useToast } from '@easemob/uikit-core'
import { CHATROOM_ATTR_PREFIX, CHATROOM_MIC_QUEUE_SEAT_COUNT } from '../../../constants'
import { useChatroomAttributes } from '../../../composables/use-chatroom-attributes'
import { useChatroomMember } from '../../../composables/use-chatroom-member'

export interface ChatroomMicSeat {
  /** 麦位上的用户 ID（空麦位为空串） */
  userId: string
  /** 麦位上的用户昵称（展示用） */
  nickname: string
}

/** 麦位属性数据结构（voice:micQueue 的 JSON 载荷） */
interface MicQueuePayload {
  seats: ChatroomMicSeat[]
}

const { currentUser } = useClient()
const toast = useToast()
const { canManage } = useChatroomMember()
const {
  prefixedKey,
  getAttribute,
  setAttributes,
} = useChatroomAttributes()

const MIC_QUEUE_KEY = prefixedKey(CHATROOM_ATTR_PREFIX.VOICE, 'micQueue')

/** 当前用户 ID（归一化，与麦位 userId 比较） */
const selfId = computed(() => normalizeUserId(currentUser.value ?? ''))

/** 麦位列表（属性缺失时全空位） */
const seats = computed<ChatroomMicSeat[]>(() => {
  const raw = getAttribute(MIC_QUEUE_KEY)
  if (!raw)
    return Array.from({ length: CHATROOM_MIC_QUEUE_SEAT_COUNT }, () => ({ userId: '', nickname: '' }))
  try {
    const payload = JSON.parse(raw) as MicQueuePayload
    const list = Array.isArray(payload?.seats) ? payload.seats : []
    return Array.from({ length: CHATROOM_MIC_QUEUE_SEAT_COUNT }, (_, i) => list[i] ?? { userId: '', nickname: '' })
  }
  catch {
    return Array.from({ length: CHATROOM_MIC_QUEUE_SEAT_COUNT }, () => ({ userId: '', nickname: '' }))
  }
})

/** 自己的麦位索引（-1 表示未上麦） */
const mySeatIndex = computed(() => seats.value.findIndex(seat => seat.userId === selfId.value))

/** 写入新麦位状态（本地乐观生效 + 推送服务端） */
async function writeSeats(next: ChatroomMicSeat[]) {
  await setAttributes({ [MIC_QUEUE_KEY]: JSON.stringify({ seats: next }) })
}

/** 点击麦位：空位上麦 / 自己的麦下麦 / 他人麦（管理员）下麦 */
async function handleSeatClick(index: number) {
  const seat = seats.value[index]!
  try {
    if (!seat.userId) {
      // 上麦（自己入座）
      if (mySeatIndex.value !== -1) {
        toast.error(t('chatroom.ui.micAlreadyOnSeat'))
        return
      }
      const next = [...seats.value]
      next[index] = { userId: selfId.value, nickname: currentUser.value ?? selfId.value }
      await writeSeats(next)
      return
    }
    if (seat.userId === selfId.value) {
      // 下麦（自己）
      const next = [...seats.value]
      next[index] = { userId: '', nickname: '' }
      await writeSeats(next)
      return
    }
    // 他人麦位：仅管理员可下麦
    if (canManage.value) {
      const next = [...seats.value]
      next[index] = { userId: '', nickname: '' }
      await writeSeats(next)
    }
  }
  catch {
    // 失败已由 useChatroomAttributes 回滚 + toast
  }
}
</script>

<template>
  <div class="chatroom-mic-queue">
    <span class="chatroom-mic-queue__title">{{ t('chatroom.ui.micQueueTitle') }}</span>
    <div class="chatroom-mic-queue__seats">
      <button
        v-for="(seat, index) in seats"
        :key="index"
        class="chatroom-mic-queue__seat"
        :class="{
          'chatroom-mic-queue__seat--empty': !seat.userId,
          'chatroom-mic-queue__seat--self': seat.userId === selfId,
        }"
        @click="handleSeatClick(index)"
      >
        <span v-if="seat.userId" class="chatroom-mic-queue__avatar">{{ seat.nickname.slice(0, 1) || '?' }}</span>
        <span v-else class="chatroom-mic-queue__empty-icon">＋</span>
        <span class="chatroom-mic-queue__name">{{ seat.userId ? seat.nickname : t('chatroom.ui.micSeatEmpty') }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chatroom-mic-queue {
  padding: 8px 12px;
  background: var(--uikit-bg-elevated, var(--uikit-bg-base));
  border-bottom: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.06));
  flex-shrink: 0;
}

.chatroom-mic-queue__title {
  font-size: 12px;
  color: var(--uikit-text-secondary);
}

.chatroom-mic-queue__seats {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  overflow-x: auto;
}

.chatroom-mic-queue__seat {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 56px;
  padding: 6px 4px;
  border: none;
  border-radius: var(--uikit-components-radius, 8px);
  background: var(--uikit-bg-secondary, rgba(0, 0, 0, 0.04));
  cursor: pointer;
}

.chatroom-mic-queue__seat--empty {
  border: 1px dashed var(--uikit-border-color, rgba(0, 0, 0, 0.12));
}

.chatroom-mic-queue__seat--self {
  background: var(--uikit-bg-active, rgba(51, 177, 255, 0.12));
}

.chatroom-mic-queue__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--uikit-primary-color);
  color: #fff;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chatroom-mic-queue__empty-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.12));
  color: var(--uikit-text-tertiary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chatroom-mic-queue__name {
  font-size: 11px;
  color: var(--uikit-text-secondary);
  max-width: 56px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
