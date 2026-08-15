<script setup lang="ts">
/**
 * 设置面板 - 消息通知
 *
 * 控制 EmNotification 消息通知能力：
 * - 总开关 / 浏览器系统通知 / 页内右上角弹窗 / 首次自动请求权限
 * - 触发模式：background（仅页面隐藏时通知，默认）| always（非当前会话即通知）
 * - 新消息响铃（onNotify 送达回调演示，铃声由业务侧实现）
 * - 展示浏览器通知权限状态，支持手动请求
 * 说明：点击通知默认跳转对应会话（Provider 内置行为，navigateOnClick 默认开启）。
 */
import { computed } from 'vue'
import { useNotification } from '@easemob/uikit-im'
import { noticeTone, useDemoSettings } from '../../composables/use-demo-settings'
import DemoSettingLabel from './demo-setting-label.vue'
import './demo-settings-common.css'

const { state: notificationState, ensureBrowserPermission } = useNotification()
const {
  notificationEnable,
  notificationBrowser,
  notificationInApp,
  notificationAutoRequest,
  notificationTriggerMode,
  notificationSound,
} = useDemoSettings()

/** 浏览器通知权限中文文案 */
const permissionText = computed(() => {
  const map: Record<string, string> = {
    granted: '已授权',
    denied: '已拒绝',
    default: '未决定',
    unsupported: '浏览器不支持',
  }
  return map[notificationState.value.permission] || notificationState.value.permission
})

/** 手动请求浏览器通知权限（结果实时反映在状态上） */
async function requestPermission() {
  await ensureBrowserPermission()
}
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <DemoSettingLabel
        title="通知开关"
        tip="消息通知总开关：浏览器系统通知（页面在后台时）、页内右上角弹窗（浏览器通知不可用时降级）、首次自动请求浏览器权限"
      />
      <label class="demo-check">
        <input v-model="notificationEnable" type="checkbox">
        <span>启用消息通知</span>
      </label>
      <label class="demo-check">
        <input v-model="notificationBrowser" type="checkbox" :disabled="!notificationEnable">
        <span>浏览器系统通知（页面在后台时优先）</span>
      </label>
      <label class="demo-check">
        <input v-model="notificationInApp" type="checkbox" :disabled="!notificationEnable">
        <span>页内右上角弹窗（浏览器通知不可用时降级）</span>
      </label>
      <label class="demo-check">
        <input v-model="notificationAutoRequest" type="checkbox" :disabled="!notificationEnable">
        <span>首次通知时自动请求浏览器权限</span>
      </label>
      <label class="demo-check">
        <input v-model="notificationSound" type="checkbox" :disabled="!notificationEnable">
        <span>新消息响铃（onNotify 送达回调演示：Web Audio 哔声）</span>
      </label>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="触发模式"
        tip="通知触发条件：仅页面隐藏时（background）/ 非当前会话即触发（always）；均需满足 非自己发送 + 非当前会话 + 会话未免打扰"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': notificationTriggerMode === 'background' }"
          :disabled="!notificationEnable"
          @click="notificationTriggerMode = 'background'"
        >
          仅页面隐藏时
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': notificationTriggerMode === 'always' }"
          :disabled="!notificationEnable"
          @click="notificationTriggerMode = 'always'"
        >
          非当前会话即触发
        </button>
      </div>
      <p class="demo-info">
        触发条件：非自己发送 + 非当前会话 + 会话未免打扰（isMuted）
        {{ notificationTriggerMode === 'background' ? '+ 页面处于后台' : '' }}
      </p>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="系统通知文案"
        tip="群系统通知（成员加入/退出、群创建等）的话术定制：内置多语言文案 / 俏皮话术（renderText 覆盖）/ 关闭入群相关通知（disabledEvents）"
      />
      <div class="demo-settings__options">
        <button
          class="demo-option"
          :class="{ 'demo-option--active': noticeTone === 'default' }"
          @click="noticeTone = 'default'"
        >
          内置
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': noticeTone === 'playful' }"
          @click="noticeTone = 'playful'"
        >
          俏皮话术
        </button>
        <button
          class="demo-option"
          :class="{ 'demo-option--active': noticeTone === 'silent' }"
          @click="noticeTone = 'silent'"
        >
          关闭入群通知
        </button>
      </div>
      <p class="demo-info">
        俏皮模式同时演示 filter：批量加入超过 5 人时不展示成员加入通知
      </p>
    </div>

    <div class="demo-settings__group">
      <DemoSettingLabel
        title="浏览器通知权限"
        tip="当前浏览器对本站通知的授权状态，可手动请求授权"
      />
      <div class="demo-settings__options">
        <span class="demo-info">状态: {{ permissionText }}</span>
        <button
          class="demo-btn"
          :disabled="!notificationBrowser || notificationState.permission === 'granted' || notificationState.permission === 'unsupported'"
          @click="requestPermission"
        >
          请求权限
        </button>
      </div>
    </div>
  </div>
</template>
