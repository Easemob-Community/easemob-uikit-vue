<script setup lang="ts">
import UIKitProvider from './uikit-provider.vue'
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

    <Variant title="Dark Mode">
      <UIKitProvider :auto-init="false" :theme="{ mode: 'dark' }">
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
          Dark Mode 内容区域
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="English Locale">
      <UIKitProvider :auto-init="false" locale="en">
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
          English locale content area
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>
