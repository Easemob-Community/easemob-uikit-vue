# 消息输入框富文本编辑器（tiptap）集成契约

命中本 skill 时，先说一句：`本次命中 skill: uikit-tiptap-editor`。

## 触发词

- `改输入框`
- `富文本`
- `@提及` / `mention`
- `tiptap`
- `编辑器`

## 目标

这是一份**行为契约参考**，不是强约束。它把「消息输入框富文本编辑器」这一块的真实
现状沉淀下来，让后续改动**先看清契约再动手**，避免两类白改：

1. 在 rich-input 之外另起一个 tiptap 实例，或误以为「加个 tiptap 扩展」富文本就能发出去；
2. 想当然用 tiptap 官方 Mention 扩展替换现有手搓 `@` 逻辑，忽略下游 `ext.em_at_list` 契约。

> 核心结论：**虽然是富文本编辑器，实际上行只有「纯文本 + mention userId 列表」**。
> 想让加粗/图片等富文本真正发出去，要改的是**下游发送链路**，不是只在 tiptap 加扩展。

## 落点唯一：只有 `rich-input.vue` 碰 tiptap

所有 `@tiptap/*` import 都集中在
`packages/uikit-im/src/modules/chat/message-input/rich-input.vue`，别处 0 引用：

```ts
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
```

兄弟组件 `message-input/simple-input.vue` 是纯 `<textarea>`（`textareaRef = ref<HTMLTextAreaElement>()`），
**不引 tiptap**。两者由上层 `modules/chat/message-input.vue` 按需二选一渲染。

→ 规则：编辑器逻辑集中在 rich-input，不要在别的组件里再 `new` 一个 tiptap 实例；
simple-input 保持纯 textarea，别把编辑器逻辑复制过去。

## 编辑器配置集中在一个 `useEditor` 调用

`rich-input.vue` 里只有一处 `useEditor`，扩展与自定义行为都挂在这：

```ts
const editor = useEditor({
  extensions: [
    StarterKit.configure({ heading: false, blockquote: false, horizontalRule: false, codeBlock: false }),
    Image.configure({ inline: true }),
  ],
  content: '',
  onCreate: ({ editor: e }) => { updateHasContent(e); if (props.config?.autoFocus) e.commands.focus() },
  onUpdate: ({ editor: e }) => updateHasContent(e),
  editorProps: {
    attributes: { class: 'rich-input__editor-content' },
    handlePaste: (_view, event) => { /* 粘贴时也校 maxLength，超限 preventDefault */ },
    handleKeyDown: (_view, event) => { /* maxLength / @触发 / Enter 发送 */ },
  },
})
```

自定义行为**走 ProseMirror 钩子，而非加扩展**：

- `handleKeyDown`：`maxLength` 到顶时拦普通字符输入；`@` 键（且 `enableMention`）触发 mention；
  `Enter` 发送、`Shift+Enter` 换行（`event.key === 'Enter' && !event.shiftKey` → `preventDefault()` + `handleSend()`）。
- `handlePaste`：粘贴前把 `doc.textContent.length + pastedText.length` 与 `maxLength` 比对，超限拦截。

## @提及是手搓的，不是 tiptap Mention 扩展

`@` 交互完全由手写逻辑实现，没有引入 `@tiptap/extension-mention`：

- `handleKeyDown` 里记录 `mentionAnchorPos`，用 `editor.view.coordsAtPos(pos)` 拿光标像素坐标；
- **手动 `document.createElement('div')`** 造一个 `position: fixed` 的 1px 锚点 append 到 body，
  连同 keyword 通过 `emit('mention-trigger', anchor, keyword)` 交给上层弹层定位；
- 选中联系人后 `insertMention()` 用 `deleteRange(...).insertContent(\`@${name} \`)` 落字，
  并把 `contact` 去重推进 `mentionList`。

→ 想换成官方 Mention 扩展前，务必评估：现有 `@` 交互、锚点 DOM、以及下游 `ext.em_at_list` 契约都要一起改，不是无痛替换。

## 对外契约（props / emits / expose）

```ts
export interface RichInputProps {
  config?: ChatConfig['input']
  enableMention?: boolean // 是否启用 @提及
}

const emit = defineEmits<{
  (e: 'send', html: string, text: string, mentionList?: MentionContact[]): void
  (e: 'send-file', type: 'image' | 'file' | 'video', files: FileList): void
  (e: 'emoji-click', anchor: HTMLElement): void
  (e: 'voice-start'): void
  (e: 'voice-end'): void
  (e: 'mention-trigger', anchor: HTMLElement, keyword: string): void
  (e: 'mention-close'): void
}>()

defineExpose({ insertMention, insertEmoji, setText, getText })
```

事件命名遵循仓库约定的 kebab-case（见 `uikit-lint-governance`）。

## ⚠️ 最重要的非直觉契约：HTML 产出但被下游丢弃

编辑器 `handleSend()` 能同时产出三样东西：

```ts
const html = editor.value.getHTML()
const text = editor.value.getText()
emit('send', html, text, mentionList.value.length > 0 ? mentionList.value : undefined)
```

但消费方 `packages/uikit-im/src/modules/chat/message-input.vue` 的 `handleSendRich` **忽略 `_html`**（下划线前缀即弃用），
只发 `text`，mention 写进 `ext.em_at_list`：

```ts
async function handleSendRich(_html: string, text: string, mentionList?: MentionContact[]) {
  // ...编辑态走 modifyTextMessage(target, text)
  let ext = buildExtWithQuote()
  if (mentionList && mentionList.length > 0) {
    ext = ext || {}
    ext.em_at_list = mentionList.map(m => m.userId) // 只留 userId 列表
  }
  sendTextMessage(text, ext) // 只发纯文本 + ext，_html 从未被用到
}
```

内联图片走 `URL.createObjectURL(file)` 生成 blob URL 插入编辑器，`handleSend` 成功后与
`onBeforeUnmount` 时都会 `URL.revokeObjectURL(url)` 回收——**图片不进入 HTML 发送链路，发送后 blob URL 即失效**。

→ 想让富文本（加粗、内联图片等）真正上行，必须改**下游发送链路**（`handleSendRich` + `useChat` 的发送方法 + SDK 消息体），
只在 rich-input 加 tiptap 扩展是白改。

## 反面清单

- ❌ 在别的组件（如 simple-input 或新组件）里另起一个 tiptap 实例——编辑器只在 rich-input。
- ❌ 以为「加个 tiptap 扩展」富文本就能发出去——下游 `handleSendRich` 只取 `text`，`_html` 被丢弃。
- ❌ 用 tiptap 官方 Mention 扩展替换手搓 `@` 逻辑，却不评估现有 `@` 交互与 `ext.em_at_list` 契约。
- ❌ 依赖内联图片的 blob URL 在发送后仍有效——发送/卸载时已 `revokeObjectURL`。
- ❌ 把 maxLength / Enter 发送等行为改成加扩展实现——现状是 `editorProps` 的 ProseMirror 钩子，改动集中在此。
