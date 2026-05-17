<script setup lang="ts">
import { ref } from 'vue'
import { EmUIKitProvider } from '@easemob/uikit'
import type { Contact } from '@easemob/uikit'
import DemoPage from './demo-page.vue'

/**
 * Provider 三开关 × dataSource 演示
 *
 * - enableContact / enableBlocklist / enablePresence
 *   默认 false。开启后：
 *     1) 登录后 Provider 会拉取对应列表（黑名单同步，好友需 ContactContainer 触发）
 *     2) 事件接收器会挂载对应 SDK 事件
 *     3) Presence 开启后，依赖 ContactItem 等可见包裹会被按需订阅
 *
 * - dataSource：业务可提供自定义接口接管 SDK 默认实现。
 *   下面展示一个只覆盖 fetchContacts 的最小例子。
 */
const enableContact = ref(false)
const enableBlocklist = ref(false)
const enablePresence = ref(false)

/** 是否启用 demo 提供的自定义 dataSource（演示业务接管拉好友逻辑） */
const useCustomDataSource = ref(false)

const customDataSource = {
  /** 示例：业务从自己后端拉取联系人。 */
  async fetchContacts(): Promise<Contact[]> {
    // 实际使用时请替换为业务 API
    return [
      { userId: 'biz_alice', name: 'Alice (业务接口)' },
      { userId: 'biz_bob', name: 'Bob (业务接口)' },
    ]
  },
}
</script>

<template>
  <EmUIKitProvider
    :auto-init="false"
    :enable-contact="enableContact"
    :enable-blocklist="enableBlocklist"
    :enable-presence="enablePresence"
    :data-source="useCustomDataSource ? customDataSource : undefined"
  >
    <DemoPage
      v-model:enable-contact="enableContact"
      v-model:enable-blocklist="enableBlocklist"
      v-model:enable-presence="enablePresence"
      v-model:use-custom-data-source="useCustomDataSource"
    />
  </EmUIKitProvider>
</template>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
}
</style>
