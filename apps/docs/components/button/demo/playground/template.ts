/**
 * Button 在线代码演练场初始模板（VuePlayground files）
 *
 * 模板约束：只能 import import map 已覆盖的模块
 * （vue / pinia / easemob-websdk / @easemob/uikit-im），预览 iframe 才能解析。
 * 用户可自由编辑下方 config 配置对象与组件组合，右侧预览实时生效。
 */
export const buttonPlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { reactive } from 'vue'
import { EmUIKitProvider, EmButton, EmIcon } from '@easemob/uikit-im'

// ===== 可编辑配置：改这里实时生效 =====
const config = reactive({
  type: 'primary' as 'primary' | 'success' | 'warning' | 'danger' | 'danger-outline' | 'default',
  size: 'medium' as 'small' | 'medium' | 'large',
  disabled: false,
  loading: false,
  block: false,
})

// 语义类型行：逐一遍历所有 type，便于对比
const types = ['primary', 'success', 'warning', 'danger', 'danger-outline', 'default'] as const
// 尺寸行：逐一遍历所有 size
const sizes = ['small', 'medium', 'large'] as const
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="stage">
      <div class="section">
        <p class="label">语义类型</p>
        <div class="row">
          <em-button
            v-for="t in types"
            :key="t"
            :type="t"
            :size="config.size"
            :disabled="config.disabled"
            :loading="config.loading"
          >
            {{ t }}
          </em-button>
        </div>
      </div>

      <div class="section">
        <p class="label">尺寸</p>
        <div class="row">
          <em-button
            v-for="s in sizes"
            :key="s"
            :type="config.type"
            :size="s"
            :disabled="config.disabled"
            :loading="config.loading"
          >
            {{ s }}
          </em-button>
        </div>
      </div>

      <div class="section">
        <p class="label">状态与图标插槽</p>
        <div class="row">
          <em-button type="primary" :size="config.size" disabled>
            禁用
          </em-button>
          <em-button type="primary" :size="config.size" loading>
            加载中
          </em-button>
          <em-button
            :type="config.type"
            :size="config.size"
            :disabled="config.disabled"
            :loading="config.loading"
          >
            <em-icon name="check" :size="16" />
            带图标
          </em-button>
        </div>
        <em-button
          :type="config.type"
          :size="config.size"
          :disabled="config.disabled"
          :loading="config.loading"
          block
        >
          通栏（block）
        </em-button>
      </div>

      <p class="hint">
        type 覆盖 primary / success / warning / danger / danger-outline / default；
        size 覆盖 small / medium / large；disabled / loading / block 由上方 config 统一控制，
        状态行中的「禁用」「加载中」为固定演示，图标行演示默认插槽内嵌图标。
      </p>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 32px 24px;
  background: var(--uikit-bg-base);
  min-height: 280px;
}
.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--uikit-text-secondary, #888);
}
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--uikit-text-secondary, #888);
}
</style>
`.trim(),
}
