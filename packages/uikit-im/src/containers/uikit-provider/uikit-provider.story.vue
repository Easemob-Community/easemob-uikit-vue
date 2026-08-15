<script setup lang="ts">
import UIKitProvider from './uikit-provider.vue'
import { useToast } from '@easemob/uikit-core'

/**
 * uikit-im Provider 冒烟 story：场景版完整能力覆盖已随迁 core
 * （packages/uikit-core/src/containers/uikit-provider/uikit-provider.story.vue），
 * 此处仅保留场景容器（场景 stores/domains 组合 + 通知跳会话接线）的挂载验证。
 */
const toast = useToast()
</script>

<template>
  <Story title="UIKitProvider">
    <Variant title="Default">
      <UIKitProvider :auto-init="false">
        <div
          style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 200px;
            background: var(--uikit-bg-base);
            color: var(--uikit-text-primary);
          "
        >
          Provider 包裹的内容区域
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Built-in Toast">
      <UIKitProvider :auto-init="false">
        <div
          style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 16px;
            height: 200px;
            background: var(--uikit-bg-base);
            color: var(--uikit-text-primary);
          "
        >
          <button
            style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary); color: #fff; border: none; cursor: pointer;"
            @click="toast.show('内置 Toast 提示', 'success')"
          >
            触发内置 Toast
          </button>
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>
