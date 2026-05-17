<script setup lang="ts">
import { ref } from 'vue'
import GroupList from './group-list.vue'
import UIKitProvider from '../../containers/uikit-provider/uikit-provider.vue'
import { useGroupStore } from '../../store/group'
import type { Group } from '../../store/group'

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

function customGroupComparator(a: Group, b: Group): number {
  return a.groupId.localeCompare(b.groupId)
}

function subtitleFn(g: Group): string | undefined {
  return `${g.memberCount ?? 0} 人·${g.groupId}`
}

function disabledFn(g: Group): boolean {
  // 禁用成员超过 100 的群
return (g.memberCount ?? 0) > 100
}

// 受控 selectedIds + maxSelected 演示
const controlledIds = ref<string[]>(['g_001'])
function onMaxExceed(max: number) {
  console.warn('[group-list] max exceeded:', max)
}

// loadMore 演示
const loadingMore = ref(false)
function onLoadMore() {
  if (loadingMore.value) return
  loadingMore.value = true
  console.log('[group-list] load-more triggered')
  setTimeout(() => {
    loadingMore.value = false
  }, 800)
}
</script>

<template>
  <Story title="GroupList">
    <Variant title="Default">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide Search">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList :show-search="false" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="SortBy: Pinyin">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList sort-by="pinyin" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="SortBy: MemberCount">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList sort-by="memberCount" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="SortBy: Custom Comparator">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList :sort-by="customGroupComparator" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="GroupBy: Alphabet">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList sort-by="pinyin" group-by="alphabet" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Single Select Mode">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            select-mode="single"
            @select="(g) => console.log('select:', g.groupId)"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Multiple Select Mode">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList select-mode="multiple" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom Item Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList @vue:mounted="injectMockGroups">
            <template #item="{ group, active }">
              <div
                style="display: flex; align-items: center; gap: 12px; padding: 10px 16px; cursor: pointer;"
                :style="{ background: active ? '#e6f0ff' : 'transparent' }"
              >
                <div
                  style="width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(135deg, #34d399, #60a5fa); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700;"
                >
                  {{ group.groupName.slice(0, 1) }}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <div style="font-size: 14px; color: #111827;">
                    {{ group.groupName }}
                  </div>
                  <div style="font-size: 12px; color: #9ca3af;">
                    {{ group.memberCount }} 位成员
                  </div>
                </div>
              </div>
            </template>
          </GroupList>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Empty State">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Show Count Badge">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList show-count @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Hide MemberCount">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList :show-member-count="false" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="ItemSize: Compact / Large">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList item-size="compact" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
      <div style="height: 600px; width: 320px; margin-top: 12px;">
        <UIKitProvider :auto-init="false">
          <GroupList item-size="large" :subtitle-fn="subtitleFn" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Avatar Shape: Circle / Square">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList avatar-shape="circle" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
      <div style="height: 600px; width: 320px; margin-top: 12px;">
        <UIKitProvider :auto-init="false">
          <GroupList avatar-shape="square" :avatar-size="48" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Subtitle (双行)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList :subtitle-fn="subtitleFn" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Disabled by Function (成员 > 100)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            select-mode="multiple"
            :disabled-fn="disabledFn"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Controlled selectedIds + maxSelected=2">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            select-mode="multiple"
            :selected-ids="controlledIds"
            :max-selected="2"
            @update:selected-ids="(ids) => (controlledIds = ids)"
            @max-exceed="onMaxExceed"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
        <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
          已选: {{ controlledIds.join(', ') || '空' }}（最多 2 个）
        </div>
      </div>
    </Variant>

    <Variant title="Loading State">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList loading @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="LoadMore on Scroll">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            enable-load-more
            :loading="loadingMore"
            @load-more="onLoadMore"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="HasMore=false (无更多数据)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList :has-more="false" @vue:mounted="injectMockGroups" />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom noMoreText">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            :has-more="false"
            no-more-text="—— 群组已加载完毕 ——"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Body Sticky + Footer Sticky">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            body-sticky
            footer-sticky
            @vue:mounted="injectMockGroups"
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
          </GroupList>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="Custom #group-header Slot">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            sort-by="pinyin"
            group-by="alphabet"
            @vue:mounted="injectMockGroups"
          >
            <template #group-header="{ group }">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: #34d399;" />
                <span style="font-weight: 600;">{{ group.title }}</span>
                <span style="font-size: 11px; color: #9ca3af;">({{ group.items.length }})</span>
              </div>
            </template>
          </GroupList>
        </UIKitProvider>
      </div>
    </Variant>

    <Variant title="ClickBehavior: event-only (外部接管)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            click-behavior="event-only"
            @click="(g) => console.log('[event-only] click:', g.groupName, g.groupId)"
            @select="(g) => console.log('[event-only] select:', g.groupName, g.groupId)"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        点击列表项：仅触发 click 事件，不设置 activeId（无高亮）。打开控制台查看日志。
      </div>
    </Variant>

    <Variant title="ClickBehavior: default (默认行为)">
      <div style="height: 600px; width: 320px;">
        <UIKitProvider :auto-init="false">
          <GroupList
            click-behavior="default"
            @click="(g) => console.log('[default] click:', g.groupName, g.groupId)"
            @select="(g) => console.log('[default] select:', g.groupName, g.groupId)"
            @vue:mounted="injectMockGroups"
          />
        </UIKitProvider>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #6b7280;">
        点击列表项：触发 click + select 事件，同时设置 activeId（有高亮）。打开控制台查看日志。
      </div>
    </Variant>
  </Story>
</template>
