<script setup lang="ts">
import { ref } from 'vue'
import Resizable from './resizable.vue'

const controlledSize = ref(260)
</script>

<template>
  <Story title="Resizable">
    <Variant title="Horizontal (min 160 / max 480)">
      <Resizable
        axis="horizontal"
        :min="160"
        :max="480"
        :initial="280"
        style="height: 360px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;"
      >
        <div style="padding: 16px; font-size: 13px; color: #6b7280;">
          拖动右侧边缘调整宽度（160 ~ 480px）
        </div>
      </Resizable>
    </Variant>

    <Variant title="Vertical (min 80 / max 300)">
      <Resizable
        axis="vertical"
        :min="80"
        :max="300"
        :initial="160"
        style="width: 420px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;"
      >
        <div style="padding: 16px; font-size: 13px; color: #6b7280;">
          拖动底部边缘调整高度（80 ~ 300px）
        </div>
      </Resizable>
    </Variant>

    <Variant title="Controlled (v-model)">
      <div style="display: flex; align-items: center; gap: 12px;">
        <Resizable
          v-model:size="controlledSize"
          axis="horizontal"
          :min="160"
          :max="480"
          style="height: 240px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;"
        >
          <div style="padding: 16px; font-size: 13px; color: #6b7280;">
            当前宽度：{{ controlledSize }}px（外部受控）
          </div>
        </Resizable>
        <button
          type="button"
          style="padding: 6px 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; cursor: pointer;"
          @click="controlledSize = 300"
        >
          重置为 300
        </button>
      </div>
    </Variant>

    <Variant title="With visual line (show-line)">
      <Resizable
        axis="horizontal"
        :min="160"
        :max="480"
        :initial="280"
        show-line
        style="height: 240px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;"
      >
        <div style="padding: 16px; font-size: 13px; color: #6b7280;">
          开启 show-line 后显示视觉分隔线（默认隐藏，仅光标提示）
        </div>
      </Resizable>
    </Variant>

    <Variant title="Disabled">
      <Resizable
        axis="horizontal"
        :initial="280"
        disabled
        style="height: 240px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;"
      >
        <div style="padding: 16px; font-size: 13px; color: #6b7280;">
          已禁用拖拽（无手柄）
        </div>
      </Resizable>
    </Variant>
  </Story>
</template>
