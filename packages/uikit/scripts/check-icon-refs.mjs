/**
 * check-icon-refs.mjs
 *
 * 构建期校验：扫描 packages/uikit/src 下所有 .vue / .ts（含 *.story.vue，它们也真实渲染），
 * 提取 EmIcon 的 name 引用（模板 name="分类/图标名"、:name="'...'"）以及 TS 中的
 * icon: '...' 等图标名字面量，与 src/assets/icons 下实际存在的 SVG 文件比对。
 * 有缺失引用时列出清单并以非零码退出，避免图标拼错/删漏后静默不渲染。
 *
 * 识别方式：匹配所有形如 '分类/图标名' 的字符串字面量，且「分类」必须属于
 * assets/icons 下真实存在的分类目录，因此不会误报 'text/plain'、模块路径等无关字符串。
 *
 * 已知局限：动态拼接的 name（如 `icon: 'actions/' + type`）无法静态扫描，
 * 依赖 code review 与运行期 EmIcon 的 miss warn 兜底。
 *
 * 执行方法：cd packages/uikit && pnpm run icons:check
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '..')
const srcDir = join(pkgRoot, 'src')
const iconsDir = join(srcDir, 'assets/icons')

/** 递归收集目录下指定扩展名的文件 */
function collectFiles(dir, exts) {
  const files = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full, exts))
    } else if (exts.some((ext) => entry.endsWith(ext))) {
      files.push(full)
    }
  }
  return files
}

/** icons 分类目录（第一级子目录） */
const categories = readdirSync(iconsDir).filter((entry) =>
  statSync(join(iconsDir, entry)).isDirectory()
)
if (categories.length === 0) {
  console.error('未找到图标分类目录: src/assets/icons')
  process.exit(1)
}

/** 实际存在的图标 name 集合（"分类/图标名"） */
const existingIcons = new Set(
  collectFiles(iconsDir, ['.svg']).map((full) =>
    full
      .slice(iconsDir.length + 1)
      .replace(/\.svg$/, '')
      .split('\\')
      .join('/')
  )
)

/** 匹配 quoted 的 "分类/图标名" 字面量，分类限定为真实存在的目录名 */
const categoryGroup = categories.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
const refPattern = new RegExp(`['"]((?:${categoryGroup})/[A-Za-z0-9_@+.\\-]+)['"]`, 'g')

const sourceFiles = collectFiles(srcDir, ['.vue', '.ts']).filter((f) => !f.startsWith(iconsDir))

/** name -> 引用位置列表 */
const refs = new Map()
for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8')
  for (const match of content.matchAll(refPattern)) {
    const name = match[1]
    if (!refs.has(name)) refs.set(name, [])
    const line = content.slice(0, match.index).split('\n').length
    refs.get(name).push(`${file.slice(pkgRoot.length + 1)}:${line}`)
  }
}

const missing = [...refs.entries()].filter(([name]) => !existingIcons.has(name))

console.log(`扫描 ${sourceFiles.length} 个源文件，命中 ${refs.size} 个图标引用，图标库共 ${existingIcons.size} 个 SVG。`)

if (missing.length > 0) {
  console.error(`\n发现 ${missing.length} 个缺失的图标引用：`)
  for (const [name, locations] of missing) {
    console.error(`  ✗ ${name}`)
    locations.forEach((loc) => console.error(`      ${loc}`))
  }
  console.error('\n请在 src/assets/icons 下补齐对应 SVG，或修正引用。')
  process.exit(1)
}

console.log('所有图标引用均有对应文件，校验通过。')
