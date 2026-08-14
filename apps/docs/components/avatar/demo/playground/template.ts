/**
 * Avatar 在线代码演练场初始模板（VuePlayground files）
 *
 * 模板约束：只能 import import map 已覆盖的模块
 * （vue / pinia / easemob-websdk / @easemob/uikit），预览 iframe 才能解析。
 * 用户可自由编辑下方 config 配置对象与组件组合，右侧预览实时生效。
 */
export const avatarPlaygroundFiles: Record<string, string> = {
  'App.vue': `
<script setup lang="ts">
import { reactive, watch } from 'vue'
import { EmUIKitProvider, EmAvatar, useThemeStore } from '@easemob/uikit'

const themeStore = useThemeStore()

// ===== 可编辑配置：改这里实时生效 =====
const config = reactive({
  // shape 不传（undefined）时跟随主题 avatarShape（由下方 themeAvatarShape 联动）
  shape: undefined as 'circle' | 'square' | undefined,
  themeAvatarShape: 'circle' as 'circle' | 'square',
  size: 40,
  presence: undefined as 'online' | 'away' | 'busy' | 'offline' | 'doNotDisturb' | 'custom' | undefined,
})

// 主题层形状：写入 ThemeStore，shape 为 undefined 的头像随之联动（仅作用于预览 iframe）
watch(
  () => config.themeAvatarShape,
  (shape) => themeStore.setAvatarShape(shape),
)
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div class="stage">
      <div class="row">
        <em-avatar
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
          name="Felix"
          :shape="config.shape"
          :size="config.size"
          :presence="config.presence"
        />
        <em-avatar
          name="张三"
          :shape="config.shape"
          :size="config.size"
          :presence="config.presence"
        />
        <em-avatar
          name="李雷"
          :shape="config.shape"
          :size="config.size"
          :presence="config.presence"
        />
      </div>
      <p class="hint">
        左起：图片头像 / 中文占位 / 英文占位。shape 不传时跟随「主题头像形状」，
        presence 支持 online / away / busy / offline / doNotDisturb / custom。
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
