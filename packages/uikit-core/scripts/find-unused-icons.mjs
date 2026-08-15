/**
 * find-unused-icons.mjs
 *
 * 扫描 monorepo 源码下的图标引用，与 src/assets/icons 里的 SVG 文件做对比，
 * 输出：
 *   1. 未被任何源码引用的 SVG 图标（可删除候选）
 *   2. 引用存在但文件缺失的图标（供补齐）
 *   3. 被 Lucide 替换后可能残留的旧图标（同名/近义重复候选）
 *
 * 局限：动态拼接的 name 无法静态识别；删除前请人工复核运行时/配置化引用。
 */

import { existsSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const shouldDelete = process.argv.includes('--delete')

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '..')
const repoRoot = join(pkgRoot, '../..')
// 参数化：argv[2] 可覆盖图标库目录（默认 core 自身 assets/icons）
const iconsDir = process.argv[2] ? resolve(process.argv[2]) : join(pkgRoot, 'src/assets/icons')
// 图标引用为仓级扫描：core / uikit-im / demo 均可能经 EmIcon name 引用图标
const scanDirs = [
  join(pkgRoot, 'src'),
  join(repoRoot, 'packages/uikit-im/src'),
  join(repoRoot, 'apps/demo/src'),
].filter((d) => existsSync(d))

function collectFiles(dir, exts) {
  const files = []
  if (!existsSync(dir)) return files
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

const categories = readdirSync(iconsDir).filter((entry) =>
  statSync(join(iconsDir, entry)).isDirectory()
)

const existingIcons = new Map(
  collectFiles(iconsDir, ['.svg']).map((full) => {
    const rel = full
      .slice(iconsDir.length + 1)
      .replace(/\.svg$/, '')
      .split('\\')
      .join('/')
    return [rel, full]
  })
)

const categoryGroup = categories.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
const refPattern = new RegExp(`['"]((?:${categoryGroup})/[A-Za-z0-9_@+.\\-]+)['"]`, 'g')

const sourceFiles = scanDirs
  .flatMap((d) => collectFiles(d, ['.vue', '.ts']))
  .filter((f) => !f.startsWith(iconsDir))

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
const unused = [...existingIcons.keys()].filter((name) => !refs.has(name))

// 简单重复检测：同一分类下文件名含 "_old" / "_fill" / "_2" 等后缀且存在基础名 Lucide 图标
const dupCandidates = []
for (const name of existingIcons.keys()) {
  const base = name.replace(/\.(svg)$/, '').replace(/(_fill|_2|_old|_alt|_1|_thin|_thick|_circle|_rectangle)$/, '')
  if (base !== name && existingIcons.has(base)) {
    dupCandidates.push({ keep: base, remove: name })
  }
}

console.log(`扫描 ${sourceFiles.length} 个源文件`)
console.log(`图标库共 ${existingIcons.size} 个 SVG`)
console.log(`源码引用到 ${refs.size} 个不同图标`)

if (missing.length > 0) {
  console.error(`\n⚠️  缺失的图标引用（${missing.length} 个）：`)
  for (const [name, locations] of missing) {
    console.error(`  ✗ ${name}`)
    locations.forEach((loc) => console.error(`      ${loc}`))
  }
}

if (unused.length > 0) {
  console.log(`\n🗑️  未被引用的 SVG 图标（${unused.length} 个，删除前请人工复核）：`)
  for (const name of unused.sort()) {
    console.log(`  • ${name}`)
    if (shouldDelete) {
      const full = existingIcons.get(name)
      if (full) {
        unlinkSync(full)
        console.log(`    已删除 ${full.slice(pkgRoot.length + 1)}`)
      }
    }
  }
}

if (dupCandidates.length > 0) {
  console.log(`\n🔁 疑似重复/变体图标（${dupCandidates.length} 对）：`)
  for (const { keep, remove } of dupCandidates) {
    console.log(`  保留 ${keep}，可删 ${remove}`)
  }
}

if (missing.length === 0 && unused.length === 0 && dupCandidates.length === 0) {
  console.log('\n✅ 没有可清理项')
}
