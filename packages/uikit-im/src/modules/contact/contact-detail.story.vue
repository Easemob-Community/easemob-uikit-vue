<script setup lang="ts">
import { ref } from 'vue'
import { useUserInfoStore } from '@easemob/uikit-core'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import ContactDetail from './contact-detail.vue'

const logs = ref<string[]>([])

function injectMock() {
  useUserInfoStore().setUserInfo({
    userId: 'u_alice',
    nickname: 'Alice',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    sign: '热爱生活，热爱代码',
  })
  useContactStore().setContactList([
    { userId: 'u_alice', name: 'Alice', remark: '产品经理' },
  ])
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/ContactDetail">
    <Variant title="默认（无缓存数据）">
      <UIKitProvider :auto-init="false">
        <div style="height: 560px; overflow: hidden;">
          <ContactDetail user-id="u_unknown" @send-message="(id: string) => log('send-message', id)" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="已注入用户信息（备注 + 签名）">
      <UIKitProvider :auto-init="false">
        <div style="height: 560px; overflow: hidden;">
          <ContactDetail
            user-id="u_alice"
            @vue:mounted="injectMock"
            @send-message="(id: string) => log('send-message', id)"
            @deleted="(id: string) => log('deleted', id)"
            @block-changed="(id: string, blocked: boolean) => log('block-changed', `${id} blocked=${blocked}`)"
            @remark-changed="(id: string, remark: string) => log('remark-changed', `${id} ${remark}`)"
          />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="自定义插槽（#extra + #actions 接管）">
      <UIKitProvider :auto-init="false">
        <div style="height: 560px; overflow: hidden;">
          <ContactDetail
            user-id="u_alice"
            @vue:mounted="injectMock"
          >
            <template #extra="{ userId }">
              <div style="margin-top: 16px; padding: 12px; border: 1px dashed #94a3b8; border-radius: 8px; font-size: 13px; color: #64748b;">
                自定义扩展区：可在备注与操作按钮之间插入任意内容（userId: {{ userId }}）
              </div>
            </template>
            <template #actions="{ userId }">
              <button
                style="margin-top: 24px; padding: 8px 18px; border: none; border-radius: 999px; background: #e0f2fe; color: #0284c7; cursor: pointer;"
                @click="() => log('custom-action', userId)"
              >
                自定义操作按钮
              </button>
            </template>
          </ContactDetail>
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="事件日志">
      <UIKitProvider :auto-init="false">
        <div style="height: 560px; overflow: hidden;">
          <ContactDetail
            user-id="u_alice"
            @vue:mounted="injectMock"
            @send-message="(id: string) => log('send-message', id)"
            @deleted="(id: string) => log('deleted', id)"
            @block-changed="(id: string, blocked: boolean) => log('block-changed', `${id} blocked=${blocked}`)"
            @remark-changed="(id: string, remark: string) => log('remark-changed', `${id} ${remark}`)"
          />
        </div>
      </UIKitProvider>
      <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
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
