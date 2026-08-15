/**
 * Cell 在线代码演练场初始模板（VuePlayground files）
 *
 * 模板约束：只能 import import map 已覆盖的模块
 * （vue / pinia / easemob-websdk / @easemob/uikit-im），预览 iframe 才能解析。
 * 用户可自由编辑下方 config 配置对象与组件组合，右侧预览实时生效。
 */
export const cellPlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { reactive } from 'vue'
import { EmUIKitProvider, EmCell, EmAvatar } from '@easemob/uikit-im'

// ===== 可编辑配置：改这里实时生效 =====
const config = reactive({
  size: 'normal' as 'compact' | 'normal' | 'large',
  showArrow: true,
  border: 'bottom' as boolean | 'top' | 'bottom',
  disabled: false,
  danger: false,
  insetHover: true,
})
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="stage">
      <div class="list">
        <em-cell
          title="消息通知"
          subtitle="查看全部会话消息"
          :size="config.size"
          :show-arrow="config.showArrow"
          :border="config.border"
          :disabled="config.disabled"
          :danger="config.danger"
          :inset-hover="config.insetHover"
        >
          <template #leading>
            <em-avatar name="张三" :size="32" />
          </template>
        </em-cell>

        <em-cell
          title="群聊设置"
          meta="12 名成员"
          :size="config.size"
          :show-arrow="config.showArrow"
          :border="config.border"
          :disabled="config.disabled"
          :danger="config.danger"
          :inset-hover="config.insetHover"
        >
          <template #leading>
            <em-avatar name="李雷" :size="32" />
          </template>
        </em-cell>

        <em-cell
          title="退出群聊"
          subtitle="移除所有成员"
          danger
          :size="config.size"
          :show-arrow="config.showArrow"
          :border="config.border"
          :disabled="config.disabled"
          :inset-hover="config.insetHover"
        >
          <template #leading>
            <em-avatar name="王五" :size="32" />
          </template>
        </em-cell>

        <em-cell
          title="清空聊天记录"
          meta="不可恢复"
          disabled
          :size="config.size"
          :show-arrow="config.showArrow"
          :border="config.border"
          :danger="config.danger"
          :inset-hover="config.insetHover"
        >
          <template #leading>
            <em-avatar name="赵六" :size="32" />
          </template>
        </em-cell>
      </div>
      <p class="hint">
        第 3 项固定为危险项（danger）、第 4 项固定为禁用项（disabled），
        其余由上方 config 统一控制：size（compact / normal / large）、
        showArrow、border（true=下划线 / false / top / bottom）、
        disabled、danger、insetHover（hover 背景是否内缩）。
      </p>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
  background: var(--uikit-bg-base);
  min-height: 280px;
}
.list {
  border-radius: 8px;
  overflow: hidden;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary, #888);
}
</style>
`.trim(),
}
