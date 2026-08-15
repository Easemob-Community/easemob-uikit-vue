<script setup lang="ts">
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import type { UiContact as Contact } from '../../sdk/types'
import type { ContactSubtitleFn } from '../../modules/contact/types'
import ContactListContainer from './contact-list-container.vue'

/** 构造 mock 联系人数据，覆盖多字母分组与 # 兜底 */
function injectMockContacts() {
  const contactStore = useContactStore()
  const list: Contact[] = [
    { userId: 'u_alice', name: 'Alice' },
    { userId: 'u_amy', name: 'Amy' },
    { userId: 'u_alex', name: 'Alex', remark: 'Alex（实习）' },
    { userId: 'u_bob', name: 'Bob' },
    { userId: 'u_carol', name: 'Carol' },
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

const subtitleFn: ContactSubtitleFn = c => `ID: ${c.userId}`
</script>

<template>
  <Story title="ContactListContainer">
    <Variant title="默认">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactListContainer
            title="通讯录"
            @vue:mounted="injectMockContacts"
            @click="(c: Contact) => console.log('click:', c.userId)"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="副标题">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactListContainer
            title="通讯录"
            :subtitle-fn="subtitleFn"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="选择模式">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactListContainer
            title="选择联系人"
            select-mode="multiple"
            :max-selected="3"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="紧凑模式">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactListContainer
            title="紧凑列表"
            item-size="compact"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="隐藏头部与搜索">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactListContainer
            :show-header="false"
            :show-search="false"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="空列表">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactListContainer
            title="通讯录"
            empty-text="暂无联系人，快去添加好友吧"
            :auto-fetch="false"
          />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
