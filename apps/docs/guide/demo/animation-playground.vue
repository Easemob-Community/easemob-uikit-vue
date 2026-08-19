<script setup lang="ts">
/**
 * 动效可视化面板（交互式 demo）
 *
 * 展示 UIKit 动画系统的核心 token：
 * - 入场/离场过渡（fade-scale）
 * - 缓动曲线对比（standard / decel / accel / spring）
 * - Ripple 波纹反馈
 * - 按压缩放（scale-press）
 * - 全局动画开关与强度等级（subtle / normal / expressive）
 *
 * 舞台通过局部 CSS 变量 + data-uikit-anim-level / data-uikit-anim-enabled
 * 作用域限定，不污染全局主题。
 */
import { computed, reactive, ref } from 'vue'
import type { ConfigItem } from '../../.vitepress/components/DocsConfigPanel.vue'

const animConfig = reactive<{
  enabled: boolean
  level: 'subtle' | 'normal' | 'expressive'
}>({
  enabled: true,
  level: 'normal',
})

const stageAttrs = computed(() => ({
  'data-uikit-anim-level': animConfig.level,
  'data-uikit-anim-enabled': String(animConfig.enabled),
}))

const showCard = ref(true)
const rippleContainer = ref<HTMLButtonElement>()

function createRipple(event: MouseEvent) {
  if (!animConfig.enabled)
    return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x = event.clientX - rect.left - size / 2
  const y = event.clientY - rect.top - size / 2
  const ripple = document.createElement('span')
  ripple.className = 'anim-playground__ripple'
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`
  target.appendChild(ripple)
  setTimeout(() => ripple.remove(), 800)
}

const items: ConfigItem[] = [
  {
    key: 'enabled',
    label: '动画开关',
    type: 'boolean',
    tip: '--uikit-anim-enabled：关闭后所有动画时长归零，尊重 prefers-reduced-motion',
  },
  {
    key: 'level',
    label: '动画强度',
    type: 'select',
    tip: 'data-uikit-anim-level：subtle 更短更轻，expressive 更长更有弹性',
    options: [
      { label: 'subtle', value: 'subtle' },
      { label: 'normal', value: 'normal' },
      { label: 'expressive', value: 'expressive' },
    ],
  },
]

const easings = [
  { name: 'standard', label: '标准', value: 'cubic-bezier(0.4, 0, 0.2, 1)', desc: '通用过渡' },
  { name: 'decel', label: '减速', value: 'cubic-bezier(0, 0, 0.2, 1)', desc: '入场/展开' },
  { name: 'accel', label: '加速', value: 'cubic-bezier(0.4, 0, 1, 1)', desc: '离场/收起' },
  { name: 'spring', label: '弹性', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', desc: '弹窗/气泡' },
]

const playingEasing = ref<string | null>(null)

function playEasing(name: string) {
  playingEasing.value = name
  setTimeout(() => (playingEasing.value = null), 900)
}
</script>

<template>
  <div class="anim-playground">
    <div class="anim-playground__panel">
      <DocsConfigPanel
        title="动画系统配置"
        :model="animConfig"
        :items="items"
      />
    </div>
    <div class="anim-playground__stage" v-bind="stageAttrs">
      <div class="anim-playground__section">
        <h4 class="anim-playground__section-title">
          入场 / 离场
        </h4>
        <div class="anim-playground__row">
          <button
            class="anim-playground__btn"
            type="button"
            @click="showCard = !showCard"
          >
            {{ showCard ? '隐藏卡片' : '显示卡片' }}
          </button>
          <Transition name="uikit-fade-scale">
            <div v-if="showCard" class="anim-playground__card">
              <div class="anim-playground__card-title">
                fade-scale 过渡
              </div>
              <div class="anim-playground__card-desc">
                Modal / ActionSheet / ImageViewer 等浮层使用此过渡
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div class="anim-playground__section">
        <h4 class="anim-playground__section-title">
          缓动曲线
        </h4>
        <div class="anim-playground__easing-grid">
          <div
            v-for="e in easings"
            :key="e.name"
            class="anim-playground__easing-card"
            @click="playEasing(e.name)"
          >
            <div class="anim-playground__easing-label">
              {{ e.label }}
            </div>
            <div class="anim-playground__easing-value">
              {{ e.value }}
            </div>
            <div class="anim-playground__easing-desc">
              {{ e.desc }}
            </div>
            <div class="anim-playground__easing-track">
              <div
                class="anim-playground__easing-ball"
                :class="{ 'anim-playground__easing-ball--play': playingEasing === e.name }"
                :style="{ animationTimingFunction: e.value }"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="anim-playground__section">
        <h4 class="anim-playground__section-title">
          交互反馈
        </h4>
        <div class="anim-playground__row">
          <button
            ref="rippleContainer"
            class="anim-playground__ripple-btn"
            type="button"
            @click="createRipple"
          >
            点击触发 Ripple
          </button>
          <button
            class="anim-playground__press-btn"
            type="button"
          >
            按下缩放
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anim-playground {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.anim-playground__panel {
  flex: 0 0 260px;
  padding: 14px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  align-self: flex-start;
}

.anim-playground__stage {
  flex: 1;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg);
}

.anim-playground__section + .anim-playground__section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.anim-playground__section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.anim-playground__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.anim-playground__btn,
.anim-playground__ripple-btn,
.anim-playground__press-btn {
  padding: 8px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 13px;
  cursor: pointer;
  transition:
    background-color 0.15s,
    border-color 0.15s,
    transform calc(var(--uikit-anim-duration) * var(--uikit-anim-enabled)) var(--uikit-anim-easing);
}

.anim-playground__btn:hover,
.anim-playground__ripple-btn:hover,
.anim-playground__press-btn:hover {
  border-color: var(--vp-c-brand-1);
}

.anim-playground__press-btn:active {
  transform: scale(var(--uikit-anim-scale-press));
}

.anim-playground__ripple-btn {
  position: relative;
  overflow: hidden;
}

:deep(.anim-playground__ripple) {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  opacity: var(--uikit-anim-ripple-opacity);
  pointer-events: none;
  background-color: currentColor;
  animation: anim-playground-ripple var(--uikit-anim-ripple-duration) var(--uikit-anim-easing) forwards;
}

@keyframes anim-playground-ripple {
  to {
    transform: scale(2.5);
    opacity: 0;
  }
}

.anim-playground__card {
  width: 220px;
  padding: 14px 16px;
  border-radius: var(--uikit-components-radius);
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}

.anim-playground__card-title {
  margin-bottom: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.anim-playground__card-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.anim-playground__easing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.anim-playground__easing-card {
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  cursor: pointer;
  transition: border-color 0.15s;
}

.anim-playground__easing-card:hover {
  border-color: var(--vp-c-brand-1);
}

.anim-playground__easing-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.anim-playground__easing-value {
  margin-top: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 11px;
  color: var(--vp-c-text-2);
  word-break: break-all;
}

.anim-playground__easing-desc {
  margin-top: 2px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.anim-playground__easing-track {
  position: relative;
  height: 4px;
  margin-top: 12px;
  border-radius: 2px;
  background-color: var(--vp-c-divider);
  overflow: hidden;
}

.anim-playground__easing-ball {
  position: absolute;
  top: 50%;
  left: 0;
  width: 12px;
  height: 12px;
  margin-top: -6px;
  border-radius: 50%;
  background-color: var(--vp-c-brand-1);
  transform: translateX(-100%);
}

.anim-playground__easing-ball--play {
  animation: anim-playground-ball 0.8s forwards;
}

@keyframes anim-playground-ball {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(calc(100cqw + 100%));
  }
}

@media (max-width: 768px) {
  .anim-playground {
    flex-direction: column;
  }

  .anim-playground__panel {
    flex: none;
    width: 100%;
  }
}
</style>
