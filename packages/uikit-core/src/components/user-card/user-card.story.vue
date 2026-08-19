<script setup lang="ts">
import { ref } from 'vue'
import UserCard from './user-card.vue'
import type { UserCardAction, UserCardInfoRow } from './user-card.vue'

const logs = ref<string[]>([])

function log(event: string, key?: string) {
  logs.value.unshift(`${event}${key ? `: ${key}` : ''}`)
}

const actions: UserCardAction[] = [
  { key: 'message', label: '发消息', icon: 'bubble/rect/empty', type: 'primary' },
  // 语音通话当前未支持，故事书里先注释示例
  // { key: 'call', label: '语音通话', icon: 'phone' },
  { key: 'block', label: '拉黑', icon: 'xmark/bold', type: 'danger' },
]

const infoRows: UserCardInfoRow[] = [
  { key: 'sign', label: '个性签名', value: '你好，我是前端工程师' },
  { key: 'phone', label: '手机号', value: '138****8888', clickable: true },
  { key: 'mail', label: '邮箱', value: 'user@example.com' },
]
</script>

<template>
  <Story title="Components/UserCard">
    <Variant title="基础信息">
      <div style="width: 360px;">
        <UserCard
          user-id="user_001"
          name="张三"
          avatar="https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan"
          @action-click="(key: string) => log('action-click', key)"
          @info-click="(key: string) => log('info-click', key)"
        />
      </div>
    </Variant>

    <Variant title="在线状态">
      <div class="u-flex u-flex-col u-gap-4" style="width: 360px;">
        <UserCard
          user-id="user_002"
          name="李四"
          status="online"
          @action-click="(key: string) => log('action-click', key)"
        />
        <UserCard
          user-id="user_003"
          name="王五"
          status="busy"
          @action-click="(key: string) => log('action-click', key)"
        />
        <UserCard
          user-id="user_004"
          name="赵六"
          status="custom"
          @action-click="(key: string) => log('action-click', key)"
        />
      </div>
    </Variant>

    <Variant title="操作按钮与信息行">
      <div style="width: 360px;">
        <UserCard
          user-id="user_005"
          name="钱七"
          :actions="actions"
          :info-rows="infoRows"
          @action-click="(key: string) => log('action-click', key)"
          @info-click="(key: string) => log('info-click', key)"
        />
      </div>
    </Variant>

    <Variant title="可编辑在线状态">
      <div style="width: 360px;">
        <UserCard
          user-id="user_006"
          name="我自己"
          status="online"
          editable
          @action-click="(key: string) => log('action-click', key)"
          @presence-click="log('presence-click')"
          @presence-changed="log('presence-changed')"
        />
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="width: 360px;">
        <UserCard
          user-id="user_007"
          name="孙八"
          :actions="actions"
          @action-click="(key: string) => log('action-click', key)"
        />
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
  </Story>
</template>
