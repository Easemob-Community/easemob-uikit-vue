<script setup lang="ts">
import { ref } from 'vue'
import type { CreateGroupParams } from '@easemob/uikit-core'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import CreateGroupModal from './create-group-modal.vue'

const show = ref(false)
const showSettings = ref(false)
const showTakeover = ref(false)
const logs = ref<string[]>([])

function injectMock() {
  useContactStore().setContactList([
    { userId: 'u_alice', name: 'Alice', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' },
    { userId: 'u_bob', name: 'Bob', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob' },
    { userId: 'u_carol', name: 'Carol', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carol' },
    { userId: 'u_david', name: 'David' },
  ])
}

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}

/** 模拟业务创建动作：先登记业务系统，再调 SDK */
async function mockCreate(params: CreateGroupParams) {
  log('mock-create', `${params.name} (${params.public ? 'public' : 'private'}, members: ${params.memberIds?.length ?? 0})`)
  return { groupId: `group_${Date.now()}` }
}
</script>

<template>
  <Story title="Modules/CreateGroupModal">
    <Variant title="默认">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          创建群组
        </button>
        <UIKitProvider :auto-init="false">
          <CreateGroupModal v-model:show="show" @vue:mounted="injectMock" @created="(id: string) => log('created', id)" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="预置配置（群名 + 描述）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          创建群组（预填）
        </button>
        <UIKitProvider :auto-init="false">
          <CreateGroupModal
            v-model:show="show"
            :config="{ name: '前端交流群', description: '前端技术讨论与分享' }"
            @vue:mounted="injectMock"
            @created="(id: string) => log('created', id)"
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
          创建群组
        </button>
        <UIKitProvider :auto-init="false">
          <CreateGroupModal v-model:show="show" @vue:mounted="injectMock" @created="(id: string) => log('created', id)" />
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

    <Variant title="群设置开关（showSettings）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showSettings = true"
        >
          创建群组（含群设置）
        </button>
        <UIKitProvider :auto-init="false">
          <CreateGroupModal
            v-model:show="showSettings"
            :config="{ showSettings: true, public: true }"
            @vue:mounted="injectMock"
            @created="(id: string) => log('created', id)"
          />
        </UIKitProvider>
        <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
          弹窗内显示公开群 / 入群审批 / 成员邀请 / 邀请确认开关与最大成员数，组合后随创建参数提交。
        </div>
      </div>
    </Variant>

    <Variant title="完全接管（#body/#footer + createFn）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showTakeover = true"
        >
          完全自定义创建
        </button>
        <UIKitProvider :auto-init="false">
          <CreateGroupModal
            v-model:show="showTakeover"
            :create-fn="mockCreate"
            @created="(id: string) => log('created', id)"
          >
            <template #body>
              <div style="padding: 24px; font-size: var(--uikit-font-size-13); color: #6b7280; line-height: 1.6;">
                弹窗主体由外层完全接管：成员选择、群信息、公开 / 私有等组合配置全部由业务方实现，
                例如展示业务侧的成员导入界面，最终通过 createFn 提交创建。
              </div>
            </template>
            <template #footer>
              <div style="display: flex; gap: 8px; justify-content: flex-end; padding: 12px 16px;">
                <button
                  style="padding: 6px 16px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer;"
                  @click="showTakeover = false"
                >
                  取消
                </button>
                <button
                  style="padding: 6px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
                  @click="mockCreate({ name: '业务创建的群', public: true, memberIds: ['u_alice'] })"
                >
                  业务侧创建
                </button>
              </div>
            </template>
          </CreateGroupModal>
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
