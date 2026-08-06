<script setup lang="ts">
import { ref } from 'vue'
import StatusBanner from './status-banner.vue'

const closableShow = ref(true)
</script>

<template>
  <Story title="StatusBanner">
    <Variant title="类型">
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 16px; background: var(--uikit-bg-base);">
        <StatusBanner type="info" title="信息提示" description="这是一条普通状态说明" />
        <StatusBanner type="warning" title="注意" description="当前操作需要留意" />
        <StatusBanner type="error" title="出错了" description="网络连接失败，请检查网络" />
        <StatusBanner type="success" title="已完成" description="同步成功" />
      </div>
    </Variant>

    <Variant title="加载中">
      <div style="padding: 16px; background: var(--uikit-bg-base);">
        <StatusBanner type="info" loading title="正在同步会话..." />
      </div>
    </Variant>

    <Variant title="可关闭">
      <div style="padding: 16px; background: var(--uikit-bg-base);">
        <StatusBanner v-model:show="closableShow" type="warning" title="可关闭横幅" closable />
        <button
          v-if="!closableShow"
          style="margin-top: 12px; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--uikit-border-color); background: var(--uikit-bg-secondary); cursor: pointer;"
          @click="closableShow = true"
        >
          重新展示
        </button>
      </div>
    </Variant>

    <Variant title="自定义图标">
      <div style="padding: 16px; background: var(--uikit-bg-base);">
        <StatusBanner type="info" icon="misc/magnifier2" title="自定义图标" description="使用 misc/magnifier2 图标" />
      </div>
    </Variant>

    <Variant title="插槽扩展">
      <div style="padding: 16px; background: var(--uikit-bg-base);">
        <StatusBanner type="error" title="同步失败">
          <template #action>
            <button style="padding: 4px 10px; border-radius: 4px; border: none; background: var(--uikit-danger-color); color: #fff; cursor: pointer; font-size: 12px;">
              重试
            </button>
          </template>
        </StatusBanner>
      </div>
    </Variant>
  </Story>
</template>
