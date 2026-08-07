<script setup lang="ts">
import { ref } from 'vue'
import { EmUIKitProvider, useContactStore } from '@easemob/uikit'
import type { CreateGroupParams } from '@easemob/uikit'

const show = ref(false)
const createdLog = ref('')
const lastParams = ref('')

// 注入演示联系人（实际业务中由 SDK 同步 / dataSource.fetchContacts 提供）
useContactStore().setContactList([
  { userId: 'u_alice', name: 'Alice' },
  { userId: 'u_bob', name: 'Bob' },
  { userId: 'u_carol', name: 'Carol' },
])

/** 模拟业务创建：记录组合配置并返回 groupId */
async function mockCreate(params: CreateGroupParams) {
  lastParams.value = [
    params.public ? '公开群' : '私有群',
    params.joinApprovalRequired ? '需审批' : '',
    params.allowInvites ? '可邀请' : '',
    params.inviteNeedConfirm ? '邀请需确认' : '',
    params.maxMembers ? `上限 ${params.maxMembers} 人` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  return { groupId: `group_${Date.now()}` }
}

function onCreated(groupId: string) {
  createdLog.value = `创建成功：${groupId}（${lastParams.value}）`
}
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div style="max-width: 360px; margin: 0 auto">
      <button
        style="
          padding: 8px 16px;
          border-radius: 8px;
          background: var(--uikit-primary-color);
          color: #fff;
          border: none;
          cursor: pointer;
        "
        @click="show = true"
      >
        创建群组（含群设置）
      </button>
      <div
        v-if="createdLog"
        style="margin-top: 8px; font-size: 12px; color: #6b7280"
      >
        {{ createdLog }}
      </div>
      <em-create-group-modal
        v-model:show="show"
        :config="{ showSettings: true, public: true }"
        :create-fn="mockCreate"
        @created="onCreated"
      />
    </div>
  </EmUIKitProvider>
</template>
