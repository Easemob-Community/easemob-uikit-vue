<script setup lang="ts">
/**
 * 设置面板 - 开发者（Dev Hints + 日志排查）
 *
 * D87「Demo 开发者友好模式」开关：
 * 开启后悬停会话项/消息气泡等区域，浮出该功能用到的环信接口 + UIKit 实现思路；
 * 气泡悬停 2s 出 💡 角标，点击展开详情抽屉。
 *
 * 日志排查：UIKit / SDK 运行日志持久化在 IndexedDB（easemob_uikit_logs），
 * 「收集 SDK 日志」开关经 Provider logger prop 下发；可导出 .log 文件用于问题排查。
 *
 * 注：键盘操作演示已移至「外观」面板（键盘操作分组）。
 */
import { ref } from 'vue'
import { clearPersistedLogs, exportPersistedLogs } from '@easemob/uikit'
import {
  demoCollectSdkLog,
  demoSdkLogLevel,
  demoUikitLogLevel,
  setDemoSdkLogLevel,
  setDemoUikitLogLevel,
  toggleDemoCollectSdkLog,
  useDemoSettings,
} from '../../composables/use-demo-settings'
import DemoSettingLabel from './demo-setting-label.vue'
import './demo-settings-common.css'

const { devHintsEnabled, toggleDevHints } = useDemoSettings()

/** 日志操作结果反馈（导出条数 / 清空提示） */
const logActionTip = ref('')

const uikitLogLevels = ['debug', 'info', 'warn', 'error'] as const
const sdkLogLevels = ['debug', 'warn', 'error'] as const

async function onExportLogs() {
  const count = await exportPersistedLogs()
  logActionTip.value = `已导出 ${count} 条日志`
}

async function onClearLogs() {
  await clearPersistedLogs()
  logActionTip.value = '已清空本地日志'
}
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <DemoSettingLabel
        title="开发者友好模式"
        tip="悬停会话项 / 输入框 / 聊天容器等区域，浮出该功能用到的环信接口 + UIKit 实现思路（仅桌面端生效）"
      />
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

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="日志排查"
        tip="UIKit 运行日志默认持久化到 IndexedDB（保留 7 天 / 最多 5000 条），可导出 .log 文件排查问题"
      />
      <button
        class="demo-btn"
        :class="{ 'demo-btn--active': demoCollectSdkLog }"
        @click="toggleDemoCollectSdkLog(!demoCollectSdkLog)"
      >
        收集 SDK 日志：{{ demoCollectSdkLog ? '已开启' : '已关闭' }}
      </button>
      <div class="demo-settings__row">
        <span class="demo-settings__row-label">UIKit 日志级别</span>
      </div>
      <div class="demo-settings__options">
        <button
          v-for="lv in uikitLogLevels"
          :key="lv"
          class="demo-option"
          :class="{ 'demo-option--active': demoUikitLogLevel === lv }"
          @click="setDemoUikitLogLevel(lv)"
        >
          {{ lv }}
        </button>
      </div>
      <div class="demo-settings__row">
        <span class="demo-settings__row-label">SDK 日志级别</span>
      </div>
      <div class="demo-settings__options">
        <button
          v-for="lv in sdkLogLevels"
          :key="lv"
          class="demo-option"
          :class="{ 'demo-option--active': demoSdkLogLevel === lv }"
          @click="setDemoSdkLogLevel(lv)"
        >
          {{ lv }}
        </button>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="demo-btn" @click="onExportLogs">
          导出日志
        </button>
        <button class="demo-btn" @click="onClearLogs">
          清空日志
        </button>
      </div>
      <div v-if="logActionTip" class="demo-info">
        {{ logActionTip }}
      </div>
      <div class="demo-info">
        ① 级别是「收集范围」：低于所选级别的日志直接丢弃（不序列化、不落库），调低级别后立即生效；<br>
        ② 生产建议 UIKit=info、SDK=warn；排查时临时调 debug 复现，导完改回，避免心跳等高频日志冲刷缓冲；<br>
        ③ 导出的 .log 每行格式：[时间] [级别] [来源:命名空间] 消息 参数。
      </div>
    </div>
  </div>
</template>
