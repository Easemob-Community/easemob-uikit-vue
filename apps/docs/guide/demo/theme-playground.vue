<script setup lang="ts">
/**
 * 主题 token 演练场（交互式 demo）
 *
 * 左侧 DocsConfigPanel 声明式配置面板 + 右侧 EmConversationContainer 实时预览。
 * 覆盖 D86 已落地的 token 面：品牌色 / 组件圆角 / 字号缩放（适老）/ 密度档。
 *
 * 与 ThemeStore 的全局持久化不同，本次调整通过舞台容器上的局部 CSS 变量
 * （--uikit-*）+ data-uikit-density 属性生效，仅作用于演练场内部，不污染全局主题。
 */
import { computed, reactive } from 'vue'
import { EmConversationContainer, EmUIKitProvider } from '@easemob/uikit'
import type { ConfigItem } from '../../.vitepress/components/DocsConfigPanel.vue'
import { injectMockConversations } from '../../components/conversation-container/demo/playground/mock'

// 注入 mock 会话（仅客户端执行，见 DemoBlock 的 ClientOnly）
injectMockConversations()

/** 字号档位 → --uikit-font-scale（与 ThemeStore FONT_SIZE_PRESET_MAP 一致） */
const FONT_SCALE_MAP: Record<string, number> = {
  normal: 1,
  large: 1.125,
  xlarge: 1.25,
}

/** hsl → "r, g, b" 字符串（供 rgba(var(--uikit-primary-rgb), α) 消费） */
function hslToRgbString(h: number, s: number, l: number): string {
  const sat = s / 100
  const lig = l / 100
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const hp = ((h % 360) + 360) % 360
  const x = c * (1 - Math.abs(((hp / 60) % 2) - 1))
  const m = lig - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hp < 60) {
    r = c
    g = x
  }
  else if (hp < 120) {
    r = x
    g = c
  }
  else if (hp < 180) {
    g = c
    b = x
  }
  else if (hp < 240) {
    g = x
    b = c
  }
  else if (hp < 300) {
    r = x
    b = c
  }
  else {
    r = c
    b = x
  }
  return `${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)}`
}

/** 主题 token 配置（面板直接读写，实时作用于右侧舞台） */
const themeConfig = reactive<{
  hue: number
  radius: number
  fontScale: 'normal' | 'large' | 'xlarge'
  density: 'compact' | 'normal' | 'comfortable'
}>({
  hue: 203,
  radius: 8,
  fontScale: 'normal',
  density: 'normal',
})

/** 舞台容器局部 CSS 变量：覆盖 :root / ThemeStore 写入的全局值 */
const stageStyle = computed<Record<string, string>>(() => {
  const hue = themeConfig.hue
  return {
    '--uikit-components-radius': `${themeConfig.radius}px`,
    '--uikit-components-radius-hover': `${Math.min(themeConfig.radius + 6, 24)}px`,
    '--uikit-font-scale': String(FONT_SCALE_MAP[themeConfig.fontScale]),
    '--uikit-primary-color': `hsl(${hue}, 100%, 60%)`,
    '--uikit-primary-hover': `hsl(${hue}, 100%, 50%)`,
    '--uikit-primary-rgb': hslToRgbString(hue, 100, 60),
  }
})

/** 配置面板声明（label / tip / 控件类型 / model 点分路径） */
const items: ConfigItem[] = [
  {
    key: 'hue',
    label: '品牌色相',
    type: 'number',
    min: 0,
    max: 360,
    step: 10,
    text: '°',
    tip: '主品牌色 HSL 色相（0-360），选中高亮 / 主按钮 / 自己气泡等随之变化',
  },
  {
    key: 'radius',
    label: '组件圆角',
    type: 'number',
    min: 0,
    max: 16,
    step: 1,
    text: 'px',
    tip: '--uikit-components-radius：列表项 / 搜索框 / 输入区等组件圆角，0 为直角',
  },
  {
    key: 'fontScale',
    label: '字号档位',
    type: 'select',
    tip: '--uikit-font-scale：全局字号缩放（适老版），标准 1 / 大 1.125 / 特大 1.25',
    options: [
      { label: '标准', value: 'normal' },
      { label: '大', value: 'large' },
      { label: '特大', value: 'xlarge' },
    ],
  },
  {
    key: 'density',
    label: '密度档位',
    type: 'select',
    tip: 'data-uikit-density：Cell 高度 / 列表间距 / 内边距等尺寸，紧凑 / 标准 / 宽松',
    options: [
      { label: '紧凑', value: 'compact' },
      { label: '标准', value: 'normal' },
      { label: '宽松', value: 'comfortable' },
    ],
  },
]
</script>

<template>
  <div class="playground">
    <div class="playground__panel">
      <DocsConfigPanel
        title="主题 token 配置"
        :model="themeConfig"
        :items="items"
      />
    </div>
    <div class="playground__stage">
      <!-- 局部作用域：CSS 变量 + 密度属性只影响本舞台，不污染全局主题 -->
      <div
        class="playground__stage-inner"
        :data-uikit-density="themeConfig.density"
        :style="stageStyle"
      >
        <EmUIKitProvider :auto-init="false">
          <EmConversationContainer title="消息" />
        </EmUIKitProvider>
      </div>
      <p class="playground__hint">
        调整仅作用于演练场舞台（局部 CSS 变量 + data-uikit-density），不写入 ThemeStore / localStorage，不影响其他页面。
      </p>
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
  overflow: hidden;
  background-color: var(--vp-c-bg);
  display: flex;
  flex-direction: column;
}

.playground__stage-inner {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.playground__stage-inner :deep(> *) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.playground__hint {
  margin: 0;
  padding: 6px 12px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 12px;
  color: var(--vp-c-text-3);
  background-color: var(--vp-c-bg-soft);
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
