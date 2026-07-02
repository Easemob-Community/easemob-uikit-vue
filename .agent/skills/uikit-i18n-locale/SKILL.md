# Vue3 UIKit 的 i18n / locale 规范

> 命中本 skill 时，先说一句：**本次命中 skill: uikit-i18n-locale**。

## 触发词

- `加文案`
- `多语言`
- `i18n`
- `翻译`
- `locale`

## 目标

在 `easemob-uikit-vue`（核心包 `@easemob/uikit`）里加文案 / 改多语言时，
统一走 **`useLocale().t('dotted.key')`** 这一条路，避免三类翻车：

1. 组件里硬编码中文/英文字面量，英文环境漏翻；
2. 只往一种语言的 map 加 key，另一种环境渲染出原始 key；
3. 以为 `t()` 会自动替换 `{placeholder}`（**不会**），或以为改 provider `:locale` prop 能在挂载后切语言（**不生效**）。

## 结构：`packages/uikit/src/locale/`（4 文件）

- `type.ts` —— **扁平** map 类型，key→string，无嵌套：

  ```ts
  export interface LocaleMessages {
    [key: string]: string
  }
  ```

- `zh-CN.ts` / `en.ts` —— 各 `export default` 一个扁平 map，key 是点号字符串，约 130 条；
  两个文件的 **key 集合靠手工保持一致**（没有类型/脚本强约束）：

  ```ts
  const messages: LocaleMessages = {
    'chat.send': '发送',
    'message.action.quote': '引用',
    'chat.voice.releaseEnd': '松开结束录音',
    // ...
  }
  export default messages
  ```

- `index.ts` —— 注册表 + `useLocale` / `createLocale`。

## `useLocale`：模块级单例 + key 即兜底

真实实现（`src/locale/index.ts`）：

```ts
const messages: Record<string, LocaleMessages> = { 'zh-CN': zhCN, 'en': en }
const currentLocale = ref<string>('zh-CN') // 模块级 ref 单例，全局响应式

export function useLocale() {
  const t = (key: string): string => messages[currentLocale.value]?.[key] || key
  const setLocale = (locale: string) => { currentLocale.value = locale }
  const locale = computed(() => currentLocale.value)
  return { t, setLocale, locale }
}
```

- `t(key)` 只做扁平查找，**查不到就返回 key 本身**（不报错、不告警，页面直接渲染出 `chat.send` 这种原始串）。
- **`t()` 不做插值**：`'chat.pinnedBar.count': '{count} 条置顶消息'`、`'message.delete.batchConfirm': '确定删除 {count} 条消息吗？'` 这类含 `{x}` 的 key，
  必须 **调用方自己 replace**，例如 `t('chat.pinnedBar.count').replace('{count}', String(n))`。
- `currentLocale` 是**模块级 `ref` 单例**（不是 provide/inject），`setLocale` 一切换，所有绑定 `t()` 的组件全局重渲染。

## 组件消费方式（30 个文件一致）

`useLocale` 已登记在 `src/auto-imports.ts`，无需手动 import，直接：

```ts
const { t } = useLocale()
// 模板/逻辑里统一 t('key')
```

## 语言设置：provider 驱动（挂载时一次性）

`containers/uikit-provider/uikit-provider.vue`：

```ts
const { setLocale } = useLocale()
onMounted(() => {
  // ...
  setLocale(props.locale) // ProviderProps.locale 默认 'zh-CN'
})
```

- **坑**：是在 `onMounted` 里设、**不是 `watch`**。挂载后再改 `:locale` prop **不会重新生效**；
  运行时切语言请直接调 `useLocale().setLocale('en')`。

## 硬规则（该拦的）

1. 任何用户可见文案 **必须** 走 `useLocale().t('dotted.key')`，禁止硬编码中文/英文字面量。
2. 新增 key **必须同时** 加进 `zh-CN.ts` 和 `en.ts`，两边 key 集合对齐。
3. 含 `{x}` 的 key，在调用方 `.replace('{x}', ...)`（`t()` 不插值）。

## 软约定

- key 用点号分层命名，按域归组（`chat.*` / `message.*` / `conversation.*` / `contact.*` / `group.*` / `common.*`…），沿用就近同域已有前缀。
- 复用已存在的 key，别为同一文案造第二个 key（如语音提示已有 `chat.voice.releaseEnd` / `chat.voice.holdTalk`）。

## 已知漂移（见根 `TECH-DEBT.md` D9）

- `modules/chat/message-input/rich-input.vue:302` 语音提示 `{{ isRecording ? '松开结束录音' : '按住说话' }}` **硬编码中文**、英文环境漏翻；
  而同处 `simple-input.vue`（`{{ t('chat.voice.releaseEnd') }}`）/ `voice-panel.vue` 正确用了已存在的 key。修 rich-input 时改用既有 key 即可。

## 反面清单

- ❌ 组件里写死中文/英文字符串（英文环境不翻译）。
- ❌ 只往 `zh-CN.ts` 加 key、忘了 `en.ts`（英文环境把 key 当文案渲染出来）。
- ❌ 以为 `t('...{count}...')` 会自动替换 `{count}`（不会，得调用方 replace）。
- ❌ 想靠改 provider `:locale` prop 在挂载后切语言（当前不生效，得用 `useLocale().setLocale`）。
