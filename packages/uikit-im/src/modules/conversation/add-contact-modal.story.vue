<script setup lang="ts">
import { ref } from 'vue'
import type { UiContact } from '@easemob/uikit-core'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import AddContactModal from './add-contact-modal.vue'

const show = ref(false)
const showCustom = ref(false)
const showTakeover = ref(false)
const logs = ref<string[]>([])

function log(event: string, payload?: string) {
  logs.value.unshift(`${event}${payload ? `: ${payload}` : ''}`)
}

// 模拟业务侧用户库：手机号 / 邮箱 / 昵称 → 环信 userId
const mockUserDb: Array<{ userId: string, name: string, phone: string, email: string }> = [
  { userId: 'zhangsan', name: '张三', phone: '13800138000', email: 'zhangsan@example.com' },
  { userId: 'lisi', name: '李四', phone: '13900139000', email: 'lisi@example.com' },
  { userId: 'wangwu', name: '王五', phone: '13700137000', email: 'wangwu@example.com' },
]

/** 模拟业务搜索接口：手机号 / 邮箱 / 昵称 / userId 均可命中 */
async function mockSearch(keyword: string): Promise<UiContact[]> {
  const kw = keyword.trim().toLowerCase()
  if (!kw)
    return []
  return mockUserDb
    .filter(u => [u.userId, u.name, u.phone, u.email].some(field => field.toLowerCase().includes(kw)))
    .map(u => ({ userId: u.userId, name: u.name }))
}

/** 模拟业务添加动作：先登记业务系统，再调 SDK */
async function mockAdd(userId: string, message?: string) {
  log('mock-add', `${userId}${message ? ` (${message})` : ''}`)
}
</script>

<template>
  <Story title="Modules/AddContactModal">
    <Variant title="默认">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          添加联系人
        </button>
        <UIKitProvider :auto-init="false">
          <AddContactModal v-model:show="show" @added="(id: string) => log('added', id)" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="事件日志">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="show = true"
        >
          添加联系人
        </button>
        <UIKitProvider :auto-init="false">
          <AddContactModal v-model:show="show" @added="(id: string) => log('added', id)" />
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

    <Variant title="自定义搜索接管（searchFn）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showCustom = true"
        >
          按手机号 / 邮箱添加
        </button>
        <UIKitProvider :auto-init="false">
          <AddContactModal
            v-model:show="showCustom"
            :search-fn="mockSearch"
            @search="(kw: string) => log('search', kw)"
            @added="(id: string) => log('added', id)"
          />
        </UIKitProvider>
        <div style="margin-top: 12px; font-size: var(--uikit-font-size-12); color: #6b7280;">
          业务侧通过 searchFn 接管“手机号 / 邮箱 → 环信 userId”解析，选择结果后自动填充用户 ID。
          <ul style="margin: 4px 0; padding-left: 16px;">
            <li v-for="(logItem, i) in logs.slice(0, 5)" :key="i">
              {{ logItem }}
            </li>
          </ul>
        </div>
      </div>
    </Variant>

    <Variant title="完全接管（#body/#footer + addFn）">
      <div style="padding: 32px;">
        <button
          style="padding: 8px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
          @click="showTakeover = true"
        >
          完全自定义添加
        </button>
        <UIKitProvider :auto-init="false">
          <AddContactModal
            v-model:show="showTakeover"
            :add-fn="mockAdd"
            @added="(id: string) => log('added', id)"
          >
            <template #body>
              <div style="padding: 8px 0; font-size: var(--uikit-font-size-13); color: #6b7280; line-height: 1.6;">
                弹窗主体由外层完全接管：这里的搜索 / 输入表单全部由业务方实现，
                例如展示手机号输入框，通过自有接口解析为环信 userId 后再调用添加能力。
              </div>
            </template>
            <template #footer>
              <div style="display: flex; gap: 8px; justify-content: flex-end;">
                <button
                  style="padding: 6px 16px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; cursor: pointer;"
                  @click="showTakeover = false"
                >
                  取消
                </button>
                <button
                  style="padding: 6px 16px; border-radius: 8px; background: var(--uikit-primary-color); color: #fff; border: none; cursor: pointer;"
                  @click="mockAdd('custom-user', 'from takeover')"
                >
                  业务侧添加
                </button>
              </div>
            </template>
          </AddContactModal>
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
