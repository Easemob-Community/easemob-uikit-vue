<script setup lang="ts">
import { ref } from 'vue'
import ImageViewer from './image-viewer.vue'

const singleShow = ref(false)
const multiShow = ref(false)
const multiIndex = ref(0)

const singleSrcs = ['https://picsum.photos/id/1015/1200/800']
const multiSrcs = [
  'https://picsum.photos/id/1015/1200/800',
  'https://picsum.photos/id/1018/1200/800',
  'https://picsum.photos/id/1025/1200/800',
]
</script>

<template>
  <Story title="ImageViewer">
    <Variant title="单图 Single">
      <div class="u-flex u-flex-col u-gap-2 u-items-start">
        <button class="uikit-story-btn" @click="singleShow = true">
          打开预览（loading / 双击缩放 / 滚轮缩放 / 拖拽 / 旋转 / 下载）
        </button>
        <ImageViewer v-model:show="singleShow" :srcs="singleSrcs" />
      </div>
    </Variant>
    <Variant title="多图相册 Multi">
      <div class="u-flex u-flex-col u-gap-2 u-items-start">
        <button class="uikit-story-btn" @click="multiShow = true">
          打开多图预览（左右箭头 / 索引指示 / 键盘 ←→ 切换）
        </button>
        <ImageViewer v-model:show="multiShow" v-model:index="multiIndex" :srcs="multiSrcs" />
      </div>
    </Variant>
    <Variant title="footer 插槽 Footer Slot">
      <div class="u-flex u-flex-col u-gap-2 u-items-start">
        <button class="uikit-story-btn" @click="multiShow = true">
          打开预览（自定义底部按钮，如"查看原图/查看中图"）
        </button>
        <ImageViewer v-model:show="multiShow" v-model:index="multiIndex" :srcs="multiSrcs" :show-navigator="false">
          <template #footer="{ index, loading }">
            <span class="uikit-story-counter">{{ index + 1 }} / {{ multiSrcs.length }}</span>
            <button
              v-if="!loading"
              class="uikit-story-btn uikit-story-btn--dark"
              @click="multiIndex = (multiIndex + 1) % multiSrcs.length"
            >
              下一张
            </button>
          </template>
        </ImageViewer>
      </div>
    </Variant>
  </Story>
</template>

<style scoped>
.uikit-story-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid var(--uikit-border-color, #e5e7eb);
  background: var(--uikit-bg-base, #fff);
  color: var(--uikit-text-primary, #1f2937);
  font-size: var(--uikit-font-size-14, 14px);
  cursor: pointer;
}

.uikit-story-btn--dark {
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  margin-left: 8px;
}

.uikit-story-counter {
  padding: 6px 14px;
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: var(--uikit-font-size-12, 12px);
}
</style>
