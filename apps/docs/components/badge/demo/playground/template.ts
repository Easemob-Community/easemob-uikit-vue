/**
 * Badge 在线代码演练场初始模板（VuePlayground files）
 *
 * 模板约束：只能 import import map 已覆盖的模块
 * （vue / pinia / easemob-websdk / @easemob/uikit-im），预览 iframe 才能解析。
 * 用户可自由编辑下方 config 配置对象与组件组合，右侧预览实时生效。
 */
export const badgePlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { reactive } from 'vue'
import { EmUIKitProvider, EmBadge, EmAvatar } from '@easemob/uikit-im'

// 状态色映射：status 选择器映射到主题 CSS 变量
const statusColors: Record<'danger' | 'primary' | 'success' | 'warning', string> = {
  danger: 'var(--uikit-danger-color)',
  primary: 'var(--uikit-primary-color)',
  success: 'var(--uikit-success-color)',
  warning: 'var(--uikit-warning-color)',
}

// ===== 可编辑配置：改这里实时生效 =====
const config = reactive({
  count: 5,
  max: 99,
  dot: false,
  status: 'danger' as 'danger' | 'primary' | 'success' | 'warning',
  size: 'normal' as 'normal' | 'small',
  variant: 'filled' as 'filled' | 'stroked',
})
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="stage">
      <div class="row">
        <em-badge
          :count="config.count"
          :max="config.max"
          :dot="config.dot"
          :color="statusColors[config.status]"
          :size="config.size"
          :variant="config.variant"
        >
          <em-avatar name="张三" :size="48" />
        </em-badge>
        <em-badge
          :count="config.count * 3"
          :max="config.max"
          :dot="config.dot"
          :color="statusColors[config.status]"
          :size="config.size"
          :variant="config.variant"
        >
          <em-avatar name="李雷" :size="48" />
        </em-badge>
        <em-badge
          :count="config.count * 30"
          :max="config.max"
          :dot="config.dot"
          :color="statusColors[config.status]"
          :size="config.size"
          :variant="config.variant"
        >
          <em-avatar name="王五" :size="48" />
        </em-badge>
      </div>
      <p class="hint">
        左起三枚徽标计数分别为 count、3×count、30×count，便于观察位数自适应
        （个位 / 十位 / 百位胶囊宽度）与 max 上限（超出显示 max+）；
        dot 模式只显示红点、忽略数字，status 映射主题状态色。
      </p>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 32px 24px;
  background: var(--uikit-bg-base);
  min-height: 280px;
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
  align-items: center;
  justify-content: center;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary, #888);
  text-align: center;
}
</style>
`.trim(),
}
