<script setup lang="ts">
/**
 * 设置面板 - Provider 能力开关
 *
 * 四个开关由 app.vue 持有（Provider 配置必须在 EmUIKitProvider 挂载前确定），
 * 本面板通过 props/emits 与 demo-page → app.vue 双向绑定，避免状态重复。
 */
import './demo-settings-common.css'

interface Props {
  enableContact: boolean
  enableBlocklist: boolean
  enablePresence: boolean
  useCustomDataSource: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:enableContact', v: boolean): void
  (e: 'update:enableBlocklist', v: boolean): void
  (e: 'update:enablePresence', v: boolean): void
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
function onUseCustomDataSource(e: Event) {
  emit('update:useCustomDataSource', (e.target as HTMLInputElement).checked)
}
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <label class="demo-settings__label">Provider 能力开关</label>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enableContact"
            @change="onEnableContact"
          />
          <span>enableContact 拉取好友列表 / 事件</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enableBlocklist"
            @change="onEnableBlocklist"
          />
          <span>enableBlocklist 拉取黑名单 / 事件</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.enablePresence"
            @change="onEnablePresence"
          />
          <span>enablePresence 按需订阅在线状态</span>
        </label>
        <label class="demo-check">
          <input
            type="checkbox"
            :checked="props.useCustomDataSource"
            @change="onUseCustomDataSource"
          />
          <span>使用自定义 dataSource（业务接管 fetchContacts）</span>
        </label>
      </div>
      <div class="demo-info">
        默认 enableContact / enableBlocklist / enablePresence 开启。关闭对应开关后，登录后 Provider 不再拉取对应列表/事件。<br />
        启用自定义 dataSource 后，拉好友将走示例接口（返回 Alice/Bob）而非 SDK。
      </div>
    </div>
  </div>
</template>
