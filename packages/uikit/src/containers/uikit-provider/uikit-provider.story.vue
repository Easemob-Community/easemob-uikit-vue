<script setup lang="ts">
import UIKitProvider from './uikit-provider.vue'
import { useToast } from '../../composables/use-toast'

const toast = useToast()

const CustomToastDemo = {
  setup() {
    const { state, show } = useToast()
    return { state, show }
  },
  template: `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
      <button
        style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary); color: #fff; border: none; cursor: pointer;"
        @click="show('自定义提示内容', 'success')"
      >
        触发自定义 Toast
      </button>
      <div
        v-if="state.visible"
        style="padding: 12px 24px; background: #4caf50; color: #fff; border-radius: 8px;"
      >
        {{ state.message }}
      </div>
    </div>
  `,
}
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

    <Variant title="Enable Contact + Blocklist + Presence + Group">
      <UIKitProvider
        :auto-init="false"
        enable-contact
        enable-blocklist
        enable-presence
      >
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
          好友 / 黑名单 / 在线状态 / 群组 已启用
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Disable Group">
      <UIKitProvider
        :auto-init="false"
        :enable-group="false"
      >
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
          群组能力已关闭
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Contact FetchMode: all (全量拉取)">
      <UIKitProvider
        :auto-init="false"
        enable-contact
        contact-fetch-mode="all"
      >
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
          全量拉取模式（getAllContacts）
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Custom DataSource">
      <UIKitProvider
        :auto-init="false"
        enable-contact
        :data-source="{
          fetchContacts: async () => ({
            list: [
              { userId: 'u_ds1', name: '数据源用户1' },
              { userId: 'u_ds2', name: '数据源用户2' },
            ],
            hasMore: false,
          }),
        }"
      >
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
          自定义数据源模式
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

    <Variant title="Custom Toast via useToast (enableToast=false)">
      <UIKitProvider :auto-init="false" :enable-toast="false">
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
          <CustomToastDemo />
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>
