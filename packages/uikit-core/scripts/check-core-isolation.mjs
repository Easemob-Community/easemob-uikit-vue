/**
 * 校验 @easemob/uikit-core 的包隔离：core 内禁止依赖任何场景包。
 *
 * 背景：三包架构（docs/CHATROOM-UIKIT-DESIGN.md / TECH-DEBT D97）约定依赖方向
 * 只能是 场景包 → core；core 一旦反向依赖场景包（uikit-im / uikit-chatroom），
 * 聊天室等场景 bundle 会把单群聊代码全链进来，抽核失效。
 * 判定归属（新功能放 core 还是场景包）见 skill `uikit-package-boundary`。
 *
 * 校验范围：core 的 src/scripts 下全部 .ts/.vue/.mjs/.js 文件。
 * 违规模式：
 *   1. import ... from '@easemob/uikit-im' / '@easemob/uikit-chatroom'
 *   2. import('@easemob/uikit-im') 等动态 import
 *   3. 相对路径越界引用（../uikit-im、../../uikit-im 等）
 * 注释/文档字符串里的包名提及不算违规（如「场景包（uikit-im 等）」说明文字）。
 *
 * 用法：node scripts/check-core-isolation.mjs（core build 前置，漂移即非零退出）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scanDirs = ['src', 'scripts']
const extensions = ['.ts', '.vue', '.mjs', '.js']

// 静态 import / 动态 import / 相对越界三种形态
const importPatterns = [
  /(?:from\s+|import\s*\()\s*['"]@easemob\/uikit-(?:im|chatroom)(?:[^'"]*)['"]/,
  /(?:from\s+|import\s*\()\s*['"](?:\.\.\/)+uikit-(?:im|chatroom)(?:[^'"]*)['"]/,
]

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
    const src = readFileSync(file, 'utf8')
    // 去掉行注释与块注释后检查，避免注释里的包名提及误报
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    for (const pattern of importPatterns) {
      if (pattern.test(code)) {
        violations.push(`${file.replace(pkgRoot + '/', '')}: ${pattern}`)
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\n[check-core-isolation] core 包隔离违规 ${violations.length} 处（core 禁止依赖场景包）：`)
  violations.forEach(v => console.error(`  - ${v}`))
  console.error('\n新功能归属判定见 skill uikit-package-boundary；core 只允许被场景包依赖，禁止反向 import。\n')
  process.exit(1)
}
console.log('✓ core 包隔离校验通过（无场景包依赖）')
