<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ChatroomContextMenu } from '@easemob/uikit-chatroom'

const menu = reactive({ show: false, x: 0, y: 0 })
const log = ref('')

function openMenu(e: MouseEvent) {
  menu.show = true
  menu.x = e.clientX
  menu.y = e.clientY
}

function handleSelect(item: { label: string }) {
  log.value = `选中：${item.label}`
}
</script>

<template>
  <div class="cm-demo">
    <div class="cm-demo__row" @contextmenu.prevent="openMenu">
      成员行（在行上右键打开菜单）
    </div>
    <div class="cm-demo__row" @contextmenu.prevent="openMenu">
      另一行（视口边缘自动翻转菜单方向）
    </div>
    <ChatroomContextMenu
      v-model:show="menu.show"
      :x="menu.x"
      :y="menu.y"
      :items="[
        { label: '禁言 10 分钟' },
        { label: '设为管理员' },
        { label: '移出聊天室', danger: true },
      ]"
      @select="handleSelect"
    />
    <p v-if="log" class="cm-demo__log">
      {{ log }}
    </p>
  </div>
</template>

<style scoped>
.cm-demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.cm-demo__row {
  padding: 10px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-alt);
  font-size: 13px;
  cursor: context-menu;
  user-select: none;
}

.cm-demo__log {
  margin: 0;
  font-size: 13px;
}
</style>
