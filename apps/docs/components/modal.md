# Modal 对话框

居中弹窗组件，用于需要用户确认的关键操作，支持自定义标题、按钮文案与插槽内容。

默认形态对齐设计稿：左对齐标题 + 右上角关闭按钮 + header 分割线 + 右对齐 pill 按钮（确认在左、取消在右）；通过 `icon` / `content-align` 可实现「文本 + 图标」通知变体，`footer-align="stretch"` 可回到等宽铺满的旧按钮布局。穿梭框（双栏选人）场景见 `EmContactTransferModal`。

## 使用方式

组件以 `EmModal` 为名导出，全局注册后可直接使用：

```vue
<script setup lang="ts">
import { ref } from 'vue'

const show = ref(false)
</script>

<template>
  <em-button @click="show = true">打开对话框</em-button>
  <em-modal v-model:show="show" title="确认删除？">
    删除后数据将无法恢复，是否继续？
  </em-modal>
</template>
```

## 基础用法

<demo src="./demo/basic.vue" title="基础用法" desc="v-model:show 控制显隐；title 设置标题；show-cancel 控制是否显示取消按钮。" />

## 自定义

<demo src="./demo/custom.vue" title="自定义" desc="通过 cancel-text / confirm-text 自定义按钮文案，适配不同业务语境。" />

## 使用建议

| ✅ Do | ❌ Don't |
| --- | --- |
| 用于需要用户明确决策的关键操作 | 用来展示普通提示信息（用 Toast） |
| 删除、退群等不可逆操作设置 `type="danger"` | 确认删除仍用 primary 主色 |
| 标题直接说明操作后果，如「确认删除该会话？」 | 标题只写「提示」或「确认」 |
| 正文补充必要上下文，帮助用户做决定 | 正文堆砌长段免责条款 |
| 弹窗内最多两个按钮（确认 / 取消） | 在弹窗底部放 3 个以上选项 |
| 需要复杂表单时使用 `Popup` 或抽屉 | 在 Modal 里塞入多步骤表单 |

## 穿梭框 EmContactTransferModal

`EmContactTransferModal` 是基于 `EmModal` 的穿梭框（双栏选人）弹窗：左栏为联系人列表（搜索 + 字母分组 + 多选 + 字母索引条），右栏为已选列表（搜索 + 单个移除），底部确认 / 取消按钮。弹窗宽 960px，移动端（≤640px）双栏纵向堆叠、高度 70vh。

依赖登录态（自动拉取联系人列表），需包裹在 `EmUIKitProvider` 内使用。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { EmContactTransferModal, EmUIKitProvider } from '@easemob/uikit-im'

const show = ref(false)
const loading = ref(false)

async function onConfirm(ids: string[]) {
  loading.value = true
  try {
    // await inviteMembers(ids) —— 业务侧提交
    show.value = false
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <EmUIKitProvider app-key="your-app-key" :auto-init="true">
    <em-contact-transfer-modal
      v-model:show="show"
      :max-selected="20"
      :loading="loading"
      @confirm="onConfirm"
    />
  </EmUIKitProvider>
</template>
```

- `confirm` 不会自动关闭弹窗，由业务侧提交成功后自行关闭（配合 `loading` 防止重复提交）
- `disabledFn` 可排除不可选项（如自己 / 已在群成员）：`(contact: Contact) => boolean`

<!-- @include: ../.vitepress/gen/contact-transfer-modal.md -->

## API

<!-- @include: ../.vitepress/gen/modal.md -->
