/**
 * 输入框在线代码演练场初始模板（VuePlayground files）
 *
 * 单文件约定：仅 'App.vue'，为用户主编辑区（组件 props + 配置对象）。
 * 模板约束：只能 import import map 已覆盖的模块（vue / pinia / @easemob/uikit），
 * 预览 iframe 才能解析；EmInput 不自带 label 前缀样式，标题 / hint 由外层 div 自绘
 * （参考 apps/docs/components/input/demo/ 下 basic.vue / variants.vue 的用法）。
 */
export const inputPlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { reactive, ref } from 'vue'
import { EmInput, EmUIKitProvider } from '@easemob/uikit'

// ===== 可编辑配置：改这里实时生效 =====
const config = reactive({
  placeholder: '请输入内容',
  type: 'text' as 'text' | 'password' | 'number',
  disabled: false,
  maxlength: 20,
  clearable: true,
  variant: 'default' as 'default' | 'search' | 'filled' | 'ghost' | 'underline',
  // v-model 初始值（config.value 即主输入框的绑定值，改动会覆盖输入内容）
  value: '',
})

// 固定变体示例各自独立的绑定值
const searchValue = ref('')
const filledValue = ref('')
const underlineValue = ref('')
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="demo-wrap">
      <!-- 主输入框：跟随上方 config 实时变化 -->
      <div class="field">
        <div class="field__label">配置驱动（第一个输入框跟随上方配置）</div>
        <EmInput
          v-model="config.value"
          :variant="config.variant"
          :type="config.type"
          :disabled="config.disabled"
          :maxlength="config.maxlength"
          :clearable="config.clearable"
          :placeholder="config.placeholder"
        />
        <div class="field__hint">
          当前：variant={{ config.variant }}｜type={{ config.type }}｜disabled={{ config.disabled }}｜maxlength={{ config.maxlength }}｜clearable={{ config.clearable }}
        </div>
      </div>

      <!-- 固定变体示例 -->
      <div class="field">
        <div class="field__label">search 变体</div>
        <EmInput v-model="searchValue" variant="search" prefix-icon="misc/magnifier2" clearable placeholder="搜索..." />
        <div class="field__hint">prefix-icon 传图标名（格式 "category/icon-name"）；clearable 有内容时显示清除按钮</div>
      </div>

      <div class="field">
        <div class="field__label">filled 变体</div>
        <EmInput v-model="filledValue" variant="filled" prefix-icon="misc/magnifier2" clearable placeholder="搜索..." />
        <div class="field__hint">灰底无边框的旧搜索风格</div>
      </div>

      <div class="field">
        <div class="field__label">underline 变体</div>
        <EmInput v-model="underlineValue" variant="underline" prefix-icon="misc/magnifier2" placeholder="搜索..." />
        <div class="field__hint">无背景、仅底部一条线的最极简风格；password / number / disabled / ghost 可切回上方配置体验</div>
      </div>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.demo-wrap {
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding: 4px 0;
}

.field__label {
  margin-bottom: 6px;
  font-size: var(--uikit-font-size-14);
  color: var(--uikit-text-primary);
}

.field__hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--uikit-text-secondary);
  line-height: 1.6;
}
</style>
`.trim(),
}
