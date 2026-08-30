/**
 * 校验 @easemob/uikit-im 的 SDK 隔离：场景 UI 包禁止直接依赖任何 SDK 或具体 adapter。
 *
 * 背景：D122 端口-适配器架构要求 uikit-im 只面向中立契约（@easemob/uikit-sdk-contract），
 * 不能 import SDK 本体（easemob-websdk）也不能静态绑定某个 adapter（websdk5/webim4）。
 * 切 SDK 时只换注入的 adapter，uikit-im dist 不重发。
 *
 * 规则：
 *   1. 禁止 import ... from 'easemob-websdk'（值 + 类型）
 *   2. 禁止 import ... from '@easemob/uikit-sdk-websdk5' / '@easemob/uikit-sdk-webim4'（值 + 类型）
 *   3. 仅以下白名单文件例外：
 *        - src/websdk5.ts     子路径入口，负责默认 adapter 自注册
 *        - src/sdk/index.ts   公开类型再导出（仅 export type）
 *   4. import type 也禁止（除白名单外），防止类型真相源漂移
 *
 * 用法：node scripts/check-sdk-isolation.mjs（uikit-im build 前置，漂移即非零退出）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scanDirs = ['src']
const extensions = ['.ts', '.vue', '.mjs', '.js']

// 白名单：这些文件允许静态绑定 adapter / 再导出 adapter 类型
const allowlist = new Set([
  'src/websdk5.ts',
  'src/sdk/index.ts',
])

// 禁止的裸模块说明符
const forbiddenSpecifiers = [
  'easemob-websdk',
  '@easemob/uikit-sdk-websdk5',
  '@easemob/uikit-sdk-webim4',
]

// import type / 静态 import / 动态 import 三种形态
function makeImportTypePattern(specifier) {
  return new RegExp(`import\\s+type\\s+[^;]*?from\\s+['"]${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g')
}
function makeValueImportPattern(specifier) {
  return new RegExp(`(?:from\\s+|import\\s*\\()\\s*['"]${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`, 'g')
}

function collectFiles(dir) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full))
    }
    else if (extensions.some(ext => entry.endsWith(ext))) {
      files.push(full)
    }
  }
  return files
}

const violations = []
for (const dir of scanDirs) {
  const base = join(pkgRoot, dir)
  if (!statSync(base).isDirectory()) continue
  for (const file of collectFiles(base)) {
    const relativePath = file.replace(pkgRoot + '/', '')
    if (allowlist.has(relativePath)) continue

    const src = readFileSync(file, 'utf8')
    // 去掉注释，避免注释里的包名提及误报
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

    for (const specifier of forbiddenSpecifiers) {
      // import type 也要报
      const typePattern = makeImportTypePattern(specifier)
      const typeMatches = code.match(typePattern) || []
      for (let i = 0; i < typeMatches.length; i++) {
        violations.push(`${relativePath}: import type from '${specifier}'（禁用）`)
      }

      // 值 import（先擦掉 import type 再跑）
      const codeWithoutTypeImports = code.replace(/import\s+type\s+[^;]*?from\s+['"][^'"]+['"];?/g, '')
      const valuePattern = makeValueImportPattern(specifier)
      const valueMatches = codeWithoutTypeImports.match(valuePattern) || []
      for (let i = 0; i < valueMatches.length; i++) {
        violations.push(`${relativePath}: import from '${specifier}'（禁用）`)
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\n[check-sdk-isolation] uikit-im SDK 隔离违规 ${violations.length} 处（禁止直接依赖 SDK 或具体 adapter）：`)
  violations.forEach(v => console.error(`  - ${v}`))
  console.error('\nuikit-im 只应依赖 @easemob/uikit-sdk-contract；具体 adapter 由下游注入或经白名单子路径入口注册。\n')
  process.exit(1)
}
console.log('✓ uikit-im SDK 隔离校验通过（无 SDK / adapter 直接依赖）')
