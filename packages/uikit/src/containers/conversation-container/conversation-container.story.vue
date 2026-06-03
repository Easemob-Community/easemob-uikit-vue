<script setup lang="ts">
import ConversationContainer from './conversation-container.vue'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'

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
  if (type === 'image') return '[图片消息]'
  if (type === 'voice') return '[语音消息]'
  return msg
}

function customFilterFn(keyword: string, item: any): boolean {
  return item.name?.toLowerCase().includes(keyword) || item.id?.toLowerCase().includes(keyword)
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
                <span style="font-size: 12px; color: #6b7280;">v1.0</span>
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
              <div style="padding: 8px 16px; background: #f0f9ff; font-size: 12px; color: #3b82f6;">
                系统通知区域（随列表滚动）
              </div>
            </template>
            <template #footer>
              <div style="padding: 8px 16px; background: #fef3c7; font-size: 12px; color: #d97706; text-align: center;">
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
              <div style="padding: 8px 16px; background: #f0f9ff; font-size: 12px; color: #3b82f6;">
                固定区域（不随列表滚动）
              </div>
            </template>
            <template #footer>
              <div style="padding: 8px 16px; background: #fef3c7; font-size: 12px; color: #d97706; text-align: center;">
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
                <div v-if="searchKeyword" style="color: #6b7280; font-size: 14px;">
                  未找到 "{{ searchKeyword }}" 相关会话
                </div>
                <div v-else style="color: #6b7280; font-size: 14px;">
                  还没有聊天记录，快去发消息吧~
                </div>
              </div>
            </template>
          </ConversationContainer>
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
