<script setup lang="ts">
/**
 * 设置面板 - 通讯录
 *
 * 包含：EmContactContainer 各视图（home / 联系人 / 群组）搜索框显隐控制。
 * 状态来自 useDemoSettings，由 demo-page 绑定到 EmContactContainer props。
 */
import { useDemoSettings } from '../../composables/use-demo-settings'
import './demo-settings-common.css'

const { showHomeSearch, showContactSearch, showGroupSearch } = useDemoSettings()
</script>

<template>
  <div class="demo-panel">
    <div class="demo-settings__group">
      <label class="demo-settings__label">联系人搜索控制</label>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label class="demo-check">
          <input v-model="showHomeSearch" type="checkbox" />
          <span>展示 home 视图搜索</span>
        </label>
        <label class="demo-check">
          <input v-model="showContactSearch" type="checkbox" />
          <span>展示联系人子视图搜索</span>
        </label>
        <label class="demo-check">
          <input v-model="showGroupSearch" type="checkbox" />
          <span>展示群组子视图搜索</span>
        </label>
      </div>
      <div class="demo-info">
        独立控制各视图搜索框显隐。全关则使用 :show-search="false" 统一关闭。
      </div>
    </div>
  </div>
</template>
