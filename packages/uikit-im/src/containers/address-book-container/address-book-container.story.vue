<script setup lang="ts">
import ContactListContainer from '../contact-list-container/contact-list-container.vue'
import GroupListContainer from '../group-list-container/group-list-container.vue'
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
import { useContactStore } from '../../store/contact'
import { useGroupStore } from '../../store/group'
import type { UiContact as Contact, UiGroup as Group } from '@easemob/uikit-core'
import AddressBookContainer from './address-book-container.vue'

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
    { userId: 'u_zhang', name: '张三' },
    { userId: 'u_li', name: '李四' },
    { userId: 'u_001', name: '001号客服' },
  ]
  contactStore.setContactList(list)
}

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

function injectMockInvites() {
  const contactStore = useContactStore()
  contactStore.addInvite({ id: 'u_alice', type: 'contact', userId: 'u_alice', nickname: 'Alice', status: 'pending', timestamp: Date.now() })
  contactStore.addInvite({ id: 'g_team', type: 'group', groupId: 'g_team', groupName: '产品设计组', inviterId: 'u_bob', status: 'pending', timestamp: Date.now() })
  contactStore.addInvite({ id: 'u_old', type: 'contact', userId: 'u_old', nickname: 'Old Friend', status: 'accepted', timestamp: Date.now() - 86400_000 })
}

function injectMock() {
  injectMockContacts()
  injectMockGroups()
}
</script>

<template>
  <Story title="AddressBookContainer">
    <Variant title="Default Aggregate Home">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :notice-count="3"
            @vue:mounted="injectMock"
            @notice-click="() => console.log('notice-click')"
            @view-change="(v) => console.log('view-change:', v)"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
              <div v-else-if="view === 'notice'" style="padding: 40px 16px; text-align: center; color: #6b7280;">
                通知列表占位
              </div>
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Auto Notice Badge">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            @vue:mounted="() => { injectMock(); injectMockInvites() }"
            @notice-click="() => console.log('notice-click')"
            @view-change="(v) => console.log('view-change:', v)"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        未传入 noticeCount 时，徽标自动显示 pending 好友申请 + 群邀请数量。
      </div>
    </Variant>

    <Variant title="Persisted Notice Badge">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            notice-persist-invites
            @vue:mounted="() => { injectMock(); injectMockInvites() }"
            @notice-click="() => console.log('notice-click')"
            @view-change="(v) => console.log('view-change:', v)"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: var(--uikit-font-size-12); color: #6b7280;">
        开启 notice-persist-invites 后，pending 通知会持久化；刷新页面后首页徽标仍可立即显示红点。
      </div>
    </Variant>

    <Variant title="Hide Notice">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer :show-notice="false" @vue:mounted="injectMock">
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Group (Flat Contact)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :show-notice="false"
            :show-group="false"
            @vue:mounted="injectMockContacts"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Contact (Flat Group)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :show-notice="false"
            :show-contact="false"
            @vue:mounted="injectMockGroups"
          >
            <template #default="{ view }">
              <GroupListContainer v-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Nav Entry Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer :notice-count="5" @vue:mounted="injectMock">
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
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
              <div v-else-if="view === 'notice'" style="padding: 40px 16px; text-align: center; color: #6b7280;">
                通知列表占位
              </div>
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Back Icon">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer initial-view="group" @vue:mounted="injectMock">
            <template #back-icon>
              <span style="font-size: var(--uikit-font-size-18); color: #3b82f6;">←</span>
            </template>
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Header">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer :show-header="false" @vue:mounted="injectMock">
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Title">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer title="通讯录" header-align="center" @vue:mounted="injectMock">
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Empty State">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer>
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Transition: fade">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :notice-count="3"
            transition="fade"
            @vue:mounted="injectMock"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Transition: none (无动画)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :notice-count="3"
            transition="none"
            @vue:mounted="injectMock"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Auto Entry Count (从 store 推断数量)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :notice-count="5"
            auto-entry-count
            @vue:mounted="injectMock"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Manual Entry Count">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :notice-count="5"
            :group-count="99"
            :contact-count="888"
            @vue:mounted="injectMock"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="#home-footer Slot (首页底部插槽)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer :notice-count="2" @vue:mounted="injectMock">
            <template #home-footer>
              <div
                style="padding: 12px 16px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: var(--uikit-font-size-12); color: #6b7280;"
              >
                <span>已同步 · 刚刚</span>
                <button
                  style="font-size: var(--uikit-font-size-12); padding: 4px 10px; border: 1px solid #3b82f6; color: #3b82f6; border-radius: 4px; background: transparent; cursor: pointer;"
                  @click="() => console.log('add new contact')"
                >
                  + 添加
                </button>
              </div>
            </template>
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="#header-extra Slot (右上角操作区)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer :notice-count="2" @vue:mounted="injectMock">
            <template #header-extra>
              <span
                style="font-size: var(--uikit-font-size-13); color: #3b82f6; cursor: pointer;"
                @click="() => console.log('more')"
              >+</span>
            </template>
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Entries (自定义入口)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :notice-count="2"
            :entries="[
              { key: 'favorite', label: '收藏', icon: 'flower', count: 5 },
              { key: 'blacklist', label: '黑名单', icon: 'lock/closed' },
            ]"
            @vue:mounted="injectMock"
            @entry-click="(k) => console.log('entry-click:', k)"
            @view-change="(v) => console.log('view-change:', v)"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
              <div v-else-if="view === 'notice'" style="padding: 40px 16px; text-align: center; color: #6b7280;">
                通知列表占位
              </div>
              <div v-else-if="view === 'favorite'" style="padding: 40px 16px; text-align: center; color: #6b7280;">
                收藏列表占位
              </div>
              <div v-else-if="view === 'blacklist'" style="padding: 40px 16px; text-align: center; color: #6b7280;">
                黑名单列表占位
              </div>
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Entries with Sort (自定义排序)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <AddressBookContainer
            :notice-count="2"
            :entries="[
              { key: 'favorite', label: '收藏', icon: 'flower', count: 5, sort: 0 },
              { key: 'contact', label: '我的好友', icon: 'person/single', sort: 1 },
              { key: 'group', label: '我的群组', icon: 'person/double', sort: 2 },
              { key: 'blacklist', label: '黑名单', icon: 'lock/closed', sort: 3 },
            ]"
            :show-notice="false"
            :show-group="false"
            :show-contact="false"
            @vue:mounted="injectMock"
            @entry-click="(k) => console.log('entry-click:', k)"
            @view-change="(v) => console.log('view-change:', v)"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
              <GroupListContainer v-else-if="view === 'group'" />
              <div v-else-if="view === 'favorite'" style="padding: 40px 16px; text-align: center; color: #6b7280;">
                收藏列表占位
              </div>
              <div v-else-if="view === 'blacklist'" style="padding: 40px 16px; text-align: center; color: #6b7280;">
                黑名单列表占位
              </div>
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Disable Group (Provider 关闭群组能力)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false" :enable-group="false">
          <AddressBookContainer
            :notice-count="3"
            @vue:mounted="injectMockContacts"
          >
            <template #default="{ view }">
              <ContactListContainer v-if="view === 'contact'" />
            </template>
          </AddressBookContainer>
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
