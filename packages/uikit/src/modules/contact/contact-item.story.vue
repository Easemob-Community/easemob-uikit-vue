<script setup lang="ts">
import ContactItem from './contact-item.vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'

const alice = { userId: 'u_alice', name: 'Alice' }
const bob = { userId: 'u_bob', name: 'Bob', remark: 'Bob（同事）' }
const zhang = { userId: 'u_zhang', name: '张三' }
</script>

<template>
  <Story title="Modules/ContactItem">
    <Variant title="Default">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <ContactItem :contact="alice" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="With Subtitle (双行)">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <ContactItem :contact="alice" subtitle="ID: u_alice" />
          <ContactItem :contact="bob" subtitle="刚刚加入团队" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Size: compact / normal / large">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px; display: flex; flex-direction: column; gap: 4px;">
          <ContactItem :contact="alice" size="compact" />
          <ContactItem :contact="bob" size="normal" />
          <ContactItem :contact="zhang" size="large" subtitle="客户经理" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Avatar Shape: circle / rounded / square">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px; display: flex; flex-direction: column; gap: 4px;">
          <ContactItem :contact="alice" avatar-shape="circle" />
          <ContactItem :contact="bob" avatar-shape="rounded" />
          <ContactItem :contact="zhang" avatar-shape="square" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Custom Avatar Size">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px; display: flex; flex-direction: column; gap: 4px;">
          <ContactItem :contact="alice" :avatar-size="32" />
          <ContactItem :contact="bob" :avatar-size="48" />
          <ContactItem :contact="zhang" :avatar-size="64" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Hide Avatar">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <ContactItem :contact="alice" :show-avatar="false" />
          <ContactItem :contact="bob" :show-avatar="false" subtitle="纯文本场景" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="OnlineStatus: online / away / busy / offline">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px; display: flex; flex-direction: column; gap: 4px;">
          <ContactItem :contact="alice" online-status="online" subtitle="在线" />
          <ContactItem :contact="bob" online-status="away" subtitle="离开" />
          <ContactItem :contact="zhang" online-status="busy" subtitle="忙碌" />
          <ContactItem :contact="{ userId: 'u_off', name: 'Offline' }" online-status="offline" subtitle="离线" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="Disabled">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <ContactItem :contact="alice" disabled />
          <ContactItem :contact="bob" disabled select-mode="multiple" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="SelectMode: single / multiple">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <ContactItem :contact="alice" select-mode="single" />
          <ContactItem :contact="bob" select-mode="multiple" />
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="#avatar Slot 自定义">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <ContactItem :contact="alice">
            <template #avatar>
              <div
                style="width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; background: linear-gradient(135deg, #f97316, #ec4899);"
              >
                A
              </div>
            </template>
          </ContactItem>
        </div>
      </UIKitProvider>
    </Variant>

    <Variant title="#extra Slot 操作按钮">
      <UIKitProvider :auto-init="false">
        <div style="width: 320px;">
          <ContactItem :contact="alice" subtitle="尚未添加为好友">
            <template #extra>
              <button
                style="font-size: 12px; padding: 4px 10px; border: 1px solid #3b82f6; color: #3b82f6; border-radius: 4px; background: transparent; cursor: pointer;"
                @click.stop="() => console.log('add')"
              >
                添加
              </button>
            </template>
          </ContactItem>
          <ContactItem :contact="bob" subtitle="待审批">
            <template #extra>
              <span style="font-size: 12px; color: #f59e0b;">待审批</span>
            </template>
          </ContactItem>
        </div>
      </UIKitProvider>
    </Variant>
  </Story>
</template>
