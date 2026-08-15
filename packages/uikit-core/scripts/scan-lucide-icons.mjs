/**
 * scan-lucide-icons.mjs
 *
 * 只读扫描：统计 src/assets/icons/ 下有多少 SVG 仍与 lucide-static 源完全一致，
 * 有多少已被设计师版本替换，有多少是项目自定义/无 Lucide 映射。
 *
 * 运行方法（P1 Step 4 起脚本归 core 维护，argv[2] 可指定包根，默认 core 自身）：
 *   cd packages/uikit-core && node scripts/scan-lucide-icons.mjs
 *
 * 输出：
 *   - 当前总数
 *   - 仍是 Lucide 源的清单
 *   - 已替换为设计师版本的清单
 *   - 非 Lucide / 自定义 / 新增的清单
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(process.argv[2] ?? join(__dirname, '..'))
const iconsDir = join(pkgRoot, 'src/assets/icons')
const lucideDir = join(pkgRoot, 'node_modules/lucide-static/icons')
const vendorScriptPath = join(pkgRoot, 'scripts/vendor-lucide-icons.mjs')

// vendor-lucide-icons.mjs 为一次性导入脚本（未入库）：缺失时退化为「全部视为非 Lucide」
const vendorScript = existsSync(vendorScriptPath) ? readFileSync(vendorScriptPath, 'utf8') : ''
if (!vendorScript)
  console.warn(`未找到 ${vendorScriptPath}，Lucide 映射按空处理（所有图标计入「非 Lucide / 自定义」）。`)

function extractObject(label) {
  const regex = new RegExp(`const ${label} = \\{([\\s\\S]*?)\\n\\}`)
  const m = vendorScript.match(regex)
  if (!m) return {}
  const obj = {}
  const lines = m[1].split('\n')
  for (const line of lines) {
    const cm = line.match(/^\s*['"]([^'"]+)['"]\s*:\s*['"]([^'"]+)['"]/)
    if (cm) obj[cm[1]] = cm[2]
  }
  return obj
}

const ICON_MAP = extractObject('ICON_MAP')
const ADD_ICONS = extractObject('ADD_ICONS')
const ALL_LUCIDE_MAP = { ...ICON_MAP, ...ADD_ICONS }

function collectSvgNames(dir, prefix = '') {
  const names = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      names.push(...collectSvgNames(full, prefix ? `${prefix}/${entry}` : entry))
    } else if (entry.endsWith('.svg')) {
      names.push(prefix ? `${prefix}/${entry.replace(/\.svg$/, '')}` : entry.replace(/\.svg$/, ''))
    }
  }
  return names
}

function normalizeSvg(s) {
  return s.replace(/\s+/g, ' ').replace(/> </g, '><').trim()
}

const allNames = collectSvgNames(iconsDir).sort()
const stillLucide = []
const replaced = []
const nonLucide = []
const missingLucideSource = []

for (const name of allNames) {
  const lucideName = ALL_LUCIDE_MAP[name]
  const currentPath = join(iconsDir, `${name}.svg`)
  const currentRaw = readFileSync(currentPath, 'utf8')

  if (!lucideName) {
    nonLucide.push(name)
    continue
  }

  const lucidePath = join(lucideDir, `${lucideName}.svg`)
  if (!existsSync(lucidePath)) {
    missingLucideSource.push({ name, lucideName })
    continue
  }

  const lucideRaw = readFileSync(lucidePath, 'utf8')
  if (normalizeSvg(currentRaw) === normalizeSvg(lucideRaw)) {
    stillLucide.push({ name, lucideName })
  } else {
    replaced.push({ name, lucideName })
  }
}

console.log(`当前图标库共 ${allNames.length} 个 SVG`)
console.log(`- 仍在沿用 Lucide 源：${stillLucide.length} 个`)
console.log(`- 已替换为设计师版本：${replaced.length} 个`)
console.log(`- 非 Lucide / 自定义 / 新增：${nonLucide.length} 个`)
if (missingLucideSource.length > 0) {
  console.log(`- 映射到 Lucide 但源文件缺失：${missingLucideSource.length} 个`)
}

console.log('\n\n仍是 Lucide 源（建议优先重绘）：')
for (const { name, lucideName } of stillLucide) {
  console.log(`  ${name}\t<= lucide:${lucideName}`)
}

console.log('\n已替换为设计师版本：')
for (const { name, lucideName } of replaced) {
  console.log(`  ${name}\t(原 lucide:${lucideName})`)
}

console.log('\n非 Lucide / 自定义 / 新增：')
for (const name of nonLucide) {
  console.log(`  ${name}`)
}

if (missingLucideSource.length > 0) {
  console.log('\nLucide 源文件缺失：')
  for (const { name, lucideName } of missingLucideSource) {
    console.log(`  ${name} -> lucide:${lucideName} (文件不存在)`)
  }
}
