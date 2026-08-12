<script setup lang="ts">
/**
 * 设置面板 - 开发者（Dev Hints）
 *
 * D87「Demo 开发者友好模式」开关：
 * 开启后悬停会话项/消息气泡等区域，浮出该功能用到的环信接口 + UIKit 实现思路；
 * 气泡悬停 2s 出 💡 角标，点击展开详情抽屉。
 *
 * 注：键盘操作演示已移至「外观」面板（键盘操作分组），本面板只保留 Dev Hints。
 */
import { useDemoSettings } from '../../composables/use-demo-settings'
import './demo-settings-common.css'

const { devHintsEnabled, toggleDevHints } = useDemoSettings()
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <label class="demo-settings__label">开发者友好模式</label>
      <button
        class="demo-btn"
        :class="{ 'demo-btn--active': devHintsEnabled }"
        @click="toggleDevHints(!devHintsEnabled)"
      >
        {{ devHintsEnabled ? '已开启' : '已关闭' }}
      </button>
      <div class="demo-info">
        开启后：<br />
        ① 悬停会话项 / 输入框 / 聊天容器 → 浮出提示卡：该功能用到的环信接口 + UIKit 实现思路；<br />
        ② 悬停消息气泡 2 秒 → 气泡右上角出现 💡 角标，点击展开详情抽屉（接口对照 + 参考文件）；<br />
        ③ 官方 5.x 文档上线前，接口权威签名见 SDK 包内 types/*.d.ts，实现思路以 UIKit 源码为准。<br />
        仅桌面端生效，移动端自动隐藏。
      </div>
    </div>
  </div>
</template>
