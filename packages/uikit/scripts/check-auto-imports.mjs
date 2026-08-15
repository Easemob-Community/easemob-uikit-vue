/**
 * 校验 src/auto-imports.ts 的「业务主 hook」白名单与 composables/index.ts 实际导出一致。
 *
 * 逻辑：
 * 1. 从 composables/index.ts 提取 `export * from './xxx'` 的文件列表；
 * 2. 逐个文件提取 `export function/const <Name>` 的运行时导出名；
 * 3. 剔除「内部实现细节」排除名单（useRipple/useQuote/usePinyin/useUIKitStorage
 *    及其附属工具函数等，业务侧按需显式 import，不自动导入）；
 * 4. 剩余「应登记名单」与 auto-imports.ts 白名单比对，缺漏/多余均非零退出。
 *
 * 挂载：packages/uikit build 前置（与 check-icon-refs 并列），也可单独跑
 * `pnpm -F @easemob/uikit auto-imports:check`。
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), '../src')

/** 内部实现细节：不进入 auto-import 白名单（业务侧显式 import） */
const EXCLUDED = new Set([
  // use-pinyin：拼音 adapter 工具（demo 侧使用）
  'setPinyinAdapter',
  'hasPinyinAdapter',
  'resolvePinyin',
  'clearPinyinCache',
  'usePinyin',
  // use-ripple：内部涟漪效果
  'useRipple',
  // use-quote：内部引用消息状态
  'getQuotePreview',
  'buildQuoteExt',
  'useQuote',
  // use-uikit-storage：存储抽象（草稿持久化等内部链路）
  'createUIKitStorageKey',
  'getStorageBackend',
  'useUIKitStorage',
  // use-message-actions 附属：内部状态/错误解析
  'resetMultiSelectState',
  'resolveTranslateLang',
  'resolveVoiceToTextErrorMessage',
  // use-chat-plugin 附属：context provide 内部函数
  'provideChatPluginContext',
  'provideMessageInputPluginContext',
  // use-key-bindings 附属：快捷键开关内部函数
  'setKeyboardShortcutsEnabled',
  'isKeyboardShortcutsEnabled',
  // use-uikit 附属：context 注入 key 与 provider 内部装配函数
  'UIKIT_CONTEXT_KEY',
  'useUIKitProvider',
  // use-notification 附属：送达回调触发（notification-engine 内部调用，业务侧走 setNotificationHandler）
  'emitNotificationDelivered',
  // use-conversation 附属：草稿存储内部管理函数（provider 装配用）
  'clearAllDrafts',
  'initDraftStorage',
])

function fail(msg) {
  console.error(`\n[check-auto-imports] ${msg}\n`)
  process.exit(1)
}

// 1. composables/index.ts 的导出文件列表
const indexFile = readFileSync(resolve(srcDir, 'composables/index.ts'), 'utf-8')
const exportedFiles = [...indexFile.matchAll(/export \* from '\.\/([^']+)'/g)].map(m => m[1])
if (exportedFiles.length === 0)
  fail('未能从 composables/index.ts 解析导出文件列表')

// 2. 提取所有运行时导出名
const actualExports = new Set()
for (const file of exportedFiles) {
  const src = readFileSync(resolve(srcDir, `composables/${file}.ts`), 'utf-8')
  for (const m of src.matchAll(/export (?:async )?(?:function|const) ([A-Za-z_$][\w$]*)/g))
    actualExports.add(m[1])
}

// 3. 应登记名单 = 实际导出 - 排除名单
const expected = [...actualExports].filter(n => !EXCLUDED.has(n)).sort()

// 4. auto-imports.ts 白名单（只解析数组列表项行）
const autoImportsFile = readFileSync(resolve(srcDir, 'auto-imports.ts'), 'utf-8')
const registered = [...autoImportsFile.matchAll(/^    '([A-Za-z_$][\w$]*)',$/gm)].map(m => m[1])

const registeredSet = new Set(registered)
const missing = expected.filter(n => !registeredSet.has(n))
const extra = registered.filter(n => !expected.includes(n))

if (missing.length > 0)
  fail(`以下业务主 hook 已在 composables/index.ts 导出但未登记到 auto-imports.ts：\n  ${missing.join('\n  ')}`)
if (extra.length > 0)
  console.warn(`[check-auto-imports] 提示：auto-imports.ts 中登记了 composables 之外的 hook（如 locale/ 等其他模块导出，属合法额外登记，人工确认即可）：\n  ${extra.join('\n  ')}`)

console.log(`[check-auto-imports] OK：${expected.length} 个业务主 hook 与 auto-imports 白名单一致（排除 ${EXCLUDED.size} 个内部细节）`)
