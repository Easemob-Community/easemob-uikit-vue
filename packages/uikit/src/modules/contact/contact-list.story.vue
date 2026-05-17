<script setup lang="ts">
import { ref } from 'vue'
import ContactList from './contact-list.vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import type { Contact } from '../../store/contact'

/** 注入 mock 联系人数据，覆盖多字母分组 + # 兜底 */
function injectMockContacts() {
  const store = useContactStore()
  const list: Contact[] = [
    { userId: 'u_alice', name: 'Alice' },
    { userId: 'u_amy', name: 'Amy' },
    { userId: 'u_alex', name: 'Alex', remark: 'Alex（实习）' },
    { userId: 'u_bob', name: 'Bob' },
    { userId: 'u_carol', name: 'Carol' },
    { userId: 'u_chris', name: 'Chris' },
    { userId: 'u_david', name: 'David' },
    { userId: 'u_emma', name: 'Emma' },
    { userId: 'u_frank', name: 'Frank' },
    { userId: 'u_grace', name: 'Grace' },
    { userId: 'u_henry', name: 'Henry' },
    { userId: 'u_ivy', name: 'Ivy' },
    { userId: 'u_jack', name: 'Jack' },
    { userId: 'u_kate', name: 'Kate' },
    { userId: 'u_leo', name: 'Leo' },
    { userId: 'u_mike', name: 'Mike' },
    { userId: 'u_zhang', name: '张三' },
    { userId: 'u_li', name: '李四' },
    { userId: 'u_001', name: '001号客服' },
  ]
  store.setContactList(list)
}

/** 中文姓名 mock，演示拼音排序 */
function injectChineseContacts() {
  const store = useContactStore()
  store.setContactList([
    { userId: 'u_zh', name: '张伟' },
    { userId: 'u_li', name: '李娜' },
    { userId: 'u_wang', name: '王芳' },
    { userId: 'u_chen', name: '陈刚' },
    { userId: 'u_yang', name: '杨光' },
    { userId: 'u_zhao', name: '赵磊' },
    { userId: 'u_liu', name: '刘洋' },
    { userId: 'u_huang', name: '黄飞' },
  ])
}

/** disabled 函数：禁用客服与 # 类账号 */
function disabledFn(c: Contact): boolean {
  return c.userId.startsWith('u_001') || c.userId === 'u_zhang'
}

/** 副标题函数：以 userId 作为副标题展示 */
function subtitleFn(c: Contact): string | undefined {
  return `ID: ${c.userId}`
}

/** 在线状态映射函数（mock：按 userId 哈希） */
function onlineStatusFn(c: Contact): 'online' | 'offline' | 'away' | 'busy' {
  const map: Record<number, 'online' | 'offline' | 'away' | 'busy'> = {
    0: 'online',
    1: 'away',
    2: 'busy',
    3: 'offline',
  }
  let h = 0
  for (let i = 0; i < c.userId.length; i++) h = (h + c.userId.charCodeAt(i)) % 4
  return map[h]!
}

// ========== 受控选中 + maxSelected 演示 ==========
const controlledIds = ref<string[]>(['u_alice', 'u_bob'])
function onMaxExceed(max: number) {
  console.warn('[contact-list] max exceeded:', max)
}

// ========== loadMore 演示 ==========
const loadingMore = ref(false)
function onLoadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  console.log('[contact-list] load-more triggered')
  setTimeout(() => {
    loadingMore.value = false
  }, 800)
}
</script>

<template>
  <Story title="Modules/ContactList">
    <Variant title="Default">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Show Count Badge">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList show-count @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="SortBy: Pinyin (中文按拼音排序)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList sort-by="pinyin" @vue:mounted="injectChineseContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="ItemSize: Compact (40px)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList item-size="compact" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="ItemSize: Large (72px) + Subtitle">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList
            item-size="large"
            :subtitle-fn="subtitleFn"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Avatar: Rounded Shape">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList avatar-shape="rounded" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Avatar: Square Shape + Custom Size">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList
            avatar-shape="square"
            :avatar-size="48"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Avatar">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList :show-avatar="false" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="OnlineStatus Indicator">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList :online-status-fn="onlineStatusFn" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Disabled by Function">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList
            select-mode="multiple"
            :disabled-fn="disabledFn"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Controlled selectedIds + maxSelected=3">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList
            select-mode="multiple"
            :selected-ids="controlledIds"
            :max-selected="3"
            @update:selected-ids="(ids) => (controlledIds = ids)"
            @max-exceed="onMaxExceed"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
          已选: {{ controlledIds.join(', ') || '空' }}（最多 3 个）
        </div>
      </div>
    </Variant>

    <Variant title="Loading State">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList loading @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="LoadMore on Scroll">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList
            enable-load-more
            :loading="loadingMore"
            @load-more="onLoadMore"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom #item Slot (完全接管渲染)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList @vue:mounted="injectMockContacts">
            <template #item="{ contact, active }">
              <div
                style="display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer;"
                :style="{ background: active ? '#e6f0ff' : 'transparent' }"
              >
                <div
                  style="width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; background: linear-gradient(135deg, #f97316, #ec4899);"
                >
                  {{ (contact.remark || contact.name).slice(0, 1) }}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 14px; color: #111827;">
                    {{ contact.remark || contact.name }}
                  </div>
                  <div style="font-size: 12px; color: #9ca3af;">{{ contact.userId }}</div>
                </div>
                <button
                  style="font-size: 12px; padding: 4px 10px; border: 1px solid #3b82f6; color: #3b82f6; border-radius: 4px; background: transparent; cursor: pointer;"
                  @click.stop="() => console.log('add friend:', contact.userId)"
                >
                  添加
                </button>
              </div>
            </template>
          </ContactList>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="HasMore=false (无更多数据)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList :has-more="false" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom noMoreText">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList
            :has-more="false"
            no-more-text="—— 已经到底了 ——"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Body Sticky + Footer Sticky">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList
            body-sticky
            footer-sticky
            @vue:mounted="injectMockContacts"
          >
            <template #body>
              <div style="padding: 8px 0; font-size: 12px; color: #3b82f6;">
                置顶提示：sticky body 插槽
              </div>
            </template>
            <template #footer>
              <div style="padding: 8px 0; font-size: 12px; color: #ef4444;">
                底部操作：sticky footer 插槽
              </div>
            </template>
          </ContactList>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom #group-header Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactList @vue:mounted="injectMockContacts">
            <template #group-header="{ group }">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #3b82f6;" />
                <span style="font-weight: 600;">{{ group.title }}</span>
                <span style="font-size: 11px; color: #9ca3af;">({{ group.items.length }})</span>
              </div>
            </template>
          </ContactList>
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
