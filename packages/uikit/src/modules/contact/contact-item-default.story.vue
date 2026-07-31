<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import type { UiContact } from '../../sdk/types'
import { useUserInfoStore } from '../../store/user-info'
import ContactItemDefault from './contact-item-default.vue'

const logs = ref<string[]>([])

const contact: UiContact = {
  userId: 'u_alice',
  name: 'Alice',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  remark: '产品经理',
}

const contactNoAvatar: UiContact = {
  userId: 'u_bob',
  name: 'Bob',
}

function injectMock() {
  useUserInfoStore().setUserInfo({
    userId: 'u_alice',
    nickname: 'Alice',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
  })
}

function log(event: string) {
  logs.value.unshift(event)
}
</script>

<template>
  <Story title="Modules/ContactItemDefault">
    <Variant title="默认">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 360px; padding: 16px;">
          <ContactItemDefault :contact="contact" @vue:mounted="injectMock" @click="log('click')" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="选中 / 激活态">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 360px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <ContactItemDefault :contact="contact" active @vue:mounted="injectMock" />
          <ContactItemDefault :contact="contact" selected show-checkbox @vue:mounted="injectMock" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="禁用 / 无头像">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 360px; padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <ContactItemDefault :contact="contact" disabled @vue:mounted="injectMock" />
          <ContactItemDefault :contact="contactNoAvatar" @vue:mounted="injectMock" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="事件日志">
      <UIKitProvider :auto-init="false">
        <div style="max-width: 360px; padding: 16px;">
          <ContactItemDefault :contact="contact" @vue:mounted="injectMock" @click="log('click')" />
        </div>
      </UIKitProvider>
      <div style="padding: 0 16px; font-size: 12px; color: #6b7280;">
        事件：
        <ul style="margin: 4px 0; padding-left: 16px;">
          <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
            {{ logItem }}
          </li>
        </ul>
      </div>
    </Variant>
  </Story>
</template>
