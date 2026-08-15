/**
 * 校验 @easemob/uikit-core 的引擎层隔离：sdk/constants/utils 禁止值依赖 vue 生态。
 *
 * 背景：core 内部分层——引擎层（sdk/、constants/、utils/）保持纯 TS 运行时（零
 * vue/pinia/@vueuse），供未来跨端 uikit（uniapp / 微信小程序等）复用；Vue 适配层
 * （store/、composables/、components/、containers/、locale/use-locale.ts）依赖
 * vue/pinia。ESM 依赖是模块级的：引擎层一旦值 import vue 生态或 Vue 层模块，
 * 跨端复用的运行时承诺即被破坏。
 *
 * 规则：
 *   1. 禁止 import ... from 'vue' / 'pinia' / '@vueuse/*'（含动态 import）；
 *   2. 禁止相对路径值 import 指向 Vue 层模块（store/、composables/、components/、
 *      containers/、locale/ 除 locale/messages 外——locale 纯逻辑在 messages.ts）；
 *   3. `import type`（运行时擦除）放行；引擎层对 Vue 层 store/composables 的类型级
 *      引用属已知漂移（TECH-DEBT.md D100：domain 类型接口化），不在本门禁范围；
 *   4. DOM API 依赖（utils/download.ts、utils/log-store.ts）属平台适配点，
 *      不在此门禁范围（跨端时由各端自建等价实现）。
 *
 * 用法：node scripts/check-engine-isolation.mjs（core build 前置，漂移即非零退出）
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// 引擎层目录（新增目录需同步本清单，勿把 Vue 层目录加进来）
const scanDirs = ['src/sdk', 'src/constants', 'src/utils']
const extensions = ['.ts', '.vue', '.mjs', '.js']

// 静态 import / 动态 import 两种形态
const importPatterns = [
  // vue 生态裸 specifier
  /(?:from\s+|import\s*\()\s*['"](?:vue|pinia|@vueuse(?:\/[^'"]*)?)['"]/,
  // 相对路径进入 Vue 层模块（locale/messages 为纯 TS，放行）
  /(?:from\s+|import\s*\()\s*['"](?:\.\.\/)+(?:store|composables|components|containers|locale(?!\/messages)(?:\/[^'"]*)?)['"]/,
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
    // 去掉注释，避免注释里的 vue/pinia 提及误报
    let code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    // import type 整行运行时擦除，放行（类型级耦合见 TECH-DEBT.md D100）
    code = code.replace(/import\s+type\s+[^;]*?from\s+['"][^'"]+['"];?/g, '')
    for (const pattern of importPatterns) {
      if (pattern.test(code)) {
        violations.push(`${file.replace(pkgRoot + '/', '')}: ${pattern}`)
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`\n[check-engine-isolation] core 引擎层隔离违规 ${violations.length} 处（sdk/constants/utils 禁止值依赖 vue/pinia/@vueuse 及 Vue 层模块）：`)
  violations.forEach(v => console.error(`  - ${v}`))
  console.error('\n引擎层保持纯 TS 是为了未来跨端 uikit（uniapp/小程序等）可复用；locale 翻译请走 locale/messages（纯逻辑），响应式请走 use-locale。\n')
  process.exit(1)
}
console.log('✓ core 引擎层隔离校验通过（sdk/constants/utils 无 vue/pinia/@vueuse 值依赖）')
