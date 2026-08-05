<script setup lang="ts">
/**
 * 设置面板 - 演示数据
 *
 * 包含：注入 1000 条模拟会话（滚动性能演示）、注入中英文 mock 联系人、
 * 拼音 adapter 开关（联系人按拼音分组 / 拼音搜索对比）。
 * 动作实现集中在 useDemoSettings，面板只负责触发与状态展示。
 */
import { useDemoSettings } from '../../composables/use-demo-settings'
import './demo-settings-common.css'

const { pinyinAdapterEnabled, togglePinyinAdapter, injectMockConversations, injectMockContacts } = useDemoSettings()
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <label class="demo-settings__label">会话数据</label>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <button class="demo-btn" @click="injectMockConversations">
          注入 1000 条会话
        </button>
      </div>
      <div class="demo-info">
        用于测试会话列表长列表滚动性能，注入后会话列表会切换到本地 mock 数据。
      </div>
    </div>

    <div class="demo-settings__group">
      <label class="demo-settings__label">联系人演示（拼音能力）</label>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
        <button class="demo-btn" @click="injectMockContacts">
          注入 mock 联系人
        </button>
        <button
          class="demo-btn"
          :class="{ 'demo-btn--active': pinyinAdapterEnabled }"
          @click="togglePinyinAdapter(!pinyinAdapterEnabled)"
        >
          {{ pinyinAdapterEnabled ? '已启用拼音 adapter' : '启用拼音 adapter' }}
        </button>
      </div>
      <div class="demo-info">
        关闭时：中文全部归入 # 分组，只能原文搜索。<br />
        开启后：按拼音首字母分组（张三 → Z），支持输入 zhang / zs 搜索。
      </div>
    </div>
  </div>
</template>
