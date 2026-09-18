<script setup lang="ts">
import { ref } from 'vue'
import { useUserInfoStore } from '@easemob/uikit-core'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import UserCardModal from './user-card-modal.vue'

const show = ref(false)
const showWithData = ref(false)
const showContactWithRemark = ref(false)
const showContactNoRemark = ref(false)
const showStranger = ref(false)
const showAnchored = ref(false)
const anchorBtnRef = ref<HTMLElement>()
const logs = ref<string[]>([])

function injectMockUserInfo() {
  const store = useUserInfoStore()
  store.setUserInfo({
    userId: 'u_alice',
    nickname: 'Alice',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    sign: '热爱生活，热爱代码',
  })
}

/** 档1：好友 + 有备注 */
function injectContactWithRemark() {
  useUserInfoStore().setUserInfo({
    userId: 'u_bob',
    nickname: 'Flammaura',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Flammaura',
  })
  useContactStore().addContact({
    userId: 'u_bob',
    name: '人间野草莓',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Flammaura',
    remark: '人间野草莓',
  })
}

/** 档2：好友 + 无备注 */
function injectContactNoRemark() {
  useUserInfoStore().setUserInfo({
    userId: 'u_carol',
    nickname: 'Flammaura',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Flammaura',
  })
  useContactStore().addContact({
    userId: 'u_carol',
    name: 'Flammaura',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Flammaura',
  })
}

/** 档3：陌生人（仅有用户资料，非好友） */
function injectStranger() {
  useUserInfoStore().setUserInfo({
    userId: 'u_stranger',
    nickname: 'Flammaura',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Flammaura',
  })
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}
</script>

<template>
  <Story title="Components/UserCardModal">
    <Variant title="档1：好友（有备注）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showContactWithRemark = true"
        >
          打开名片（好友·有备注）
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="showContactWithRemark"
            user-id="u_bob"
            @vue:mounted="injectContactWithRemark"
            @send-message="(id: string) => log('send-message', id)"
            @deleted="(id: string) => log('deleted', id)"
            @block-changed="(id: string, blocked: boolean) => log('block-changed', `${id} ${blocked}`)"
            @remark-changed="(id: string, remark: string) => log('remark-changed', `${id} ${remark}`)"
            @close="log('close')"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="档2：好友（无备注 + 语音/视频入口）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showContactNoRemark = true"
        >
          打开名片（好友·无备注）
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="showContactNoRemark"
            user-id="u_carol"
            enable-audio-action
            enable-video-action
            @vue:mounted="injectContactNoRemark"
            @send-message="(id: string) => log('send-message', id)"
            @audio-call="(id: string) => log('audio-call', id)"
            @video-call="(id: string) => log('video-call', id)"
            @deleted="(id: string) => log('deleted', id)"
            @block-changed="(id: string, blocked: boolean) => log('block-changed', `${id} ${blocked}`)"
            @remark-changed="(id: string, remark: string) => log('remark-changed', `${id} ${remark}`)"
            @close="log('close')"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="档3：陌生人">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showStranger = true"
        >
          打开名片（陌生人）
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="showStranger"
            user-id="u_stranger"
            @vue:mounted="injectStranger"
            @contact-added="(id: string) => log('contact-added', id)"
            @block-changed="(id: string, blocked: boolean) => log('block-changed', `${id} ${blocked}`)"
            @close="log('close')"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="锚定弹出（无遮罩，相对触发元素）">
      <div style="padding: 32px;">
        <button
          ref="anchorBtnRef"
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showAnchored = true"
        >
          相对此按钮弹出名片
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="showAnchored"
            user-id="u_bob"
            :anchor="anchorBtnRef"
            @vue:mounted="injectContactWithRemark"
            @send-message="(id: string) => log('send-message', id)"
            @deleted="(id: string) => log('deleted', id)"
            @block-changed="(id: string, blocked: boolean) => log('block-changed', `${id} ${blocked}`)"
            @remark-changed="(id: string, remark: string) => log('remark-changed', `${id} ${remark}`)"
            @close="log('close')"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="默认（无用户数据）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          打开用户名片
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="show"
            user-id="u_unknown"
            @send-message="(id: string) => log('send-message', id)"
            @close="log('close')"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="已注入用户数据">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showWithData = true"
        >
          打开用户名片（Alice）
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="showWithData"
            user-id="u_alice"
            @vue:mounted="injectMockUserInfo"
            @send-message="(id: string) => log('send-message', id)"
            @close="log('close')"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          打开用户名片
        </button>
        <UIKitProvider :auto-init="false">
          <UserCardModal
            v-model:show="show"
            user-id="u_unknown"
            @send-message="(id: string) => log('send-message', id)"
            @close="log('close')"
          />
        </UIKitProvider>
        <div style="margin-top: 12px; font-size: var(--uikit-font-size-11); color: #6b7280;">
          事件：
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
              {{ logItem }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>
  </Story>
</template>
