#!/usr/bin/env node
/**
 * flatten-icons.mjs
 *
 * 把 src/assets/icons 下深嵌套的 SVG 图标拍平为 category/name.svg 两级结构，
 * 并把非 Icon 组件消费的 PNG 位图迁到 src/assets/images/。
 *
 * 默认 dry-run，打印迁移清单；加 --apply 才真实执行。
 *
 * 用法：
 *   cd packages/uikit-im && node scripts/flatten-icons.mjs
 *   cd packages/uikit-im && node scripts/flatten-icons.mjs --apply
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PKG_ROOT = resolve(__dirname, '..')
const REPO_ROOT = resolve(PKG_ROOT, '../..')
const ASSETS = join(PKG_ROOT, 'src/assets')
const ICONS_DIR = join(ASSETS, 'icons')

// ============================================================
// 1. 显式 SVG 迁移映射（old -> new，均相对于 src/assets）
// ============================================================
const SVG_MOVE_MAP = {
  // group-manager -> group，拍平
  'icons/group-manager/icon/filled/rect/idphoto.svg': 'icons/group/idphoto-filled.svg',
  'icons/group-manager/icon/stroked/board.svg': 'icons/group/board.svg',
  'icons/group-manager/icon/stroked/bubble/slash.svg': 'icons/group/bubble-slash.svg',
  'icons/group-manager/icon/stroked/circle/clock.svg': 'icons/group/clock.svg',
  'icons/group-manager/icon/stroked/crown.svg': 'icons/group/crown.svg',
  'icons/group-manager/icon/stroked/doc.svg': 'icons/group/doc.svg',
  'icons/group-manager/icon/stroked/rect/idphoto.svg': 'icons/group/idphoto.svg',
  'icons/group-manager/icon/stroked/rect/personnclock.svg': 'icons/group/person-clock.svg',
  'icons/group-manager/icon/stroked/shield/person.svg': 'icons/group/shield-person.svg',

  // message-status 拍平并语义化
  'icons/message-status/stroked/circle/bang.svg': 'icons/message-status/bang.svg',
  'icons/message-status/stroked/circle/checked.svg': 'icons/message-status/checked.svg',
  'icons/message-status/stroked/circle/empty.svg': 'icons/message-status/empty.svg',
  'icons/message-status/stroked/loading/arc/normal.svg': 'icons/message-status/loading.svg',
  'icons/message-status/stroked/ringarrow/ccw.svg': 'icons/message-status/retry.svg',

  // 在线状态图标独立为 presence 分类
  'icons/status/icon/filled/circle/clock.svg': 'icons/presence/clock.svg',
  'icons/status/icon/filled/circle/empty.svg': 'icons/presence/empty.svg',
  'icons/status/icon/filled/circle/equals.svg': 'icons/presence/equals.svg',
  'icons/status/icon/filled/circle/minus.svg': 'icons/presence/minus.svg',
  'icons/status/icon/filled/circle/star.svg': 'icons/presence/star.svg',

  // conversation 拍平
  'icons/conversation/stroked/at.svg': 'icons/conversation/at.svg',
  'icons/conversation/stroked/horizontal.svg': 'icons/conversation/horizontal.svg',
  'icons/conversation/stroked/rect_notched/pen.svg': 'icons/conversation/draft.svg',

  // rect 分类仅剩一个文件，实际为“+”，并入 actions
  'icons/rect/minus.svg': 'icons/actions/plus_in_rectangle.svg',
}

// ============================================================
// 2. PNG 迁出规则（按目录或单文件）
// ============================================================
const PNG_MOVE_RULES = [
  { from: 'icons/status', to: 'images/presence' },
  { from: 'icons/emojis-reactions', to: 'images/reactions' },
  { from: 'icons/gifts', to: 'images/gifts' },
  { from: 'icons/misc/callkit_bg.png', to: 'images/misc/callkit_bg.png' },
  { from: 'icons/misc/img_xmark.png', to: 'images/misc/img_xmark.png' },
]

const apply = process.argv.includes('--apply')

function errorExit(msg) {
  console.error(msg)
  process.exit(1)
}

// ============================================================
// 工具函数
// ============================================================
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function walk(dir, exts, result = []) {
  if (!existsSync(dir)) return result
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walk(full, exts, result)
    } else if (exts.some((ext) => entry.endsWith(ext))) {
      result.push(full)
    }
  }
  return result
}

function removeEmptyDirs(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) removeEmptyDirs(full)
  }
  try {
    rmdirSync(dir)
    console.log(`  删除空目录: ${relative(PKG_ROOT, dir)}`)
  } catch {
    // 非空则忽略
  }
}

// ============================================================
// 3. 构建完整 MOVE_MAP（SVG 显式 + PNG 自动发现）
// ============================================================
const MOVE_MAP = { ...SVG_MOVE_MAP }

for (const rule of PNG_MOVE_RULES) {
  const fromAbs = join(ASSETS, rule.from)
  if (!existsSync(fromAbs)) continue
  const st = statSync(fromAbs)
  if (st.isFile()) {
    MOVE_MAP[rule.from] = rule.to
    continue
  }
  for (const file of readdirSync(fromAbs)) {
    if (!file.endsWith('.png')) continue
    MOVE_MAP[`${rule.from}/${file}`] = `${rule.to}/${file}`
  }
}

// 冲突检查：不同旧文件不能迁到同一新路径
const targetToSources = new Map()
for (const [oldPath, newPath] of Object.entries(MOVE_MAP)) {
  if (!targetToSources.has(newPath)) targetToSources.set(newPath, [])
  targetToSources.get(newPath).push(oldPath)
}
const collisions = [...targetToSources.entries()].filter(([, sources]) => sources.length > 1)
if (collisions.length > 0) {
  console.error('发现迁移目标冲突：')
  for (const [target, sources] of collisions) {
    console.error(`  ${target} 来自:`)
    sources.forEach((s) => console.error(`    - ${s}`))
  }
  errorExit('请先解决冲突再执行。')
}

// ============================================================
// 4. dry-run / 执行迁移
// ============================================================
console.log(`=== 图标目录拍平 (${apply ? 'apply 模式' : 'dry-run 模式'}) ===\n`)
console.log(`待迁移文件数: ${Object.keys(MOVE_MAP).length}\n`)

for (const [oldRel, newRel] of Object.entries(MOVE_MAP)) {
  const oldAbs = join(ASSETS, oldRel)
  const newAbs = join(ASSETS, newRel)
  console.log(`${oldRel} -> ${newRel}`)
  if (!apply) continue

  if (!existsSync(oldAbs) && existsSync(newAbs)) {
    console.log(`  已迁移，跳过`)
    continue
  }
  if (!existsSync(oldAbs)) {
    errorExit(`  源文件不存在: ${oldAbs}`)
  }
  if (existsSync(newAbs)) {
    errorExit(`  目标已存在: ${newAbs}`)
  }

  mkdirSync(dirname(newAbs), { recursive: true })
  execSync(`git mv "${oldAbs}" "${newAbs}"`, { cwd: PKG_ROOT, stdio: 'inherit' })
}

if (apply) {
  console.log('\n清理空目录...')
  removeEmptyDirs(ICONS_DIR)
  console.log()
}

// ============================================================
// 5. 图标名替换映射（仅 SVG，供源码/文档引用替换）
// ============================================================
const iconNameMap = {}
for (const [oldRel, newRel] of Object.entries(SVG_MOVE_MAP)) {
  const oldName = oldRel.replace(/^icons\//, '').replace(/\.svg$/, '')
  const newName = newRel.replace(/^icons\//, '').replace(/\.svg$/, '')
  iconNameMap[oldName] = newName
}

// 按长度降序，避免潜在子串问题（虽然带引号匹配已很安全）
const iconNameEntries = Object.entries(iconNameMap).sort((a, b) => b[0].length - a[0].length)

// ============================================================
// 6. 引用替换
// ============================================================
const sourceFiles = [
  ...walk(join(PKG_ROOT, 'src'), ['.vue', '.ts', '.tsx', '.js', '.jsx', '.mjs']),
  ...walk(join(PKG_ROOT, 'scripts'), ['.mjs', '.js']),
  ...walk(join(PKG_ROOT, 'docs'), ['.md', '.json']),
]

// repo 级文档与 skill（只扫根目录文件 + .agent/skills，不递归 tmp/线性/面性等）
const repoDocFiles = [
  ...walk(join(REPO_ROOT, '.agent/skills'), ['.md']),
  ...readdirSync(REPO_ROOT)
    .map((f) => join(REPO_ROOT, f))
    .filter((f) => statSync(f).isFile() && (f.endsWith('.md') || f.endsWith('.json'))),
]

const allRefFiles = [...new Set([...sourceFiles, ...repoDocFiles])].filter((f) => f !== __filename)

let changedFiles = 0
let totalReplacements = 0

for (const file of allRefFiles) {
  let content = readFileSync(file, 'utf8')
  let replaced = 0

  // 6.1 图标名替换（精确匹配带引号）
  for (const [oldName, newName] of iconNameEntries) {
    const re = new RegExp(`(['"])${escapeRegExp(oldName)}\\1`, 'g')
    content = content.replace(re, (m, quote) => {
      replaced++
      return `${quote}${newName}${quote}`
    })
  }

  // 6.2 文件路径替换（针对文档/注释/catalog）
  for (const [oldRel, newRel] of Object.entries(MOVE_MAP)) {
    const patterns = [
      new RegExp(`src/assets/${escapeRegExp(oldRel)}`, 'g'),
      new RegExp(`(?<=^|[^-\\w./])${escapeRegExp(oldRel)}(?=[^-\\w./]|$)`, 'g'),
    ]
    for (const re of patterns) {
      content = content.replace(re, (m) => {
        if (m.startsWith('src/assets/')) {
          replaced++
          return `src/assets/${newRel}`
        }
        replaced++
        return newRel
      })
    }
  }

  if (replaced > 0) {
    totalReplacements += replaced
    changedFiles++
    if (apply) writeFileSync(file, content, 'utf8')
    console.log(`${apply ? '已更新' : '待更新'} ${relative(PKG_ROOT, file)} (${replaced} 处)`)
  }
}

console.log(`\n引用替换: ${changedFiles} 个文件，共 ${totalReplacements} 处`)

// ============================================================
// 7. catalog.json 特化处理
// ============================================================
const catalogFiles = walk(join(PKG_ROOT, 'src'), ['catalog.json'])
let catalogChanged = 0

for (const file of catalogFiles) {
  let changed = false
  const catalog = JSON.parse(readFileSync(file, 'utf8'))

  function updateEntry(entry) {
    if (!entry || !entry.mapping) return
    for (const key of ['mapping', 'alternatives']) {
      const list = key === 'mapping' ? [entry.mapping] : (entry[key] || [])
      for (const item of list) {
        if (!item || !item.category || !item.file) continue
        const oldRel = `icons/${item.category}/${item.file}`
        const newRel = MOVE_MAP[oldRel]
        if (!newRel) continue
        const parts = newRel.split('/')
        // newRel 形如 icons/group/board.svg 或 images/presence/Online.png
        if (parts[0] === 'icons') {
          item.category = parts[1]
          item.file = parts.slice(2).join('/')
        } else if (parts[0] === 'images') {
          item.category = `images/${parts[1]}`
          item.file = parts.slice(2).join('/')
        }
        changed = true
      }
    }
  }

  function traverse(node) {
    if (Array.isArray(node)) {
      node.forEach(traverse)
    } else if (node && typeof node === 'object') {
      updateEntry(node)
      Object.values(node).forEach(traverse)
    }
  }

  traverse(catalog)
  if (changed) {
    catalogChanged++
    if (apply) writeFileSync(file, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
    console.log(`${apply ? '已更新' : '待更新'} catalog: ${relative(PKG_ROOT, file)}`)
  }
}

console.log(`catalog.json 更新: ${catalogChanged} 个`)

// ============================================================
// 8. 收尾校验
// ============================================================
if (apply) {
  console.log('\n运行 check-icon-refs...')
  try {
    execSync('node scripts/check-icon-refs.mjs', { cwd: PKG_ROOT, stdio: 'inherit' })
  } catch {
    errorExit('图标引用校验失败，请检查上述缺失项。')
  }
  console.log('\n迁移完成。建议继续执行：')
  console.log('  pnpm -F @easemob/uikit-im exec vue-tsc --noEmit')
  console.log('  pnpm -F @easemob/uikit-im build')
} else {
  console.log('\n本次为 dry-run，未修改任何文件。加 --apply 执行真实迁移。')
}
