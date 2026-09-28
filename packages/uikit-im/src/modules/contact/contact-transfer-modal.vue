<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EmAvatar as Avatar, EmButton as Button, EmEmpty as Empty, EmIcon as Icon, EmInput as Input, EmModal as Modal, useLocale, useViewport } from '@easemob-community/uikit-core'
import type { UiContact } from '@easemob-community/uikit-core'
import { useContact } from '../../composables/use-contact'
import ContactList from './contact-list.vue'
import ContactItemDefault from './contact-item-default.vue'
import type { ContactDisabledFn } from './types'

export interface ContactTransferModalProps {
  /** 是否显示弹窗（v-model:show 受控） */
  show: boolean
  /** 弹窗标题，默认按当前语言显示「选择成员」 */
  title?: string
  /** 已选中 id 列表（v-model:selected-ids 受控） */
  selectedIds?: string[]
  /** 最大可选数量，超过会被回滚并 emit max-exceed */
  maxSelected?: number
  /** 左栏条目禁用判定（如：排除自己 / 已在群成员） */
  disabledFn?: ContactDisabledFn
  /** 「确认」按钮文案，默认按当前语言显示「确认」 */
  confirmText?: string
  /** 「取消」按钮文案，默认按当前语言显示「取消」（移动端不渲染取消按钮，取消语义由头部 × 承担） */
  cancelText?: string
  /** 确认按钮加载态（异步提交期间禁止重复点击） */
  loading?: boolean
}

export interface ContactTransferModalEmits {
  /** 显示状态变化时触发，供 v-model:show 双向同步 */
  (e: 'update:show', value: boolean): void
  /** 选中变化时触发，供 v-model:selected-ids 双向同步 */
  (e: 'update:selectedIds', ids: string[]): void
  /** 点击「确认」按钮时触发，负载为当前选中 id 列表（不自动关闭，由业务侧决定后续） */
  (e: 'confirm', ids: string[]): void
  /** 点击「取消」按钮或右上角关闭时触发（随后自动关闭弹窗） */
  (e: 'cancel'): void
  /** 左栏选择超过 maxSelected 时触发 */
  (e: 'max-exceed', max: number): void
}

const props = withDefaults(defineProps<ContactTransferModalProps>(), {
  title: '',
  selectedIds: () => [],
  loading: false,
  confirmText: '',
  cancelText: '',
})

const emit = defineEmits<ContactTransferModalEmits>()

const { t } = useLocale()
const { contactList, fetchContacts, setSelectedIds } = useContact()
const { isMobile, keyboardHeight } = useViewport()

const titleText = computed(() => props.title || t('contact.transfer.title', '选择成员'))
const confirmText = computed(() => props.confirmText || t('button.confirm', '确认'))
const cancelText = computed(() => props.cancelText || t('button.cancel', '取消'))

/** 组件内选中态：打开时从 props 快照，期间双向同步回父级 */
const innerSelected = ref<string[]>([...props.selectedIds])
const rightKeyword = ref('')

watch(
  () => props.show,
  async (show) => {
    if (show) {
      innerSelected.value = [...props.selectedIds]
      rightKeyword.value = ''
      await fetchContacts()
    }
  },
)

function onSelectedChange(ids: string[]) {
  innerSelected.value = ids
  emit('update:selectedIds', ids)
}

/** 已选联系人对象：优先取联系人列表完整信息，不在列表中的 id 以最小信息兜底展示 */
const selectedContacts = computed<UiContact[]>(() => {
  const map = new Map(contactList.value.map(c => [c.userId, c]))
  return innerSelected.value.map(id => map.get(id) ?? ({ userId: id, name: id } as UiContact))
})

/** 右栏搜索：对已选列表做本地过滤（备注 / 昵称 / ID 均可命中） */
const filteredSelectedContacts = computed(() => {
  const keyword = rightKeyword.value.trim().toLowerCase()
  if (!keyword)
    return selectedContacts.value
  return selectedContacts.value.filter(c =>
    (c.remark || c.name || c.userId).toLowerCase().includes(keyword),
  )
})

function removeSelected(userId: string) {
  // ContactList 的受控选中真实落在共享 contact store，右栏/头像条移除必须写回 store，
  // 由 store→emit 链路驱动 innerSelected 与 update:selectedIds，左栏勾选态才能同步
  setSelectedIds(innerSelected.value.filter(id => id !== userId))
}

function onConfirm() {
  emit('confirm', [...innerSelected.value])
}

function onCancel() {
  emit('cancel')
  emit('update:show', false)
}

/** 移动端键盘弹起时：底部内边距顶起完成键，列表区随之收缩（与 h5-input 同一口径） */
const mobileBodyStyle = computed(() =>
  isMobile.value && keyboardHeight.value > 0 ? { paddingBottom: `${keyboardHeight.value}px` } : undefined,
)
</script>

<template>
  <Modal
    :show="props.show"
    :title="titleText"
    :width="960"
    :show-footer="false"
    body-flush
    mobile-fullscreen
    @update:show="(v: boolean) => emit('update:show', v)"
    @cancel="onCancel"
  >
    <div
      class="contact-transfer-modal"
      :class="{ 'contact-transfer-modal--mobile': isMobile }"
      :style="mobileBodyStyle"
    >
      <!-- #body 插槽：接管主体区（已选区/候选区），notice 与 footer 区域不受影响 -->
      <slot name="body">
        <!-- 移动端：已选头像条（横向滚动，点头像/角标 × 移除），替代占半屏的已选列表 -->
        <div v-if="isMobile" class="contact-transfer-modal__strip">
          <div
            v-for="contact in selectedContacts"
            :key="contact.userId"
            class="contact-transfer-modal__strip-item"
            @click="removeSelected(contact.userId)"
          >
            <Avatar :src="contact.avatar" :name="contact.name || contact.userId" :size="44" />
            <span class="contact-transfer-modal__strip-remove">
              <Icon name="xmark/bold" :size="8" />
            </span>
          </div>
          <span v-if="selectedContacts.length === 0" class="contact-transfer-modal__strip-empty">
            {{ t('group.createSelectedEmpty', '请选择联系人') }}
          </span>
        </div>

        <!-- 移动端 panel-top 注入区（如创建群组的群名称/群设置表单），位于头像条与列表之间 -->
        <div v-if="isMobile && $slots['panel-top']" class="contact-transfer-modal__panel-top">
          <slot name="panel-top" />
        </div>

        <div class="contact-transfer-modal__main">
          <!-- 左栏：搜索 + 字母分组 + 圆形勾选 + 字母索引条（移动端独占主区） -->
          <div class="contact-transfer-modal__left">
            <ContactList
              :show-header="false"
              :show-scroll-to-top="false"
              group-by="alphabet"
              :show-alphabet-nav="true"
              select-mode="multiple"
              :selected-ids="innerSelected"
              :max-selected="props.maxSelected"
              :disabled-fn="props.disabledFn"
              @update:selected-ids="onSelectedChange"
              @max-exceed="(max: number) => emit('max-exceed', max)"
            />
          </div>

          <!-- 右栏：搜索 + 已选列表（× 移除）；移动端由头像条替代，不渲染 -->
          <div v-if="!isMobile" class="contact-transfer-modal__right">
            <div class="contact-transfer-modal__right-search">
              <Input
                v-model="rightKeyword"
                variant="filled"
                prefix-icon="search"
                clearable
                :placeholder="t('contact.transfer.searchSelected', '搜索已选成员')"
              />
            </div>
            <!-- PC panel-top 注入区：右栏搜索与已选列表之间 -->
            <slot name="panel-top" />
            <div class="contact-transfer-modal__selected-list">
              <ContactItemDefault
                v-for="contact in filteredSelectedContacts"
                :key="contact.userId"
                class="contact-transfer-modal__selected-item"
                :contact="contact"
                size="normal"
                :show-checkbox="false"
                :clickable="false"
              >
                <template #extra>
                  <button
                    class="contact-transfer-modal__selected-remove"
                    :title="t('button.remove', '移除')"
                    @click="removeSelected(contact.userId)"
                  >
                    <span>×</span>
                  </button>
                </template>
              </ContactItemDefault>
              <Empty
                v-if="filteredSelectedContacts.length === 0"
                icon="person/single"
                :description="t('group.createSelectedEmpty', '请选择联系人')"
                size="small"
              />
            </div>
          </div>
        </div>
      </slot>

      <!-- #notice 插槽：错误/提示条（footer 上方通栏） -->
      <slot name="notice" />

      <!-- 移动端：通栏主按钮「确认 (n)」（0 人时禁用），取消语义由头部 × 承担 -->
      <div v-if="isMobile" class="contact-transfer-modal__mobile-footer">
        <slot name="footer">
          <Button
            type="primary"
            size="large"
            pill
            block
            :disabled="selectedContacts.length === 0"
            :loading="props.loading"
            @click="onConfirm"
          >
            {{ confirmText }} ({{ selectedContacts.length }})
          </Button>
        </slot>
      </div>
      <!-- PC：右对齐确认/取消（确认在左、取消在右） -->
      <div v-else class="contact-transfer-modal__footer">
        <slot name="footer">
          <Button pill size="large" type="primary" :loading="props.loading" @click="onConfirm">
            {{ confirmText }}
          </Button>
          <Button pill size="large" type="outline" @click="onCancel">
            {{ cancelText }}
          </Button>
        </slot>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
/* bodyFlush 后 Modal body 无内边距，本容器直接撑满内容区（桌面高 560px 固定，移动端 flex 撑满全高） */
.contact-transfer-modal {
  display: flex;
  flex-direction: column;
  height: 560px;
  box-sizing: border-box;
}

.contact-transfer-modal--mobile {
  height: auto;
  flex: 1;
  min-height: 0;
}

.contact-transfer-modal__main {
  flex: 1;
  min-height: 0;
  display: flex;
}

.contact-transfer-modal__left {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  border-right: 1px solid var(--uikit-divider-color, var(--uikit-border-color));
}

.contact-transfer-modal--mobile .contact-transfer-modal__left {
  border-right: none;
}

/* 字母索引条与分割线保持间距，不贴边（与创建群组穿梭框同一口径） */
.contact-transfer-modal__left :deep(.contact-alphabet-nav) {
  right: 12px;
}

.contact-transfer-modal__right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.contact-transfer-modal__right-search {
  padding: 16px 16px 8px;
  flex-shrink: 0;
}

.contact-transfer-modal__selected-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px;
}

.contact-transfer-modal__selected-item {
  --uikit-item-hover-padding-x: 8px;
}

.contact-transfer-modal__selected-remove {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background-color: var(--uikit-bg-secondary, #e5e7eb);
  color: var(--uikit-text-secondary);
  cursor: pointer;
  font-size: var(--uikit-font-size-13);
  line-height: 1;
  padding: 0;
  flex-shrink: 0;
}

@media (hover: hover) {
  .contact-transfer-modal__selected-remove:hover {
    background-color: var(--uikit-danger-color);
    color: var(--uikit-text-inverse);
  }
}

/* PC 底部按钮：通栏右对齐，确认在左、取消在右 */
.contact-transfer-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  padding: 12px 24px 24px;
  flex-shrink: 0;
}

.contact-transfer-modal__footer > * {
  min-width: 120px;
}

/* ===== 移动端：已选头像条 ===== */
.contact-transfer-modal__strip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid var(--uikit-divider-color, var(--uikit-border-color));
  min-height: 68px;
  box-sizing: border-box;
}

.contact-transfer-modal__strip-item {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  cursor: pointer;
}

/* 头像右上角 × 角标：点击头像任意处即移除（条目整格都是热区） */
.contact-transfer-modal__strip-remove {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--uikit-text-tertiary);
  color: var(--uikit-text-inverse, #fff);
}

.contact-transfer-modal__strip-empty {
  font-size: var(--uikit-font-size-13);
  color: var(--uikit-text-tertiary);
}

.contact-transfer-modal__panel-top {
  flex-shrink: 0;
  border-bottom: 1px solid var(--uikit-divider-color, var(--uikit-border-color));
}

/* 移动端通栏主按钮：贴底，safe-bottom 由 Popup bottom 外壳统一叠加 */
.contact-transfer-modal__mobile-footer {
  padding: 8px 16px 12px;
  flex-shrink: 0;
}
</style>
