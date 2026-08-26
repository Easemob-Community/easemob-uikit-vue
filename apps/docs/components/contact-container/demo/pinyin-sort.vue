<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { pinyin } from 'pinyin-pro'
import {
  EmUIKitProvider,
  setPinyinAdapter,
  useContactStore,
} from '@easemob/uikit-im'
import type { UiContact as Contact } from '@easemob/uikit-im'

/** mock 联系人：姓氏首字母覆盖 C/F/L/W/Y/Z 等，混入英文名，用于演示拼音分组与排序 */
const contacts: Contact[] = [
  { userId: 'u_zhang', name: '张伟' },
  { userId: 'u_li', name: '李娜' },
  { userId: 'u_wang', name: '王芳' },
  { userId: 'u_chen', name: '陈刚' },
  { userId: 'u_yang', name: '杨光' },
  { userId: 'u_zhao', name: '赵磊' },
  { userId: 'u_liu', name: '刘洋' },
  { userId: 'u_huang', name: '黄飞' },
  { userId: 'u_alice', name: 'Alice' },
]

/** pinyin-pro 适配器例程：返回 UIKit 约定的 PinyinResult */
function createPinyinAdapter() {
  return (text: string) => {
    const full = pinyin(text, { toneType: 'none', type: 'string', nonZh: 'consecutive' })
      .replace(/\s+/g, '')
      .toLowerCase()
    const initialsRaw = pinyin(text, { pattern: 'first', toneType: 'none', type: 'string' })
      .replace(/\s+/g, '')
      .toLowerCase()
    const firstChar = initialsRaw.charAt(0).toUpperCase()
    return {
      pinyin: full,
      initials: initialsRaw,
      firstLetter: /^[A-Z]$/.test(firstChar) ? firstChar : '#',
    }
  }
}

/** adapter 是否已注入（模块级全局单例，影响所有联系人/群组列表） */
const adapterOn = ref(false)

function toggleAdapter() {
  adapterOn.value = !adapterOn.value
  setPinyinAdapter(adapterOn.value ? createPinyinAdapter() : null)
}

/** Provider mount 后 pinia 已就绪，注入 mock 联系人 */
onMounted(() => {
  useContactStore().setContactList(contacts)
})
</script>

<template>
  <EmUIKitProvider :auto-init="false">
    <div style="display: flex; flex-direction: column; gap: 10px; width: 320px; margin: 0 auto;">
      <div style="display: flex; align-items: flex-start; gap: 10px; padding: 0 4px;">
        <button type="button" class="pinyin-sort__toggle" @click="toggleAdapter">
          {{ adapterOn ? '已注入拼音 adapter' : '注入拼音 adapter' }}
        </button>
        <p class="pinyin-sort__hint">
          {{ adapterOn ? '按拼音排序 + A-Z 分组 + 拼音搜索' : '未注入 adapter：中文全部落入 # 分组，不按拼音排序' }}
        </p>
      </div>
      <div style="height: 360px;">
        <em-contact-list
          sort-by="pinyin"
          group-by="alphabet"
          show-alphabet-nav
          :show-header="false"
          style="height: 100%;"
        />
      </div>
    </div>
  </EmUIKitProvider>
</template>

<style scoped>
.pinyin-sort__toggle {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  border-radius: 6px;
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #1f2329);
  font-size: 13px;
  cursor: pointer;
}

.pinyin-sort__hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--uikit-text-secondary, #8f959e);
}
</style>
