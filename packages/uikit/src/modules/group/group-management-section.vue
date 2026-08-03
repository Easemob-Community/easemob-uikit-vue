<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatSdkError } from '../../utils/sdk-error'
import IconButton from '../../components/icon-button/icon-button.vue'
import Popup from '../../components/popup/popup.vue'
import Cell from '../../components/cell/cell.vue'
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
  /** 二级页面展示方式：drawer（抽屉）或 modal（居中弹窗） */
  displayMode?: 'drawer' | 'modal'
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
  displayMode: 'drawer',
  showMuteAll: true,
  showMuteList: true,
  showBlocklist: true,
  showAllowlist: false,
  showSharedFiles: true,
  showJoinRequests: false,
})

const emit = defineEmits<{
  (e: 'group-operation', payload: { type: string, groupId: string, userId?: string }): void
}>()

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
      emit('group-operation', { type: 'unmute-all', groupId: props.groupId })
    }
    else {
      await muteAllGroupMembers(props.groupId)
      emit('group-operation', { type: 'mute-all', groupId: props.groupId })
    }
  }
  catch (err) {
    console.warn('[GroupManagementSection] toggleMuteAll failed:', formatSdkError(err))
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
const sharedFileListRef = ref<InstanceType<typeof EmGroupSharedFileList> | null>(null)
const blockListRef = ref<InstanceType<typeof EmGroupBlocklist> | null>(null)
const muteListRef = ref<InstanceType<typeof EmGroupMuteList> | null>(null)
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
    <!-- 全员禁言开关 -->
    <Cell
      v-if="props.showMuteAll && isAdminOrOwner"
      :clickable="false"
      size="compact"
      :title="t('group.management.muteAll') || '全员禁言'"
      class="group-management-section__switch-cell"
    >
      <template #trailing>
        <label class="group-management-section__toggle">
          <input
            type="checkbox"
            :checked="isMuteAll"
            class="group-management-section__toggle-input"
            @change="toggleMuteAll"
          >
          <span class="group-management-section__toggle-slider" />
        </label>
      </template>
    </Cell>

    <!-- 管理入口列表 -->
    <div class="group-management-section__entries">
      <Cell
        v-for="entry in managementEntries"
        :key="entry.key"
        :title="entry.label"
        :meta="entry.count ? String(entry.count) : undefined"
        show-arrow
        size="compact"
        @click="openDrawer(entry.key)"
      />
    </div>

    <!-- 二级抽屉 -->
    <ChatDrawer
      v-if="props.displayMode === 'drawer'"
      v-model:show="showDrawer"
      :overlay="true"
      :close-on-click-overlay="true"
      @close="closeDrawer"
    >
      <template #header>
        <div class="group-management-section__drawer-header">
          <IconButton
            class="group-management-section__drawer-close"
            icon="arrows/arrowto"
            size="small"
            variant="ghost"
            :title="t('button.back') || '返回'"
            @click="closeDrawer"
          />
          <span class="group-management-section__drawer-title">{{ drawerTitle }}</span>
          <IconButton
            v-if="activeDrawerKey === 'files'"
            icon="arrows/arrow_up_n_box"
            size="small"
            type="primary"
            :title="t('group.sharedFile.uploadText') || '上传'"
            @click="sharedFileListRef?.triggerUpload()"
          />
          <IconButton
            v-else-if="activeDrawerKey === 'block'"
            icon="actions/plus"
            size="small"
            type="primary"
            :title="t('group.blocklist.add') || '添加'"
            @click="blockListRef?.openAddMember()"
          />
          <IconButton
            v-else-if="activeDrawerKey === 'mute'"
            icon="actions/plus"
            size="small"
            type="primary"
            :title="t('group.mutelist.add') || '添加禁言'"
            @click="muteListRef?.openAddMember()"
          />
          <span v-else class="group-management-section__drawer-placeholder" />
        </div>
      </template>

      <div class="group-management-section__drawer-body">
        <EmGroupMuteList
          v-if="activeDrawerKey === 'mute'"
          ref="muteListRef"
          :group-id="props.groupId"
          @unmute="emit('group-operation', { type: 'unmute-member', groupId: props.groupId, userId: $event.userId })"
          @mute="emit('group-operation', { type: 'mute-member', groupId: props.groupId, userId: $event[0]?.userId })"
        />
        <EmGroupBlocklist
          v-if="activeDrawerKey === 'block'"
          ref="blockListRef"
          :group-id="props.groupId"
          @unblock="emit('group-operation', { type: 'unblock-member', groupId: props.groupId, userId: $event.userId })"
          @block="emit('group-operation', { type: 'block-member', groupId: props.groupId, userId: $event[0]?.userId })"
        />
        <EmGroupAllowlist
          v-if="activeDrawerKey === 'allow'"
          :group-id="props.groupId"
          @remove="emit('group-operation', { type: 'remove-allowlist-member', groupId: props.groupId, userId: $event.userId })"
        />
        <EmGroupSharedFileList
          v-if="activeDrawerKey === 'files'"
          ref="sharedFileListRef"
          :group-id="props.groupId"
        />
        <EmGroupJoinRequestList
          v-if="activeDrawerKey === 'requests'"
          :group-id="props.groupId"
          @accepted="emit('group-operation', { type: 'accept-join-request', groupId: props.groupId, userId: $event })"
          @rejected="emit('group-operation', { type: 'reject-join-request', groupId: props.groupId, userId: $event })"
        />
      </div>
    </ChatDrawer>

    <!-- 二级弹窗 -->
    <Popup
      v-else
      v-model:show="showDrawer"
      position="center"
      :close-on-click-overlay="true"
      @close="closeDrawer"
    >
      <div class="group-management-section__modal">
        <div class="group-management-section__drawer-header">
          <IconButton
            class="group-management-section__drawer-close"
            icon="arrows/arrowto"
            size="small"
            variant="ghost"
            :title="t('button.back') || '返回'"
            @click="closeDrawer"
          />
          <span class="group-management-section__drawer-title">{{ drawerTitle }}</span>
          <IconButton
            v-if="activeDrawerKey === 'files'"
            icon="arrows/arrow_up_n_box"
            size="small"
            type="primary"
            :title="t('group.sharedFile.uploadText') || '上传'"
            @click="sharedFileListRef?.triggerUpload()"
          />
          <IconButton
            v-else-if="activeDrawerKey === 'block'"
            icon="actions/plus"
            size="small"
            type="primary"
            :title="t('group.blocklist.add') || '添加'"
            @click="blockListRef?.openAddMember()"
          />
          <IconButton
            v-else-if="activeDrawerKey === 'mute'"
            icon="actions/plus"
            size="small"
            type="primary"
            :title="t('group.mutelist.add') || '添加禁言'"
            @click="muteListRef?.openAddMember()"
          />
          <span v-else class="group-management-section__drawer-placeholder" />
        </div>
        <div class="group-management-section__drawer-body">
          <EmGroupMuteList
            v-if="activeDrawerKey === 'mute'"
            ref="muteListRef"
            :group-id="props.groupId"
            @unmute="emit('group-operation', { type: 'unmute-member', groupId: props.groupId, userId: $event.userId })"
            @mute="emit('group-operation', { type: 'mute-member', groupId: props.groupId, userId: $event[0]?.userId })"
          />
          <EmGroupBlocklist
            v-if="activeDrawerKey === 'block'"
            ref="blockListRef"
            :group-id="props.groupId"
            @unblock="emit('group-operation', { type: 'unblock-member', groupId: props.groupId, userId: $event.userId })"
            @block="emit('group-operation', { type: 'block-member', groupId: props.groupId, userId: $event[0]?.userId })"
          />
          <EmGroupAllowlist
            v-if="activeDrawerKey === 'allow'"
            :group-id="props.groupId"
            @remove="emit('group-operation', { type: 'remove-allowlist-member', groupId: props.groupId, userId: $event.userId })"
          />
          <EmGroupSharedFileList
            v-if="activeDrawerKey === 'files'"
            ref="sharedFileListRef"
            :group-id="props.groupId"
          />
          <EmGroupJoinRequestList
            v-if="activeDrawerKey === 'requests'"
            :group-id="props.groupId"
            @accepted="emit('group-operation', { type: 'accept-join-request', groupId: props.groupId, userId: $event })"
            @rejected="emit('group-operation', { type: 'reject-join-request', groupId: props.groupId, userId: $event })"
          />
        </div>
      </div>
    </Popup>
  </div>
</template>

<style scoped>
.group-management-section {
  flex-shrink: 0;
}

.group-management-section__entries {
  display: flex;
  flex-direction: column;
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
  gap: 12px;
}

.group-management-section__drawer-close {
  flex-shrink: 0;
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

.group-management-section__modal {
  width: 420px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background-color: var(--uikit-bg-base);
  border-radius: var(--uikit-components-radius, 8px);
  overflow: hidden;
}
</style>
