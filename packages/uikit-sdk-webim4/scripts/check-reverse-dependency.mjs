/**
 * 校验 @easemob-community/uikit-sdk-webim4 的反向依赖隔离。
 *
 * 背景：adapter 是中立契约的实现层，必须只依赖契约（@easemob-community/uikit-sdk-contract）
 * 和具体 SDK（easemob-websdk），禁止反向依赖上层 UI 包（uikit-im / uikit-core / uikit-chatroom）。
 * 否则切 SDK 时 UI 产物会被 adapter 反向拉回来，摇树失效，违背 D122 架构。
 *
 * 规则：
 *   1. 禁止 import ... from '@easemob-community/uikit-im' / '@easemob-community/uikit-core' / '@easemob-community/uikit-chatroom'（值 + 类型）
 *   2. 禁止动态 import 上述包
 *   3. 禁止相对路径越界引用到 uikit-im / uikit-core / uikit-chatroom 源码
 *
 * 用法：node scripts/check-reverse-dependency.mjs（adapter build 前置，漂移即非零退出）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scanDirs = ['src']
const extensions = ['.ts', '.vue', '.mjs', '.js']

// 禁止反向依赖的场景包说明符（含子路径）
const forbiddenSpecifiers = [
  '@easemob-community/uikit-im',
  '@easemob-community/uikit-core',
  '@easemob-community/uikit-chatroom',
]

const importTypePatterns = forbiddenSpecifiers.map(specifier => ({
  specifier,
  pattern: new RegExp(`import\\s+type\\s+[^;]*?from\\s+['"]${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^'"]*)['"]`, 'g'),
}))

const valueImportPatterns = forbiddenSpecifiers.map(specifier => ({
  specifier,
  pattern: new RegExp(`(?:from\\s+|import\\s*\\()\\s*['"]${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[^'"]*)['"]`, 'g'),
}))

// 相对路径越界到场景包源码
const relativeEscapePattern = /(?:from\s+|import\s*\()\s*['"](?:\.\.\/)+uikit-(?:im|core|chatroom)(?:[^'"]*)['"]/g

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
    const src = readFileSync(file, 'utf8')
    // 去掉注释，避免注释里的包名提及误报
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')

    for (const { specifier, pattern } of importTypePatterns) {
      const matches = code.match(pattern) || []
      for (let i = 0; i < matches.length; i++) {
        violations.push(`${relativePath}: import type from '${specifier}'（adapter 禁止反向依赖 UI 层）`)
      }
    }

    const codeWithoutTypeImports = code.replace(/import\s+type\s+[^;]*?from\s+['"][^'"]+['"];?/g, '')

    for (const { specifier, pattern } of valueImportPatterns) {
      const matches = codeWithoutTypeImports.match(pattern) || []
      for (let i = 0; i < matches.length; i++) {
        violations.push(`${relativePath}: import from '${specifier}'（adapter 禁止反向依赖 UI 层）`)
      }
    }

    const relativeMatches = codeWithoutTypeImports.match(relativeEscapePattern) || []
    for (let i = 0; i < relativeMatches.length; i++) {
      violations.push(`${relativePath}: 相对路径越界引用场景包源码（adapter 禁止反向依赖 UI 层）`)
    }
  }
}

if (violations.length > 0) {
  console.error(`\n[check-reverse-dependency] adapter 反向依赖违规 ${violations.length} 处：禁止依赖 uikit-im / uikit-core / uikit-chatroom：`)
  violations.forEach(v => console.error(`  - ${v}`))
  console.error('\nadapter 只应依赖 @easemob-community/uikit-sdk-contract 与具体 SDK；UI 层由下游注入。\n')
  process.exit(1)
}
console.log('✓ adapter 反向依赖校验通过（无 UI 层反向依赖）')
