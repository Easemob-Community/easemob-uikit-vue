<script setup lang="ts">
import { computed, ref } from 'vue'
import Icon from '../../components/icon/icon.vue'
import { useLocale } from '../../locale'
import { useUIKit } from '../../composables/use-uikit'
import { useGroup } from '../../composables/use-group'
import ChatDrawer from '../../modules/chat/drawer/chat-drawer.vue'
import EmGroupMuteList from './group-management/mute-list.vue'
import EmGroupBlocklist from './group-management/block-list.vue'
import EmGroupAllowlist from './group-management/allow-list.vue'
import EmGroupSharedFileList from './group-management/shared-file-list.vue'
import EmGroupJoinRequestList from './group-management/join-request-list.vue'

export interface GroupManagementSectionProps {
  /** 群 ID */
  groupId: string
  /** 是否展示全员禁言开关 */
  showMuteAll?: boolean
  /** 是否展示禁言列表入口 */
  showMuteList?: boolean
  /** 是否展示黑名单入口 */
  showBlocklist?: boolean
  /** 是否展示白名单入口 */
  showAllowlist?: boolean
  /** 是否展示共享文件入口 */
  showSharedFiles?: boolean
  /** 是否展示入群申请入口 */
  showJoinRequests?: boolean
}

type ManagementKey = 'mute' | 'block' | 'allow' | 'files' | 'requests'

interface ManagementEntry {
  key: ManagementKey
  label: string
  show: boolean
  count?: number
}

const props = withDefaults(defineProps<GroupManagementSectionProps>(), {
  showMuteAll: true,
  showMuteList: true,
  showBlocklist: true,
  showAllowlist: true,
  showSharedFiles: true,
  showJoinRequests: true,
})

const { t } = useLocale()
const { stores } = useUIKit()
const { muteAllGroupMembers, unmuteAllGroupMembers } = useGroup()

const group = computed(() => stores.group.getGroupById(props.groupId))
const isMuteAll = computed(() => group.value?.mute === true)

const currentUserRole = computed(() => group.value?.role || 'member')
const isOwner = computed(() => currentUserRole.value === 'owner')
const isAdminOrOwner = computed(() => currentUserRole.value === 'owner' || currentUserRole.value === 'admin')

async function toggleMuteAll() {
  if (!props.groupId)
    return
  try {
    if (isMuteAll.value) {
      await unmuteAllGroupMembers(props.groupId)
    }
    else {
      await muteAllGroupMembers(props.groupId)
    }
  }
  catch (err) {
    console.warn('[GroupManagementSection] toggleMuteAll failed:', err)
  }
}

const managementEntries = computed<ManagementEntry[]>(() => {
  const entries: ManagementEntry[] = []
  const id = props.groupId

  if (props.showMuteList && isAdminOrOwner.value) {
    entries.push({
      key: 'mute',
      label: t('group.management.muteList') || '禁言列表',
      show: true,
      count: (stores.group.groupMuteListMap[id] || []).length,
    })
  }

  if (props.showBlocklist && isAdminOrOwner.value) {
    entries.push({
      key: 'block',
      label: t('group.management.blocklist') || '黑名单',
      show: true,
      count: (stores.group.groupBlocklistMap[id] || []).length,
    })
  }

  if (props.showAllowlist && isOwner.value) {
    entries.push({
      key: 'allow',
      label: t('group.management.allowlist') || '白名单',
      show: true,
      count: (stores.group.groupAllowlistMap[id] || []).length,
    })
  }

  if (props.showSharedFiles) {
    entries.push({
      key: 'files',
      label: t('group.management.sharedFiles') || '共享文件',
      show: true,
      count: (stores.group.groupSharedFilesMap[id] || []).length,
    })
  }

  if (props.showJoinRequests && isAdminOrOwner.value) {
    entries.push({
      key: 'requests',
      label: t('group.management.joinRequests') || '入群申请',
      show: true,
      count: (stores.group.groupJoinRequestsMap[id] || []).length,
    })
  }

  return entries
})

const hasManagementEntries = computed(() => {
  return managementEntries.value.length > 0 || (props.showMuteAll && isAdminOrOwner.value)
})

const activeDrawerKey = ref<ManagementKey | null>(null)
const showDrawer = computed({
  get: () => activeDrawerKey.value !== null,
  set: (value: boolean) => {
    if (!value)
      activeDrawerKey.value = null
  },
})

const drawerTitle = computed(() => {
  const key = activeDrawerKey.value
  if (!key)
    return ''
  const map: Record<ManagementKey, string> = {
    mute: t('group.management.muteList') || '禁言列表',
    block: t('group.management.blocklist') || '黑名单',
    allow: t('group.management.allowlist') || '白名单',
    files: t('group.management.sharedFiles') || '共享文件',
    requests: t('group.management.joinRequests') || '入群申请',
  }
  return map[key]
})

function openDrawer(key: ManagementKey) {
  activeDrawerKey.value = key
}

function closeDrawer() {
  activeDrawerKey.value = null
}
</script>

<template>
  <div v-if="hasManagementEntries" class="group-management-section">
    <div class="group-management-section__title">
      {{ t('group.management.title') || '群管理' }}
    </div>

    <!-- 全员禁言开关 -->
    <div
      v-if="props.showMuteAll && isAdminOrOwner"
      class="group-management-section__item group-management-section__item--switch"
    >
      <div class="group-management-section__item-left">
        <Icon name="audio-video/mute" :size="18" class="group-management-section__icon" />
        <span class="group-management-section__label">
          {{ t('group.management.muteAll') || '全员禁言' }}
        </span>
      </div>
      <label class="group-management-section__toggle">
        <input
          type="checkbox"
          :checked="isMuteAll"
          class="group-management-section__toggle-input"
          @change="toggleMuteAll"
        >
        <span class="group-management-section__toggle-slider" />
      </label>
    </div>

    <!-- 管理入口列表 -->
    <div
      v-for="entry in managementEntries"
      :key="entry.key"
      class="group-management-section__entry"
    >
      <div
        class="group-management-section__item"
        @click="openDrawer(entry.key)"
      >
        <div class="group-management-section__item-left">
          <span class="group-management-section__label">{{ entry.label }}</span>
          <span v-if="entry.count" class="group-management-section__badge">
            {{ entry.count }}
          </span>
        </div>
        <Icon
          name="arrows/chevron_right"
          :size="16"
          class="group-management-section__arrow"
        />
      </div>
    </div>

    <!-- 二级抽屉 -->
    <ChatDrawer
      v-model:show="showDrawer"
      :overlay="true"
      :close-on-click-overlay="true"
      @close="closeDrawer"
    >
      <template #header>
        <div class="group-management-section__drawer-header">
          <button class="group-management-section__drawer-close" @click="closeDrawer">
            <Icon name="arrows/arrow_left_thick" :size="16" />
          </button>
          <span class="group-management-section__drawer-title">{{ drawerTitle }}</span>
          <span class="group-management-section__drawer-placeholder" />
        </div>
      </template>

      <div class="group-management-section__drawer-body">
        <EmGroupMuteList
          v-if="activeDrawerKey === 'mute'"
          :group-id="props.groupId"
        />
        <EmGroupBlocklist
          v-if="activeDrawerKey === 'block'"
          :group-id="props.groupId"
        />
        <EmGroupAllowlist
          v-if="activeDrawerKey === 'allow'"
          :group-id="props.groupId"
        />
        <EmGroupSharedFileList
          v-if="activeDrawerKey === 'files'"
          :group-id="props.groupId"
        />
        <EmGroupJoinRequestList
          v-if="activeDrawerKey === 'requests'"
          :group-id="props.groupId"
        />
      </div>
    </ChatDrawer>
  </div>
</template>

<style scoped>
.group-management-section {
  padding: 16px;
  border-top: 1px solid var(--uikit-border-color, #f3f4f6);
  flex-shrink: 0;
}

.group-management-section__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  margin-bottom: 12px;
}

.group-management-section__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  cursor: pointer;
  transition: background-color 0.15s;
}

.group-management-section__item:hover {
  background-color: var(--uikit-bg-secondary);
}

.group-management-section__item--switch {
  cursor: default;
}

.group-management-section__item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.group-management-section__icon {
  color: var(--uikit-text-secondary);
}

.group-management-section__label {
  font-size: 14px;
  font-weight: 500;
  color: var(--uikit-text-primary);
}

.group-management-section__badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--uikit-text-secondary);
  background-color: var(--uikit-bg-secondary);
  padding: 1px 7px;
  border-radius: 10px;
}

.group-management-section__arrow {
  color: var(--uikit-text-secondary);
}

.group-management-section__entry {
  border-top: 1px solid var(--uikit-border-color, #f3f4f6);
}

/* 全员禁言开关 */
.group-management-section__toggle {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.group-management-section__toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.group-management-section__toggle-slider {
  position: absolute;
  inset: 0;
  background-color: #d1d5db;
  border-radius: 24px;
  transition: background-color 0.2s;
}

.group-management-section__toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: #ffffff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.group-management-section__toggle-input:checked + .group-management-section__toggle-slider {
  background-color: var(--uikit-primary-color, hsl(203, 100%, 60%));
}

.group-management-section__toggle-input:checked + .group-management-section__toggle-slider::before {
  transform: translateX(20px);
}

/* 抽屉头部 */
.group-management-section__drawer-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--uikit-border-color, #f3f4f6);
  gap: 12px;
}

.group-management-section__drawer-close {
  background: none;
  border: none;
  color: var(--uikit-text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--uikit-components-radius, 6px);
  padding: 0;
  transition: background-color 0.15s;
}

.group-management-section__drawer-close:hover {
  background-color: var(--uikit-bg-secondary);
}

.group-management-section__drawer-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--uikit-text-primary);
  flex: 1;
  text-align: center;
}

.group-management-section__drawer-placeholder {
  width: 32px;
}

.group-management-section__drawer-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>
