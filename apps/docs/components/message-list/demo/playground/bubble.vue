<script setup lang="ts">
/**
 * 单条消息气泡配置演练场（交互式 demo）
 *
 * 左侧 DocsConfigPanel 声明式配置面板 + 右侧 EmUIKitProvider 内直接渲染
 * EmMessageBubbleWrapper（四条消息：普通 / 带引用卡片 / 状态可切换 / 群已读圆圈）。
 */
import { computed, reactive, ref } from 'vue'
import {
  EmMessageBubbleWrapper,
  EmUIKitProvider,
  MESSAGE_STATUS,
} from '@easemob/uikit'
import type { ChatConfig, UiMessage } from '@easemob/uikit'
import type { ConfigItem } from '../../../../.vitepress/components/DocsConfigPanel.vue'
import {
  buildGroupReadMessage,
  buildPlainMessage,
  buildQuoteMessage,
  buildSelfMessage,
} from './mock'

/** 已选中的消息 ID（多选模式演示） */
const selectedIds = ref<Set<string>>(new Set())

/** 气泡配置（面板直接读写，实时作用于右侧气泡） */
const bubbleConfig = reactive<{
  isMultiSelectMode: boolean
  selfStatus: UiMessage['status']
  groupReadReceiptEnabled: boolean
  messageStatus: {
    style: 'classic' | 'capsule'
    direction: 'horizontal' | 'vertical'
    position: 'below' | 'inline'
    showText: boolean
  }
}>(
  {
    isMultiSelectMode: false,
    selfStatus: MESSAGE_STATUS.READ,
    groupReadReceiptEnabled: false,
    messageStatus: {
      style: 'classic',
      direction: 'horizontal',
      position: 'below',
      showText: false,
    },
  },
)

/** 组装为 EmMessageBubbleWrapper 的 config / 回执配置入参 */
const chatConfig = computed<ChatConfig>(() => ({
  messageList: {
    messageStatus: { ...bubbleConfig.messageStatus },
  },
  groupReadReceipt: { enabled: bubbleConfig.groupReadReceiptEnabled },
}))

/** 四条演示消息（己方消息状态随面板实时重建） */
const messages = computed(() => [
  buildPlainMessage(),
  buildQuoteMessage(),
  buildSelfMessage(bubbleConfig.selfStatus),
  buildGroupReadMessage(),
])

/** 多选：切换选中状态 */
function handleToggleSelect(messageId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(messageId))
    next.delete(messageId)
  else
    next.add(messageId)
  selectedIds.value = next
}

/** 配置面板声明（label / tip / 控件类型 / model 点分路径） */
const items: ConfigItem[] = [
  {
    key: 'isMultiSelectMode',
    label: '多选模式',
    type: 'boolean',
    tip: '开启后每条消息左侧出现复选框，点击气泡切换选中态',
  },
  {
    key: 'selfStatus',
    label: '己方消息状态',
    type: 'select',
    tip: '第三条（己方）消息的发送状态：发送中 / 已发送 / 已送达 / 已读 / 发送失败',
    options: [
      { label: '发送中', value: MESSAGE_STATUS.SENDING },
      { label: '已发送', value: MESSAGE_STATUS.SENT },
      { label: '已送达', value: MESSAGE_STATUS.DELIVERED },
      { label: '已读', value: MESSAGE_STATUS.READ },
      { label: '发送失败', value: MESSAGE_STATUS.FAILED },
    ],
  },
  {
    key: 'groupReadReceiptEnabled',
    label: '群已读回执',
    type: 'boolean',
    tip: '开启后群聊己方消息默认激活已读圆圈（第四条消息自带已读数 5，常显圆圈）',
  },
  {
    key: 'messageStatus.style',
    label: '状态风格',
    type: 'select',
    tip: 'classic 经典双勾映射；capsule 数字胶囊风格（未读空心圆 / 已读圆+对勾）',
    options: [
      { label: '经典', value: 'classic' },
      { label: '数字胶囊', value: 'capsule' },
    ],
  },
  {
    key: 'messageStatus.direction',
    label: '状态排列',
    type: 'select',
    options: [
      { label: '横向', value: 'horizontal' },
      { label: '纵向', value: 'vertical' },
    ],
  },
  {
    key: 'messageStatus.position',
    label: '状态位置',
    type: 'select',
    tip: 'below 展示在气泡下方；inline 与气泡同行（占据列表宽度）',
    options: [
      { label: '气泡下方', value: 'below' },
      { label: '与气泡同行', value: 'inline' },
    ],
  },
  {
    key: 'messageStatus.showText',
    label: '状态文本',
    type: 'boolean',
    tip: '状态图标旁是否展示文字（已送达 / 已读等）',
  },
]
</script>

<template>
  <div class="playground">
    <div class="playground__panel">
      <DocsConfigPanel
        title="气泡配置"
        :model="bubbleConfig"
        :items="items"
      />
    </div>
    <div class="playground__stage">
      <EmUIKitProvider :auto-init="false">
        <div class="playground__list">
          <EmMessageBubbleWrapper
            v-for="msg in messages"
            :key="msg.msgLocalId"
            :message="msg"
            :config="chatConfig.messageList"
            :action-config="chatConfig.messageAction"
            :group-read-receipt-config="chatConfig.groupReadReceipt"
            :is-multi-select-mode="bubbleConfig.isMultiSelectMode"
            :is-selected="selectedIds.has(msg.msgServerId || msg.msgLocalId)"
            @toggle-select="handleToggleSelect"
          />
        </div>
      </EmUIKitProvider>
    </div>
  </div>
</template>

<style scoped>
.playground {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.playground__panel {
  flex: 0 0 260px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  align-self: flex-start;
}

.playground__stage {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 560px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: auto;
  background-color: var(--vp-c-bg);
  padding: 16px;
}

.playground__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

@media (max-width: 768px) {
  .playground {
    flex-direction: column;
  }

  .playground__panel {
    flex: none;
    width: 100%;
  }

  .playground__stage {
    flex: none;
    height: 480px;
  }
}
</style>
