<script setup lang="ts">
import { ref } from 'vue'
import { EmUIKitProvider } from '@easemob/uikit-im'
import type { UiContact } from '@easemob/uikit-im'

const show = ref(false)
const addedLog = ref('')

// 模拟业务侧用户库：手机号 / 邮箱 → 环信 userId
const mockUsers = [
  { userId: 'zhangsan', name: '张三', phone: '13800138000' },
  { userId: 'lisi', name: '李四', phone: '13900139000' },
  { userId: 'wangwu', name: '王五', mail: 'wangwu@example.com' },
]

async function mockSearch(keyword: string): Promise<UiContact[]> {
  const kw = keyword.trim().toLowerCase()
  if (!kw)
    return []
  return mockUsers
    .filter(
      u =>
        u.userId.includes(kw)
        || u.name.includes(kw)
        || u.phone?.includes(kw)
        || u.mail?.includes(kw),
    )
    .map(u => ({ userId: u.userId, name: u.name }))
}

async function mockAdd(userId: string, message?: string) {
  addedLog.value = `已发起申请：${userId}${message ? `（${message}）` : ''}`
}

function onAdded(userId: string) {
  addedLog.value = `添加成功：${userId}`
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
        按手机号添加联系人
      </button>
      <div
        v-if="addedLog"
        style="margin-top: 8px; font-size: 12px; color: #6b7280"
      >
        {{ addedLog }}
      </div>
      <em-add-contact-modal
        v-model:show="show"
        :search-fn="mockSearch"
        :add-fn="mockAdd"
        @added="onAdded"
      />
    </div>
  </EmUIKitProvider>
</template>
