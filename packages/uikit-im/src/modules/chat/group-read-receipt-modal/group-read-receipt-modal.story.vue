<script setup lang="ts">
import { ref } from 'vue'
import GroupReadReceiptModal from './group-read-receipt-modal.vue'

const show = ref(false)
const showWithData = ref(false)

const readList = ['u_alice', 'u_bob', 'u_carol', 'u_david']
const unreadList = ['u_erica', 'u_frank']
</script>

<template>
  <Story title="Modules/GroupReadReceiptModal">
    <Variant title="默认（空列表）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          打开已读回执
        </button>
        <GroupReadReceiptModal v-model:show="show" :read-list="[]" :unread-list="[]" />
      </div>
    </Variant>

    <Variant title="已读 / 未读列表">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showWithData = true"
        >
          打开已读回执（4 已读 / 2 未读）
        </button>
        <GroupReadReceiptModal v-model:show="showWithData" :read-list="readList" :unread-list="unreadList" />
      </div>
    </Variant>
  </Story>
</template>
