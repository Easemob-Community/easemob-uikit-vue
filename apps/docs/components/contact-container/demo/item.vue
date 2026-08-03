<script setup lang="ts">
import { EmUIKitProvider } from '@easemob/uikit'

const alice = { userId: 'u_alice', name: 'Alice' }
const bob = { userId: 'u_bob', name: 'Bob', remark: 'Bob（同事）' }
const zhang = { userId: 'u_zhang', name: '张三' }
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div style="width: 320px; margin: 0 auto;">
      <em-contact-item :contact="alice" subtitle="ID: u_alice" online-status="online" />
      <em-contact-item :contact="bob" subtitle="刚刚加入团队" online-status="away" />
      <em-contact-item :contact="zhang" subtitle="客户经理" online-status="busy" select-mode="single" />
      <em-contact-item
        :contact="{ userId: 'u_off', name: 'Offline' }"
        subtitle="离线"
        online-status="offline"
      />
    </div>
  </EmUIKitProvider>
</template>
