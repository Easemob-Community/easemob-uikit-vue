<script setup lang="ts">
import UIKitProvider from '../uikit-provider/uikit-provider.vue'
import { useGroupStore } from '../../store/group'
import type { UiGroup as Group } from '@easemob/uikit-core'
import type { GroupSubtitleFn } from '../../modules/group/types'
import GroupListContainer from './group-list-container.vue'

/** 构造 mock 群组数据 */
function injectMockGroups() {
  const groupStore = useGroupStore()
  const list: Group[] = [
    { groupId: 'g_001', groupName: 'Vue 技术交流', owner: 'u_owner', memberCount: 128 },
    { groupId: 'g_002', groupName: 'React 开发者', owner: 'u_owner', memberCount: 64 },
    { groupId: 'g_003', groupName: '周末桌游局', owner: 'u_owner', memberCount: 12 },
    { groupId: 'g_004', groupName: 'Animation Lovers', owner: 'u_owner', memberCount: 8 },
    { groupId: 'g_005', groupName: '产品设计研讨', owner: 'u_owner', memberCount: 36 },
    { groupId: 'g_006', groupName: 'Bug Hunters', owner: 'u_owner', memberCount: 20 },
    { groupId: 'g_007', groupName: '环信内部', owner: 'u_owner', memberCount: 256 },
    { groupId: 'g_008', groupName: '闲聊灌水', owner: 'u_owner', memberCount: 5 },
    { groupId: 'g_009', groupName: 'Indie Game Dev', owner: 'u_owner', memberCount: 17 },
  ]
  groupStore.setGroupList(list)
}

const subtitleFn: GroupSubtitleFn = g => `${g.memberCount ?? 0} 人`
</script>

<template>
  <Story title="GroupListContainer">
    <Variant title="默认">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupListContainer
            title="我的群组"
            @vue:mounted="injectMockGroups"
            @click="(g: Group) => console.log('click:', g.groupId)"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="按成员数排序">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupListContainer
            title="群组"
            sort-by="memberCount"
            :subtitle-fn="subtitleFn"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="选择模式">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupListContainer
            title="选择群组"
            select-mode="multiple"
            :max-selected="3"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="紧凑模式">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupListContainer
            title="紧凑列表"
            item-size="compact"
            :show-member-count="false"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="隐藏头部与搜索">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupListContainer
            :show-header="false"
            :show-search="false"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="空列表">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupListContainer
            title="我的群组"
            empty-text="暂无群组，快去创建或加入吧"
            :auto-fetch="false"
          />
        </UIKitProvider>
      </div>
    </Variant>
  </Story>
</template>
