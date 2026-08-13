<script setup lang="ts">
/**
 * 消息列表配置演练场（交互式 demo）
 *
 * 左侧 DocsConfigPanel 声明式配置面板（开关实时生效）+ 右侧无登录渲染的
 * EmMessageList。mock 数据注入与渲染模式同 Histoire story
 * （packages/uikit/src/modules/chat/message-list/message-list.story.vue）。
 */
import { computed, reactive } from 'vue'
import { EmMessageList, EmUIKitProvider } from '@easemob/uikit'
import type { ChatConfig } from '@easemob/uikit'
import type { ConfigItem } from '../../../.vitepress/components/DocsConfigPanel.vue'
import { injectMockChatData } from './mock-chat-data'

// 注入 mock 会话与全类型消息（仅客户端执行，见 DemoBlock 的 ClientOnly）
injectMockChatData()

/** 消息列表配置（面板直接读写，实时作用于右侧列表） */
const messageListConfig = reactive<NonNullable<ChatConfig['messageList']>>({
  layout: 'conversation',
  showAvatar: true,
  showTime: 'always',
  bubbleShape: 'round',
  avatarSize: 36,
  messageGap: 12,
  messagePadding: 16,
  // mock 演练场无 SDK 连接，禁用历史加载避免 loadMoreHistory 报错
  loadHistory: { enable: false },
  messageStatus: {
    style: 'classic',
    direction: 'horizontal',
    position: 'below',
    showText: false,
  },
})

/** 组装为 EmMessageList 的 config 入参 */
const chatConfig = computed<ChatConfig>(() => ({
  messageList: { ...messageListConfig },
}))

/** 配置面板声明（label / tip / 控件类型 / model 点分路径） */
const items: ConfigItem[] = [
  {
    key: 'layout',
    label: '气泡布局',
    type: 'select',
    tip: 'conversation 对话式左右分列；left 全部靠左对齐（类似工作群）',
    options: [
      { label: '对话式', value: 'conversation' },
      { label: '左对齐', value: 'left' },
    ],
  },
  {
    key: 'showAvatar',
    label: '显示头像',
    type: 'boolean',
    tip: '是否在消息旁显示发送者头像，关闭后气泡区域更紧凑',
  },
  {
    key: 'showTime',
    label: '时间戳',
    type: 'select',
    tip: '关闭不展示；始终显示每页首条时间；悬停气泡时浮出时间',
    options: [
      { label: '关闭', value: false },
      { label: '始终显示', value: 'always' },
      { label: '悬停显示', value: 'hover' },
    ],
  },
  {
    key: 'bubbleShape',
    label: '气泡形状',
    type: 'select',
    options: [
      { label: '圆角', value: 'round' },
      { label: '直角', value: 'square' },
    ],
  },
  {
    key: 'avatarSize',
    label: '头像尺寸',
    type: 'number',
    min: 28,
    max: 56,
    step: 4,
    text: 'px',
  },
  {
    key: 'messageGap',
    label: '消息间距',
    type: 'number',
    min: 4,
    max: 32,
    text: 'px',
  },
  {
    key: 'messagePadding',
    label: '列表内边距',
    type: 'number',
    min: 4,
    max: 32,
    text: 'px',
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
    tip: '状态图标旁是否展示文字（发送中 / 已发送 / 已读等）',
  },
]
</script>

<template>
  <div class="playground">
    <div class="playground__panel">
      <DocsConfigPanel
        title="消息列表配置"
        :model="messageListConfig"
        :items="items"
      />
    </div>
    <div class="playground__stage">
      <EmUIKitProvider :auto-init="false">
        <EmMessageList :config="chatConfig" />
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
  /* flex-basis: 0 与内容高度冲突时（移动端 column 布局）允许收缩，
     否则 min-height: auto 会把舞台撑到内容总高度、内部无法滚动 */
  min-height: 0;
  height: 560px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--vp-c-bg);
}

.playground__stage :deep(> *) {
  height: 100%;
  /* .uikit-provider 自身无 display: flex，内部 .message-list 的 flex: 1
     不生效会按内容展开；补上 flex 布局把高度约束传导到滚动容器 */
  display: flex;
  flex-direction: column;
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
    /* column 布局下 flex: 1 的 flex-basis: 0% 会作用于主轴高度并覆盖
       height，需改为 flex: none 让固定高度生效、内部自行滚动 */
    flex: none;
    height: 480px;
  }
}
</style>
