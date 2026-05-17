<script setup lang="ts">
import ContactContainer from './contact-container.vue'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
import { ref } from 'vue'
import { useContactStore } from '../../store/contact'
import { useGroupStore } from '../../store/group'
import type { Contact } from '../../store/contact'
import type { Group } from '../../store/group'

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

/** 构造 mock 群组数据 */
function injectMockGroups() {
  const groupStore = useGroupStore()
  const list: Group[] = [
    { groupId: 'g_001', groupName: 'Vue 技术交流', owner: 'me', memberCount: 128 },
    { groupId: 'g_002', groupName: 'React 开发者', owner: 'me', memberCount: 64 },
    { groupId: 'g_003', groupName: '周末桌游局', owner: 'me', memberCount: 12 },
    { groupId: 'g_004', groupName: 'Animation Lovers', owner: 'me', memberCount: 8 },
    { groupId: 'g_005', groupName: '产品设计研讨', owner: 'me', memberCount: 36 },
    { groupId: 'g_006', groupName: 'Bug Hunters', owner: 'me', memberCount: 20 },
    { groupId: 'g_007', groupName: '环信内部', owner: 'me', memberCount: 256 },
    { groupId: 'g_008', groupName: '警警闲聊', owner: 'me', memberCount: 5 },
    { groupId: 'g_009', groupName: 'Indie Game Dev', owner: 'me', memberCount: 17 },
    { groupId: 'g_010', groupName: '广告交流', owner: 'me', memberCount: 3 },
    { groupId: 'g_011', groupName: 'AI 前沿', owner: 'me', memberCount: 44 },
  ]
  groupStore.setGroupList(list)
}

function injectMock() {
  injectMockContacts()
  injectMockGroups()
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

/** 自定义群组排序：按群 ID 升序 */
function customGroupComparator(a: Group, b: Group): number {
  return a.groupId.localeCompare(b.groupId)
}

/** 受控 selectedIds 演示 */
const contactSelectedIds = ref<string[]>(['u_alice'])
const groupSelectedIds = ref<string[]>(['g_001'])

/** Contact subtitle 函数 */
function contactSubtitleFn(c: Contact): string | undefined {
  return `ID: ${c.userId}`
}

/** Group subtitle 函数 */
function groupSubtitleFn(g: Group): string | undefined {
  return `${g.memberCount ?? 0} 人`
}
</script>

<template>
  <Story title="ContactContainer">
    <Variant title="Default Aggregate Home">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :new-request-count="3"
            @vue:mounted="injectMock"
            @new-request-click="() => console.log('new-request-click')"
            @view-change="(v) => console.log('view-change:', v)"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide NewRequest">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :show-new-request="false" @vue:mounted="injectMock" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Group (Flat Contact)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Contact (Flat Group)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group SortBy: Pinyin">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            group-sort-by="pinyin"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group SortBy: MemberCount">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            group-sort-by="memberCount"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group SortBy: Custom">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            :group-sort-by="customGroupComparator"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group GroupBy: Alphabet">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            group-sort-by="pinyin"
            group-group-by="alphabet"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Nav Entry Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :new-request-count="5" @vue:mounted="injectMock">
            <template #nav-entry="{ entry }">
              <div
                style="display: flex; align-items: center; justify-content: space-between; width: 100%;"
              >
                <span style="display: inline-flex; gap: 8px; align-items: center;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: #3b82f6;" />
                  <span style="font-weight: 600;">{{ entry.label }}</span>
                </span>
                <span v-if="entry.count" style="color: #ef4444; font-weight: 700;">
                  {{ entry.count }}
                </span>
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Back Icon">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer initial-view="group" @vue:mounted="injectMock">
            <template #back-icon>
              <span style="font-size: 18px; color: #3b82f6;">←</span>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Header">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :show-header="false" @vue:mounted="injectMock" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Title">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer title="通讯录" header-align="center" @vue:mounted="injectMock" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Header">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer @vue:mounted="injectMock">
            <template #header>
              <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                <span style="font-weight: 600;">我的联系人</span>
                <span style="font-size: 12px; color: #6b7280;">点击右上角添加</span>
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: No Group (Flat List)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            group-by="none"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Custom GroupBy (Vowel)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            :group-by="vowelGrouper"
            :show-alphabet-nav="false"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Single Select Mode">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            select-mode="single"
            @contact-select="(c) => console.log('selected:', c.userId)"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Multiple Select Mode">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            select-mode="multiple"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Custom Filter (userId only)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            :filter-fn="customFilterFn"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Custom Empty Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :show-new-request="false" :show-group="false">
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

    <Variant title="Contact: Custom Item Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            @vue:mounted="injectMockContacts"
          >
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

    <Variant title="Empty State">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Transition: fade">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :new-request-count="3"
            transition="fade"
            @vue:mounted="injectMock"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Transition: none (无动画)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :new-request-count="3"
            transition="none"
            @vue:mounted="injectMock"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Auto Entry Count (从 store 推断数量)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :new-request-count="5"
            auto-entry-count
            show-count
            group-show-count
            @vue:mounted="injectMock"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Manual Entry Count">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :new-request-count="5"
            :group-count="99"
            :contact-count="888"
            @vue:mounted="injectMock"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="#home-footer Slot (首页底部插槽)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :new-request-count="2" @vue:mounted="injectMock">
            <template #home-footer>
              <div
                style="padding: 12px 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #6b7280;"
              >
                <span>已同步 · 刚刚</span>
                <button
                  style="font-size: 12px; padding: 4px 10px; border: 1px solid #3b82f6; color: #3b82f6; border-radius: 4px; background: transparent; cursor: pointer;"
                  @click="() => console.log('add new contact')"
                >
                  + 添加
                </button>
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="#header-extra Slot (右上角操作区)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer :new-request-count="2" @vue:mounted="injectMock">
            <template #header-extra>
              <span
                style="font-size: 13px; color: #3b82f6; cursor: pointer;"
                @click="() => console.log('more')"
              >+</span>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact ItemSize: Compact">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            item-size="compact"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact ItemSize: Large + Subtitle">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            item-size="large"
            :subtitle-fn="contactSubtitleFn"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group ItemSize + Subtitle">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            group-item-size="large"
            :group-subtitle-fn="groupSubtitleFn"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Avatar Shape: Square / Rounded">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :new-request-count="2"
            avatar-shape="square"
            group-avatar-shape="rounded"
            @vue:mounted="injectMock"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Avatars (Contact + Group)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :new-request-count="2"
            :show-avatar="false"
            :group-show-avatar="false"
            @vue:mounted="injectMock"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Controlled selectedIds (multiple)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            select-mode="multiple"
            :selected-ids="contactSelectedIds"
            :max-selected="3"
            @update:selected-ids="(ids) => (contactSelectedIds = ids)"
            @contact-max-exceed="(m) => console.warn('contact max:', m)"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
          已选: {{ contactSelectedIds.join(', ') || '空' }}
        </div>
      </div>
    </Variant>

    <Variant title="Group: Controlled groupSelectedIds (multiple)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            group-select-mode="multiple"
            :group-selected-ids="groupSelectedIds"
            :group-max-selected="2"
            @update:group-selected-ids="(ids) => (groupSelectedIds = ids)"
            @group-max-exceed="(m) => console.warn('group max:', m)"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
          已选: {{ groupSelectedIds.join(', ') || '空' }}
        </div>
      </div>
    </Variant>

    <Variant title="Contact Loading State">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            loading
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group Loading State">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            group-loading
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group GroupBy: Custom Sort + Alphabet">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            :group-sort-by="customGroupComparator"
            group-group-by="alphabet"
            group-show-count
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Disable LoadMore">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            :enable-load-more="false"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Custom noMoreText">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            no-more-text="—— 已经到底了 ——"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Contact: Body Sticky + Footer Sticky">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-group="false"
            body-sticky
            footer-sticky
            @vue:mounted="injectMockContacts"
          >
            <template #body>
              <div style="padding: 8px 0; font-size: 12px; color: #3b82f6;">
                置顶提示：这是 sticky body 区域
              </div>
            </template>
            <template #footer>
              <div style="padding: 8px 0; font-size: 12px; color: #ef4444;">
                底部操作：sticky footer 区域
              </div>
            </template>
          </ContactContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group: Disable LoadMore">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            :group-enable-load-more="false"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Group: Custom noMoreText">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <ContactContainer
            :show-new-request="false"
            :show-contact="false"
            group-no-more-text="—— 群组已加载完毕 ——"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Disable Group (Provider 关闭群组能力)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false" :enable-group="false">
          <ContactContainer
            :new-request-count="3"
            @vue:mounted="injectMockContacts"
          />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
