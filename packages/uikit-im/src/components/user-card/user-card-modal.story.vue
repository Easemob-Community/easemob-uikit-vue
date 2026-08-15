<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useUserInfoStore } from '../../store/user-info'
import UserCardModal from './user-card-modal.vue'

const show = ref(false)
const showWithData = ref(false)
const logs = ref<string[]>([])

function injectMockUserInfo() {
  const store = useUserInfoStore()
  store.setUserInfo({
    userId: 'u_alice',
    nickname: 'Alice',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    sign: '热爱生活，热爱代码',
  })
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Components/UserCardModal">
    <Variant title="默认（无用户数据）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          打开用户名片
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="show"
            user-id="u_unknown"
            @send-message="(id: string) => log('send-message', id)"
            @close="log('close')"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="已注入用户数据">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showWithData = true"
        >
          打开用户名片（Alice）
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="showWithData"
            user-id="u_alice"
            @vue:mounted="injectMockUserInfo"
            @send-message="(id: string) => log('send-message', id)"
            @close="log('close')"
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
          打开用户名片
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="show"
            user-id="u_unknown"
            @send-message="(id: string) => log('send-message', id)"
            @close="log('close')"
          />
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
