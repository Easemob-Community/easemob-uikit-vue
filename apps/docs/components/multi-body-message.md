# MultiBodyMessage 复合消息

`EmMultiBodyMessage` 按原始顺序渲染一条 `multi_body` 消息中的多个内容段。文本、图片、语音、视频、文件、位置和自定义内容共用一条父消息的头像、发送状态、回执与操作菜单。

## 与 CombineMessage 的区别

- **复合消息（`multi_body`）**：一条消息内包含 2～20 个有序内容段，适合图文混排；只有一个消息 ID 和一套消息级状态。
- **合并消息（`combine`）**：把多条历史消息打包转发，接收方打开后查看子消息列表。复合消息可以作为合并消息中的一个子消息。

复合消息不支持编辑或翻译。复制、引用、撤回、置顶与转发以父消息为粒度；复制后粘贴到 PC rich 输入框时，可还原文本、图片、视频和文件卡片及其顺序，远端资源直接复用 `originalUrl`，其他类型或不支持结构化剪贴板的环境使用纯文本兜底。文件附件由用户逐段下载，H5 不自动触发多文件批量保存。

## 使用方式

```vue
<script setup lang="ts">
import { EmMultiBodyMessage } from '@easemob-community/uikit-im'
import type { UiMessage } from '@easemob-community/uikit-im'

const message: UiMessage = {
  // 其余消息字段省略，实际数据由 SDK / repository 提供
  type: 'multi_body',
  body: [
    { type: 'text', content: '请看设计稿' },
    {
      type: 'image',
      localUrl: '',
      originalImageUrl: 'https://example.com/photo.jpg',
      isGif: false,
      isOriginalImage: false,
    },
    { type: 'text', content: '第三版已更新' },
  ],
}
</script>

<template>
  <EmMultiBodyMessage :message="message" />
</template>
```

<demo src="./demo/basic.vue" title="图文混排" desc="文本、图片和后续文本在同一父消息内按顺序展示，图片保留缩略图与原图预览。" />

## 发送复合消息

业务通过 `useChat().sendMultiBodyMessage` 或 `useMessageSend().sendMultiBodyMessage` 发送，不需要直接 import SDK，也不需要调用分段工厂。`MultiBodySegmentInput` 支持 `text/image/file/voice/video/location/custom` 七类输入。

```ts
const { sendMultiBodyMessage } = useChat()

await sendMultiBodyMessage([
  { type: 'text', content: '请看设计稿' },
  { type: 'image', data: imageFile, filename: imageFile.name },
  { type: 'text', content: '第三版已更新' },
])
```

本地附件使用 `data: File`，远端资源使用 `originalUrl`。语音/视频必须提供 `duration`，位置必须提供 `latitude/longitude`，自定义段必须提供 `event`。发送创建限制为 2～20 段；接收历史消息时不会在 20 段处截断。

::: info 内置图文编辑器
- **PC rich**：`input.features.multiBody: true` 后，图片、视频和文件都在光标处内联，可继续编辑前后文字；图片按最大 240×160px 等比展示，视频和文件显示带名称、大小与删除按钮的附件卡片，发送顺序与文档顺序一致。
- **PC simple**：图片、视频和文件在文字下方的待发送区预览，可逐项删除；附件记录粘贴或选择时的文本光标位置，与前后文字共同排序，继续增删文字会同步修正分段位置。
- **发送判定**：纯文本发送普通文本；仅一个附件且无文字时发送对应普通消息；文字 + 附件或两个及以上附件发送一条 `multi_body`，最多 20 段。
- **H5**：不提供复合消息编辑/发送入口，图片、视频和文件仍分开发送；接收到的复合消息可正常展示和逐段下载，内部媒体按可用宽度等比缩放，圆角为外层气泡的一半。
:::

::: warning 能力边界
- `input.features.multiBody` 默认 `false`，并且只有 adapter 上报 `multiBodyMessage !== false` 才启用。
- websdk4 完全不支持 `multi_body`，不会提供发送、接收转换、转发、下载或兼容渲染。
- SDK 旧端、推送与服务端搜索只保证看到首段；UIKit 本地搜索会扫描全部文本、文件名、地址和 custom 内容。
:::

## API

<!-- @include: ../.vitepress/gen/multi-body-message.md -->
