// 校验 dist/theme/index.css 里的 scoped data-v hash 均能在运行时 JS 产物中找到，
// 防止「theme 内联了其他包（core）构建期的 scoped 样式，而对方重构建后 scopeId 漂移」
// 导致的组件样式静默失效（典型症状：按钮等 core 组件在生产构建中失去全部样式）。
//
// 背景：uikit-im / uikit-chatroom 的 theme 经 vite alias 内联 core dist 的 theme CSS，
// scoped 选择器的 data-v hash 固化在本包构建期；core 侧任何 SFC 源码改动
// （plugin-vue 4.x 生产 hash = hash(路径 + 源码)）都会生成新 hash，使已发布的
// im theme 里的对应选择器失配。core/im 虽已统一 componentIdGenerator: 'filepath'
// （hash 只由路径决定），本守卫作为兜底：一旦发现死 hash 立即非零退出，拒绝产出坏包。
//
// 用法：node check-theme-scope-ids.mjs <pkgRoot>
//   <pkgRoot> 待校验包根目录（如 uikit-im 传 '.'，core 自身传 '.'）。
//   CSS 取 <pkgRoot>/dist/theme/index.css；JS 取本包 package.json module 指向的
//   dist JS，外加从 <pkgRoot> 解析到的 @easemob/uikit-core 的 dist JS（若可解析）。

import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'

const pkgRoot = resolve(process.argv[2] || '.')
const require = createRequire(join(pkgRoot, 'package.json'))

/** 读取包 dist JS（ESM 产物）文本；找不到返回 null */
function readDistJs(pkgJsonPath) {
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'))
  const entry = pkg.module || pkg.exports?.['.']?.import
  if (!entry)
    return null
  const file = resolve(dirname(pkgJsonPath), entry)
  return existsSync(file) ? readFileSync(file, 'utf-8') : null
}

// 1. 收集待校验的 CSS hash → 示例选择器
const themeCssPath = join(pkgRoot, 'dist/theme/index.css')
if (!existsSync(themeCssPath)) {
  console.error(`[check-theme-scope-ids] 未找到 ${themeCssPath}，请先执行主构建（vite build）`)
  process.exit(1)
}
const css = readFileSync(themeCssPath, 'utf-8')
const hashSelectors = new Map()
for (const match of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)\[data-v-([0-9a-f]{8})\]/g)) {
  const [, className, hash] = match
  if (!hashSelectors.has(hash))
    hashSelectors.set(hash, className)
}

// 2. 收集运行时 JS 中真实存在的 hash
const jsSources = [readDistJs(join(pkgRoot, 'package.json'))]
try {
  // 注意：经 exports 解析包根（package.json 子路径未被 exports 暴露，不能直接 resolve）
  let dir = dirname(require.resolve('@easemob/uikit-core'))
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'package.json'))) {
      const coreJs = readDistJs(join(dir, 'package.json'))
      if (coreJs)
        jsSources.push(coreJs)
      break
    }
    dir = dirname(dir)
  }
}
catch {
  // 不依赖 core 的包直接跳过（如 core 自身）
}
const jsHashes = new Set()
for (const js of jsSources) {
  if (!js)
    continue
  for (const match of js.matchAll(/data-v-([0-9a-f]{8})/g))
    jsHashes.add(match[1])
}

// 3. 死 hash → 报错退出
const dead = [...hashSelectors.keys()].filter(hash => !jsHashes.has(hash))
if (dead.length > 0) {
  console.error('[check-theme-scope-ids] theme CSS 存在运行时无法匹配的 scoped hash（组件将失去样式）：')
  for (const hash of dead)
    console.error(`  data-v-${hash}  如 .${hashSelectors.get(hash)}[data-v-${hash}]`)
  console.error('通常是 theme 内联的 core dist 已过期：请按 core → uikit-im 顺序重新构建后再打包。')
  process.exit(1)
}

console.log(`[check-theme-scope-ids] OK：${hashSelectors.size} 个 scoped hash 均有运行时匹配（${themeCssPath}）`)
