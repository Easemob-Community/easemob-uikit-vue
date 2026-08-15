<script setup lang="ts">
/**
 * demo-chatroom 首页：五个变种入口（基础聊天室 / 语聊房 / 私域直播 / 小班课 /
 * 纯弹幕 headless）。每个入口说明「该页验证的 UIKit 能力」，演示变种哲学：
 * 场景 = 内置 preset config + 容器插槽，不 fork 内核。
 */
import { useClient } from '@easemob/uikit-core'

const { currentUser, logout } = useClient()

const entries = [
  {
    route: 'basic',
    icon: '💬',
    title: '基础聊天室',
    desc: '标准三步接入：文本 / 表情 / 图片 / 成员面板 / 系统通知',
    tag: 'custom preset',
  },
  {
    route: 'voice',
    icon: '🎙️',
    title: '语聊房',
    desc: 'voice preset：8 麦位管理（上麦 / 下麦 / 管理员抱下）+ 全员禁言',
    tag: 'voice preset',
  },
  {
    route: 'live',
    icon: '🎁',
    title: '私域直播',
    desc: 'live preset：礼物栏 + 商品指令卡片 + 信令房双房并行（signal-rooms）',
    tag: 'live preset + 双房',
  },
  {
    route: 'class',
    icon: '📖',
    title: '小班课',
    desc: 'class preset：课堂纪律消息流 + 学生成员管理（禁言 / 踢人 / 公告）',
    tag: 'class preset',
  },
  {
    route: 'danmaku',
    icon: '🎆',
    title: '纯弹幕（headless）',
    desc: '无容器接入：自绘弹幕轨道 + 礼物飘屏，纯 composable 驱动同一内核',
    tag: '§5.10 headless',
  },
]

function go(route: string) {
  window.location.hash = `#/${route}`
}

async function handleLogout() {
  await logout()
  window.location.hash = ''
}
</script>

<template>
  <div class="home-page">
    <div class="home-page__header">
      <div class="home-page__title">
        聊天室变种 Demo
      </div>
      <div class="home-page__user">
        <span class="home-page__user-name">{{ currentUser }}</span>
        <button class="home-page__logout" @click="handleLogout">
          退出
        </button>
      </div>
    </div>

    <div class="home-page__subtitle">
      同一个 EmChatroomContainer 内核，五种消费形态——全部仅靠 preset config + 插槽
    </div>

    <div class="home-page__list">
      <button
        v-for="entry in entries"
        :key="entry.route"
        class="home-entry"
        @click="go(entry.route)"
      >
        <span class="home-entry__icon">{{ entry.icon }}</span>
        <span class="home-entry__body">
          <span class="home-entry__title">{{ entry.title }}</span>
          <span class="home-entry__desc">{{ entry.desc }}</span>
        </span>
        <span class="home-entry__tag">{{ entry.tag }}</span>
        <span class="home-entry__arrow">›</span>
      </button>
    </div>

    <div class="home-page__footer">
      H5-first · 375px 移动视口 · 双账号（hfp / pfh）联调麦位 / 礼物 / 管理
    </div>
  </div>
</template>

<style scoped>
.home-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--uikit-bg-base, #fff);
}

.home-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 10px;
}

.home-page__title {
  font-size: 18px;
  font-weight: 700;
  color: var(--uikit-text-primary, #111827);
}

.home-page__user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.home-page__user-name {
  font-size: 13px;
  color: var(--uikit-text-secondary, #6b7280);
}

.home-page__logout {
  border: none;
  background: none;
  color: var(--uikit-primary-color);
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.12));
}

.home-page__subtitle {
  padding: 4px 16px 14px;
  font-size: 12px;
  color: var(--uikit-text-tertiary, #9ca3af);
}

.home-page__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 0 16px 24px;
}

.home-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px;
  border: 1px solid var(--uikit-border-color, rgba(0, 0, 0, 0.08));
  border-radius: 12px;
  background: var(--uikit-bg-panel, #fff);
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.home-entry:active {
  transform: scale(0.98);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.home-entry__icon {
  font-size: 26px;
  flex-shrink: 0;
}

.home-entry__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.home-entry__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--uikit-text-primary, #111827);
}

.home-entry__desc {
  font-size: 12px;
  color: var(--uikit-text-secondary, #6b7280);
  line-height: 1.4;
}

.home-entry__tag {
  flex-shrink: 0;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(51, 177, 255, 0.1);
  color: var(--uikit-primary-color);
}

.home-entry__arrow {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--uikit-text-tertiary, #9ca3af);
}

.home-page__footer {
  margin-top: auto;
  padding: 16px;
  font-size: 11px;
  text-align: center;
  color: var(--uikit-text-tertiary, #9ca3af);
}
</style>
