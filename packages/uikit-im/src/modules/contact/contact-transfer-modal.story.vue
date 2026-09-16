<script setup lang="ts">
import { ref } from 'vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import ContactTransferModal from './contact-transfer-modal.vue'

const show = ref(false)
const showPreselected = ref(false)
const logs = ref<string[]>([])

const avatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`

function injectMock() {
  useContactStore().setContactList([
    { userId: 'u_a01', name: 'Asername', avatar: avatar('Alice') },
    { userId: 'u_b01', name: 'Bsername', avatar: avatar('Bob') },
    { userId: 'u_c01', name: 'Csername', avatar: avatar('Carol') },
    { userId: 'u_d01', name: 'Dsername', avatar: avatar('David') },
    { userId: 'u_e01', name: 'Esername', avatar: avatar('Emma') },
    { userId: 'u_f01', name: 'Fsername', avatar: avatar('Frank') },
    { userId: 'u_k01', name: 'Ksername', avatar: avatar('Kate') },
    { userId: 'u_m01', name: 'Msername', avatar: avatar('Mike') },
    { userId: 'u_s01', name: 'Ssername', avatar: avatar('Sara') },
    { userId: 'u_z01', name: 'Username', avatar: avatar('Zoe') },
  ])
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Modules/ContactTransferModal">
    <Variant title="Shuttle（穿梭框）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 9999px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          打开穿梭框
        </button>
        <UIKitProvider :auto-init="false">
          <ContactTransferModal
            v-model:show="show"
            title="Shuttle"
            confirm-text="Action1"
            cancel-text="Action2"
            @vue:mounted="injectMock"
            @confirm="(ids: string[]) => { log('confirm', ids.join(',')); show = false }"
            @cancel="log('cancel')"
          />
        </UIKitProvider>
        <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
          事件：
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
              {{ logItem }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>

    <Variant title="预选 + 上限">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 9999px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showPreselected = true"
        >
          预选 Bsername（最多 3 人）
        </button>
        <UIKitProvider :auto-init="false">
          <ContactTransferModal
            v-model:show="showPreselected"
            :selected-ids="['u_b01']"
            :max-selected="3"
            @vue:mounted="injectMock"
            @confirm="(ids: string[]) => { log('confirm', ids.join(',')); showPreselected = false }"
            @max-exceed="(max: number) => log('max-exceed', String(max))"
          />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
