<script setup lang="ts">
/**
 * 直播顶部信息栏（P4 review UI 规范）：
 * - 红色渐变横幅（高度 50px + 刘海安全区）；
 * - 左：主播头像（圆形 40px）+ 直播间标题（白色粗体）+ 🔥热度；
 * - 右：更多（...）+ 投诉按钮。
 */
import { t } from '@easemob/uikit-core'

withDefaults(defineProps<{
  /** 直播间标题（如「会员年中福利」） */
  title?: string
  /** 主播头像（缺省用 emoji 占位） */
  avatarUrl?: string
  /** 热度展示文本（如「1.4万」） */
  heat?: string
}>(), {
  title: '',
  avatarUrl: '',
  heat: '',
})

const emit = defineEmits<{
  /** 更多按钮 */
  (e: 'more'): void
  /** 投诉按钮 */
  (e: 'report'): void
}>()
</script>

<template>
  <div class="live-top-bar">
    <div class="live-top-bar__left">
      <!-- 主播头像：圆形 40px -->
      <img
        v-if="avatarUrl"
        class="live-top-bar__avatar"
        :src="avatarUrl"
        :alt="title"
      >
      <span v-else class="live-top-bar__avatar live-top-bar__avatar--placeholder">👩‍💼</span>
      <div class="live-top-bar__info">
        <div class="live-top-bar__title">
          {{ title }}
        </div>
        <div v-if="heat" class="live-top-bar__heat">
          🔥 {{ heat }}
        </div>
      </div>
    </div>
    <div class="live-top-bar__right">
      <button class="live-top-bar__more" aria-label="更多" @click="emit('more')">
        ⋯
      </button>
      <button class="live-top-bar__report" @click="emit('report')">
        {{ t('chatroom.ui.report') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.live-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: calc(50px + var(--uikit-safe-top, 0px));
  padding: var(--uikit-safe-top, 0px) 12px 0;
  background: linear-gradient(90deg, #e5484d, #ff6b6b);
  flex-shrink: 0;
}

.live-top-bar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.live-top-bar__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.8);
  object-fit: cover;
  flex-shrink: 0;
}

.live-top-bar__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(255, 255, 255, 0.25);
}

.live-top-bar__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.live-top-bar__title {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.live-top-bar__heat {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.9);
}

.live-top-bar__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.live-top-bar__more {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.live-top-bar__report {
  height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}
</style>
