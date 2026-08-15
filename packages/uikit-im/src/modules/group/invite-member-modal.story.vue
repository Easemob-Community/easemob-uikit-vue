<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import InviteMemberModal from './invite-member-modal.vue'

const show = ref(false)
const logs = ref<string[]>([])

function injectMock() {
  useContactStore().setContactList([
    { userId: 'u_alice', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
    { userId: 'u_bob', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
    { userId: 'u_carol', name: 'Carol', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol' },
    { userId: 'u_david', name: 'David' },
  ])
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/InviteMemberModal">
    <Variant title="默认">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          邀请成员
        </button>
        <UIKitProvider :auto-init="false">
          <InviteMemberModal v-model:show="show" group-id="g_design" @vue:mounted="injectMock" @invited="(ids: string[]) => log('invited', ids.join(','))" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="已加入成员禁用">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          邀请成员（2 人已在群）
        </button>
        <UIKitProvider :auto-init="false">
          <InviteMemberModal
            v-model:show="show"
            group-id="g_design"
            :existing-member-ids="['u_alice', 'u_bob']"
            @vue:mounted="injectMock"
            @invited="(ids: string[]) => log('invited', ids.join(','))"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          邀请成员
        </button>
        <UIKitProvider :auto-init="false">
          <InviteMemberModal v-model:show="show" group-id="g_design" @vue:mounted="injectMock" @invited="(ids: string[]) => log('invited', ids.join(','))" />
        </UIKitProvider>
        <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
          事件：
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
              {{ logItem }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>
  </Story>
</template>
