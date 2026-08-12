<script setup lang="ts">
import { ref } from 'vue'

/** 一次性动画（shake/flash）通过递增 key 重新触发 */
const shakeKey = ref(0)
const flashKey = ref(0)
</script>

<template>
  <div
    style="
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      align-items: center;
      justify-content: center;
    "
  >
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <em-icon name="actions/loading_arc" :size="32" anim="spin" />
      <span style="font-size: 12px; color: #6b7280;">spin 旋转</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <em-icon name="status/info" :size="32" anim="pulse" />
      <span style="font-size: 12px; color: #6b7280;">pulse 脉冲</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <em-icon :key="shakeKey" name="misc/bell_slash" :size="32" anim="shake" />
      <span style="font-size: 12px; color: #6b7280;">shake 摇摆（一次）</span>
    </div>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
      <em-icon :key="flashKey" name="status/warning" :size="32" anim="flash" />
      <span style="font-size: 12px; color: #6b7280;">flash 闪烁（一次）</span>
    </div>
  </div>
  <div style="display: flex; justify-content: center; margin-top: 16px;">
    <button
      style="
        padding: 6px 16px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
        font-size: 13px;
      "
      @click="shakeKey++; flashKey++"
    >
      重新触发一次性动画
    </button>
  </div>
</template>
