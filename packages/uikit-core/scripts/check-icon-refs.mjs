/**
 * check-icon-refs.mjs
 *
 * 构建期校验：扫描指定包源码下所有 .vue / .ts（含 *.story.vue），
 * 提取图标 name 引用，与一个或多个图标库目录下实际存在的 SVG 文件比对。
 * 有缺失引用时列出清单并以非零码退出，避免图标拼错/删漏后静默不渲染。
 *
 * 参数：
 *   node check-icon-refs.mjs [scanPkgRoot] [iconsDir...]
 *   - scanPkgRoot：待扫描包根（默认脚本所属包）
 *   - iconsDir...：一个或多个图标库目录（默认 <scanPkgRoot>/src/assets/icons 与
 *     <scanPkgRoot>/src/assets/icons-v2；若 scanPkgRoot 无 src 目录，则回退到
 *     <scanPkgRoot>/assets/icons 与 <scanPkgRoot>/assets/icons-v2）
 *
 * 扫描策略：
 * 1. 收集所有图标目录下的有效 name（相对路径去 .svg）。
 * 2. 收集顶层目录名与顶层文件名，用于推断源码中哪些字符串可能是图标引用：
 *    - 含 / 的路径（如 `chevron/down`、`rect/hanzi/slash`）
 *    - 在 name/icon/*-icon 上下文中出现的顶层文件名（如 `name="trash"`、
 *      `icon: 'plus'`、`:error-icon="'status/info'"`）
 * 3. 命中但不在有效 name 集合中的引用视为缺失。
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(process.argv[2] ?? join(__dirname, '..'))
const srcDir = existsSync(join(pkgRoot, 'src')) ? join(pkgRoot, 'src') : pkgRoot

const defaultIconDirs = [
  join(srcDir, 'assets/icons'),
  join(srcDir, 'assets/icons-v2'),
]

const iconDirs = process.argv.slice(3)
  .map(p => resolve(p))
  .filter((p, i, arr) => existsSync(p) && arr.indexOf(p) === i)

if (iconDirs.length === 0) {
  for (const d of defaultIconDirs) {
    if (existsSync(d))
      iconDirs.push(d)
  }
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.vitepress', 'public', '.git', 'coverage', 'tmp'])

/** 递归收集目录下指定扩展名的文件 */
function collectFiles(dir, exts) {
  const files = []
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry))
      continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectFiles(full, exts))
    }
    else if (exts.some(ext => entry.endsWith(ext))) {
      files.push(full)
    }
  }
  return files
}

/** 全部有效图标 name */
const existingIcons = new Set()
/** 顶层目录 = 分类前缀 */
const topLevelDirs = new Set()
/** 顶层文件 = 根级图标名 */
const topLevelFiles = new Set()

for (const iconsDir of iconDirs) {
  for (const entry of readdirSync(iconsDir)) {
    const full = join(iconsDir, entry)
    if (statSync(full).isDirectory()) {
      topLevelDirs.add(entry)
    }
    else if (entry.endsWith('.svg')) {
      topLevelFiles.add(entry.replace(/\.svg$/, ''))
    }
  }
  for (const full of collectFiles(iconsDir, ['.svg'])) {
    const name = full
      .slice(iconsDir.length + 1)
      .replace(/\.svg$/, '')
      .split('\\')
      .join('/')
    existingIcons.add(name)
  }
}

if (existingIcons.size === 0) {
  console.error(`未在以下目录找到图标：${iconDirs.join(', ')}`)
  process.exit(1)
}

/** 含 / 的路径模式：category/... */
const categoryGroup = [...topLevelDirs]
  .map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')

const broadPattern = categoryGroup.length
  ? new RegExp(`['"]((?:${categoryGroup})/[A-Za-z0-9_@+.\\\-/]+)['"]`, 'g')
  : null

/** 顶层文件在图标上下文中的模式：name/icon/*-icon = "file" */
const rootFileGroup = [...topLevelFiles]
  .map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')

const rootNamePattern = rootFileGroup.length
  ? new RegExp(`\\b(?:[A-Za-z0-9-]*-)?(?:name|icon)\\s*[:=]\\s*["']((?:${rootFileGroup}))["']`, 'g')
  : null

const sourceFiles = collectFiles(srcDir, ['.vue', '.ts']).filter(f =>
  !iconDirs.some(dir => f.startsWith(dir)),
)

/** name -> 引用位置列表 */
const refs = new Map()

function addRef(name, file, index, content) {
  if (!refs.has(name))
    refs.set(name, [])
  const line = content.slice(0, index).split('\n').length
  refs.get(name).push(`${file.slice(pkgRoot.length + 1)}:${line}`)
}

for (const file of sourceFiles) {
  const content = readFileSync(file, 'utf8')
  if (broadPattern) {
    for (const match of content.matchAll(broadPattern)) {
      addRef(match[1], file, match.index, content)
    }
  }
  if (rootNamePattern) {
    for (const match of content.matchAll(rootNamePattern)) {
      addRef(match[1], file, match.index, content)
    }
  }
}

const missing = [...refs.entries()].filter(([name]) => !existingIcons.has(name))

console.log(`扫描 ${sourceFiles.length} 个源文件，命中 ${refs.size} 个图标引用，图标库共 ${existingIcons.size} 个 SVG。`)

if (missing.length > 0) {
  console.error(`\n发现 ${missing.length} 个缺失的图标引用：`)
  for (const [name, locations] of missing) {
    console.error(`  ✗ ${name}`)
    locations.forEach(loc => console.error(`      ${loc}`))
  }
  console.error('\n请在图标库目录下补齐对应 SVG，或修正引用。')
  process.exit(1)
}

console.log('所有图标引用均有对应文件，校验通过。')
