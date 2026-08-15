<script setup lang="ts">
import GroupItem from './group-item.vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'

const vue = { groupId: 'g_001', groupName: 'Vue 技术交流', owner: 'me', memberCount: 128 }
const react = { groupId: 'g_002', groupName: 'React 开发者', owner: 'me', memberCount: 64 }
const game = { groupId: 'g_003', groupName: '周末桌游局', owner: 'me', memberCount: 12 }
</script>

<template>
  <Story title="Modules/GroupItem">
    <Variant title="Default">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <GroupItem :group="vue" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="With Subtitle">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <GroupItem :group="vue" subtitle="最近一条：今晚8点直播" />
          <GroupItem :group="react" subtitle="3 条未读" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Size: compact / normal / large">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px; display: flex; flex-direction: column; gap: 4px;">
          <GroupItem :group="vue" size="compact" />
          <GroupItem :group="react" size="normal" />
          <GroupItem :group="game" size="large" subtitle="今晚 8 点开局" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Avatar Shape: circle / rounded / square">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px; display: flex; flex-direction: column; gap: 4px;">
          <GroupItem :group="vue" avatar-shape="circle" />
          <GroupItem :group="react" avatar-shape="rounded" />
          <GroupItem :group="game" avatar-shape="square" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Hide MemberCount / Hide Avatar">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <GroupItem :group="vue" :show-member-count="false" />
          <GroupItem :group="react" :show-avatar="false" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Disabled">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <GroupItem :group="vue" disabled />
          <GroupItem :group="react" disabled select-mode="multiple" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="SelectMode: single / multiple">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <GroupItem :group="vue" select-mode="single" />
          <GroupItem :group="react" select-mode="multiple" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="#avatar Slot 自定义">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <GroupItem :group="vue">
            <template #avatar>
              <div
                style="width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; background: linear-gradient(135deg, #34d399, #60a5fa);"
              >
                V
              </div>
            </template>
          </GroupItem>
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="#extra Slot 操作按钮">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <GroupItem :group="vue" subtitle="未读 3 条">
            <template #extra>
              <span
                style="font-size: var(--uikit-font-size-11); color: #fff; background: #ef4444; padding: 2px 6px; border-radius: 9px;"
              >3</span>
            </template>
          </GroupItem>
          <GroupItem :group="react" subtitle="点击进入">
            <template #extra>
              <button
                style="font-size: var(--uikit-font-size-12); padding: 4px 10px; border: 1px solid #3b82f6; color: #3b82f6; border-radius: 4px; background: transparent; cursor: pointer;"
                @click.stop="() => console.log('join')"
              >
                加入
              </button>
            </template>
          </GroupItem>
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>
