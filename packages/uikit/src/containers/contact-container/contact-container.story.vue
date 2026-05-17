<script setup lang="ts">
import ContactContainer from './contact-container.vue'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import type { Contact } from '../../store/contact'

/** 构造 mock 联系人数据，覆盖多字母分组与 # 兜底 */
function injectMockContacts() {
  const contactStore = useContactStore()
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
    { userId: 'u_nancy', name: 'Nancy' },
    { userId: 'u_oliver', name: 'Oliver' },
    { userId: 'u_peter', name: 'Peter' },
    { userId: 'u_queen', name: 'Queen' },
    { userId: 'u_robert', name: 'Robert' },
    { userId: 'u_sam', name: 'Sam' },
    { userId: 'u_tom', name: 'Tom' },
    // 中文/数字 → '#' 兜底
    { userId: 'u_zhang', name: '张三' },
    { userId: 'u_li', name: '李四' },
    { userId: 'u_001', name: '001号客服' },
  ]
  contactStore.setContactList(list)
}

/** 自定义筛选：只匹配 userId 不匹配 name */
function customFilterFn(keyword: string, c: Contact): boolean {
  return c.userId.toLowerCase().includes(keyword)
}

/** 自定义分组：按首字母元音/辅音分两组 */
function vowelGrouper(c: Contact): string {
  const first = (c.remark || c.name || '').charAt(0).toUpperCase()
  return /^[AEIOU]$/.test(first) ? '元音' : '辅音及其他'
}
</script>

<template>
  <Story title="ContactContainer">
    <Variant title="Default">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Search">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :show-search="false" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Header">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :show-header="false" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Title">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer title="通讯录" header-align="center" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Header">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer @vue:mounted="injectMockContacts">
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span style="font-weight: 600;">我的好友</span>
                <span style="font-size: 12px; color: #6b7280;">26 人</span>
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="No Group (Flat List)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer group-by="none" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom GroupBy (Vowel)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :group-by="vowelGrouper"
            :show-alphabet-nav="false"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Group Header">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :show-group-header="false" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Alphabet Nav">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :show-alphabet-nav="false" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Single Select Mode">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            select-mode="single"
            @contact-select="(c) => console.log('selected:', c.userId)"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Multiple Select Mode">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer select-mode="multiple" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Filter (userId only)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :filter-fn="customFilterFn" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Empty Text">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer empty-text="还没有添加联系人哦~" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Empty Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer>
            <template #empty="{ searchKeyword }">
              <div style="text-align: center; padding: 60px 16px;">
                <div style="font-size: 32px; margin-bottom: 8px;">📒</div>
                <div v-if="searchKeyword" style="color: #6b7280; font-size: 14px;">
                  未搜到 "{{ searchKeyword }}"
                </div>
                <div v-else style="color: #6b7280; font-size: 14px;">
                  通讯录还是空的，先去添加一个吧
                </div>
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Item Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer @vue:mounted="injectMockContacts">
            <template #item="{ contact, active }">
              <div
                style="display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer;"
                :style="{ background: active ? '#e6f0ff' : 'transparent' }"
              >
                <div
                  style="width: 32px; height: 32px; border-radius: 8px; background: linear-gradient(135deg, #60a5fa, #a78bfa); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;"
                >
                  {{ (contact.remark || contact.name).slice(0, 1) }}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 14px; color: #111827;">
                    {{ contact.remark || contact.name }}
                  </div>
                  <div style="font-size: 12px; color: #9ca3af;">{{ contact.userId }}</div>
                </div>
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Group Header Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer @vue:mounted="injectMockContacts">
            <template #group-header="{ group }">
              <div
                style="padding: 6px 16px; background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 600;"
              >
                ▸ {{ group.title }}（{{ group.items.length }}）
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Body & Footer Slots">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer @vue:mounted="injectMockContacts">
            <template #body>
              <div style="padding: 8px 16px; background: #f0f9ff; font-size: 12px; color: #3b82f6;">
                新的朋友 · 群聊 · 标签
              </div>
            </template>
            <template #footer>
              <div style="padding: 8px 16px; text-align: center; font-size: 12px; color: #9ca3af;">
                共 26 位联系人
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Sticky Body & Footer">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer body-sticky footer-sticky @vue:mounted="injectMockContacts">
            <template #body>
              <div style="padding: 8px 16px; background: #f0f9ff; font-size: 12px; color: #3b82f6;">
                固定快捷入口
              </div>
            </template>
            <template #footer>
              <div style="padding: 8px 16px; text-align: center; font-size: 12px; color: #9ca3af;">
                固定底部统计
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide ScrollToTop">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :show-scroll-to-top="false" @vue:mounted="injectMockContacts" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Empty State">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
