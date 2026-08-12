<script setup lang="ts">
/**
 * 设置面板 - Provider 能力开关
 *
 * 四个开关由 app.vue 持有（Provider 配置必须在 EmUIKitProvider 挂载前确定），
 * 本面板通过 props/emits 与 demo-page → app.vue 双向绑定，避免状态重复。
 */
import DemoSettingLabel from './demo-setting-label.vue'
import './demo-settings-common.css'

interface Props {
  enableContact: boolean
  enableBlocklist: boolean
  enablePresence: boolean
  enableDraft: boolean
  enableAtMe: boolean
  enableTyping: boolean
  useCustomDataSource: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:enableContact', v: boolean): void
  (e: 'update:enableBlocklist', v: boolean): void
  (e: 'update:enablePresence', v: boolean): void
  (e: 'update:enableDraft', v: boolean): void
  (e: 'update:enableAtMe', v: boolean): void
  (e: 'update:enableTyping', v: boolean): void
  (e: 'update:useCustomDataSource', v: boolean): void
}>()

function onEnableContact(e: Event) {
  emit('update:enableContact', (e.target as HTMLInputElement).checked)
}
function onEnableBlocklist(e: Event) {
  emit('update:enableBlocklist', (e.target as HTMLInputElement).checked)
}
function onEnablePresence(e: Event) {
  emit('update:enablePresence', (e.target as HTMLInputElement).checked)
}
function onEnableDraft(e: Event) {
  emit('update:enableDraft', (e.target as HTMLInputElement).checked)
}
function onEnableAtMe(e: Event) {
  emit('update:enableAtMe', (e.target as HTMLInputElement).checked)
}
function onEnableTyping(e: Event) {
  emit('update:enableTyping', (e.target as HTMLInputElement).checked)
}
function onUseCustomDataSource(e: Event) {
  emit('update:useCustomDataSource', (e.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <DemoSettingLabel
        title="Provider 能力开关"
        tip="Provider 各能力开关：好友列表、黑名单、在线状态、草稿、@我、正在输入。开关在 Provider 挂载时读取，登录后修改需重新登录（或刷新页面）才能完整生效"
      />
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enableContact"
            @change="onEnableContact"
          />
          <span>好友列表与好友事件（enableContact）</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enableBlocklist"
            @change="onEnableBlocklist"
          />
          <span>黑名单与拉黑事件（enableBlocklist）</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enablePresence"
            @change="onEnablePresence"
          />
          <span>在线状态订阅（enablePresence）</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enableDraft"
            @change="onEnableDraft"
          />
          <span>会话列表草稿显示（enableDraft）</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enableAtMe"
            @change="onEnableAtMe"
          />
          <span>@我 消息提醒（enableAtMe）</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enableTyping"
            @change="onEnableTyping"
          />
          <span>对方正在输入提示（enableTyping）</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.useCustomDataSource"
            @change="onUseCustomDataSource"
          />
          <span>自定义数据源：由业务接口接管拉取联系人（fetchContacts）</span>
        </label>
      </div>
      <div class="demo-info">
        Provider 能力开关默认全部开启。关闭后对应功能不再拉取 / 渲染 / 发送。<br />
        注意：开关在 Provider 挂载时读取，登录后修改需重新登录（或刷新页面）才能完整生效。<br />
        启用自定义数据源后，拉取好友将走示例接口（返回 Alice / Bob）而非 SDK。
      </div>
    </div>
  </div>
</template>
