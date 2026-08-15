<script setup lang="ts">
import { CONVERSATION_TYPE, MESSAGE_TYPE } from '../../constants'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
import { useConversationStore } from '../../store/conversation'
import { usePresenceStore } from '../../store/presence'
import type { UiConversation, UiPresence } from '../../sdk/types'
import ConversationContainer from './conversation-container.vue'

const customActions = [
  {
    key: 'mute',
    label: '静音',
    icon: 'audio-video/speaker_xmark',
    handler: (cvs: any) => {
      // eslint-disable-next-line no-console
      console.log('mute conversation', cvs.id)
    },
  },
]

function customTimeFormatter(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function customMessageFormatter(msg: string, type?: string): string {
  if (type === MESSAGE_TYPE.IMAGE)
    return '[图片消息]'
  if (type === MESSAGE_TYPE.VOICE)
    return '[语音消息]'
  return msg
}

function customFilterFn(keyword: string, item: any): boolean {
  return item.name?.toLowerCase().includes(keyword) || item.id?.toLowerCase().includes(keyword)
}

/** 注入 mock 会话数据 */
function injectMockConversations() {
  const store = useConversationStore()
  const now = Date.now()
  const list: UiConversation[] = [
    {
      id: 'u_alice',
      name: 'Alice',
      type: CONVERSATION_TYPE.SINGLECHAT,
      unreadCount: 2,
      lastMessageText: '晚上一起吃饭吗？',
      lastMessageTime: now - 5 * 60 * 1000,
      isPinned: true,
      isMuted: false,
      marks: [],
    },
    {
      id: 'u_bob',
      name: 'Bob',
      type: CONVERSATION_TYPE.SINGLECHAT,
      unreadCount: 0,
      lastMessageText: '文件已发送',
      lastMessageTime: now - 30 * 60 * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
    {
      id: 'u_carol',
      name: 'Carol',
      type: CONVERSATION_TYPE.SINGLECHAT,
      unreadCount: 1,
      lastMessageText: '收到，谢谢！',
      lastMessageTime: now - 2 * 60 * 60 * 1000,
      isPinned: false,
      isMuted: true,
      marks: [],
    },
    {
      id: 'g_team',
      name: '产品技术群',
      type: CONVERSATION_TYPE.GROUPCHAT,
      unreadCount: 5,
      lastMessageText: 'Tom: 版本已发',
      lastMessageTime: now - 10 * 60 * 1000,
      isPinned: false,
      isMuted: false,
      marks: [],
    },
  ]
  store.setConversationList(list)
}

/** 注入 mock 在线状态 */
function injectMockConversationPresence() {
  const store = usePresenceStore()
  const list: UiPresence[] = [
    { userId: 'u_alice', status: 'online', ext: '', lastTime: Date.now() },
    { userId: 'u_bob', status: 'busy', ext: 'busy', lastTime: Date.now() },
    { userId: 'u_carol', status: 'away', ext: 'away', lastTime: Date.now() },
  ]
  store.updateBatch(list)
}

const mockDataSource = {
  subscribePresence: async () => {
    // Storybook 未连接 SDK，用空实现避免报错
  },
}
</script>

<template>
  <Story title="ConversationContainer">
    <Variant title="Default">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Search">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :show-search="false" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Actions">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :custom-actions="customActions" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Header">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :show-header="false" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Header">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer>
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-weight: 600;">自定义标题</span>
                <span style="font-size: var(--uikit-font-size-12); color: #6b7280;">v1.0</span>
              </div>
            </template>
          </ConversationContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Center Title">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer title="消息" header-align="center" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Title Prop">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer title="消息" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Time Formatter">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :time-formatter="customTimeFormatter" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Message Formatter">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :message-formatter="customMessageFormatter" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Search Filter">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :filter-fn="customFilterFn" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Dot Unread Mode">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer unread-mode="dot" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Sender Name">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :show-sender-name="false" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Empty Text">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer empty-text="还没有聊天记录哦~" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Body & Footer Slots">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer>
            <template #body>
              <div style="padding: 8px 16px; background: #f0f9ff; font-size: var(--uikit-font-size-12); color: #3b82f6;">
                系统通知区域（随列表滚动）
              </div>
            </template>
            <template #footer>
              <div style="padding: 8px 16px; background: #fef3c7; font-size: var(--uikit-font-size-12); color: #d97706; text-align: center;">
                底部操作区（随列表滚动）
              </div>
            </template>
          </ConversationContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Sticky Body & Footer">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer body-sticky footer-sticky>
            <template #body>
              <div style="padding: 8px 16px; background: #f0f9ff; font-size: var(--uikit-font-size-12); color: #3b82f6;">
                固定区域（不随列表滚动）
              </div>
            </template>
            <template #footer>
              <div style="padding: 8px 16px; background: #fef3c7; font-size: var(--uikit-font-size-12); color: #d97706; text-align: center;">
                固定底部（不随列表滚动）
              </div>
            </template>
          </ConversationContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide ScrollToTop">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer :show-scroll-to-top="false" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Draft Storage (Session)">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer draft-storage="session" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Draft Storage (Local)">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer draft-storage="local" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Empty Slot">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false">
          <ConversationContainer>
            <template #empty="{ searchKeyword }">
              <div style="text-align: center; padding: 40px 16px;">
                <div style="font-size: 24px; margin-bottom: 8px;">📭</div>
                <div v-if="searchKeyword" style="color: #6b7280; font-size: var(--uikit-font-size-14);">
                  未找到 "{{ searchKeyword }}" 相关会话
                </div>
                <div v-else style="color: #6b7280; font-size: var(--uikit-font-size-14);">
                  还没有聊天记录，快去发消息吧~
                </div>
              </div>
            </template>
          </ConversationContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Presence Enabled (mocked SDK)">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false" :data-source="mockDataSource">
          <ConversationContainer
            enable-presence
            @vue:mounted="() => { injectMockConversations(); injectMockConversationPresence() }"
          />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        单聊头像右下角展示在线状态；通过容器 enable-presence prop 控制，可覆盖 Provider 全局配置。
      </div>
    </Variant>

    <Variant title="Presence Disabled (enablePresence=false)">
      <div style="height: 500px;">
        <UIKitProvider :auto-init="false" :enable-presence="true" :data-source="mockDataSource">
          <ConversationContainer
            :enable-presence="false"
            @vue:mounted="() => { injectMockConversations(); injectMockConversationPresence() }"
          />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        Provider 全局开启 Presence，但当前容器通过 :enable-presence="false" 独立关闭。
      </div>
    </Variant>
  </Story>
</template>
