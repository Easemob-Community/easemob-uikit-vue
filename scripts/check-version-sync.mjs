/**
 * 版本号同步校验（changelog:check）
 *
 * 背景：曾发生文档站 changelog 与根 CHANGELOG.md、package.json 版本号三处脱节
 * （1.5.0/1.5.1 只写进文档站，根 CHANGELOG 停在 1.4.0，package.json 停在 1.3.1）。
 * 现约定单一数据源：根 CHANGELOG.md 唯一维护版本段，文档站通过 @include 引用。
 *
 * 多包约定（P2 落地，对应 docs/CHATROOM-UIKIT-DESIGN.md「复审修正 6」）：
 * - 版本段标题两种格式并存：
 *   - 裸格式 `## x.y.z (yyyy-mm-dd)`：视为 `@easemob/uikit-im` 的历史段（不动）；
 *   - 带包名前缀 `## @easemob/<pkg> x.y.z (yyyy-mm-dd)`：各包新段统一用前缀格式
 *     （`@easemob/uikit-core` / `@easemob/uikit-chatroom`；后续 uikit-im 新段也建议带前缀）。
 * - 各包版本独立推进，「最新段」= 该包在文件中首个匹配段。
 *
 * 校验点：
 * 1. 每个已发布包（uikit-im / uikit-core / uikit-chatroom）的 package.json version
 *    与根 CHANGELOG.md 该包最新版本段一致
 * 2. 根 CHANGELOG.md 各包版本段无重复、按 semver 降序排列
 * 3. 出现未登记的包名前缀段即失败（防手滑写错包名导致校验旁路）
 * 4. apps/docs/guide/changelog.md 不允许手写版本段（只能 @include 根 CHANGELOG）
 *
 * 用法：pnpm changelog:check（或 node scripts/check-version-sync.mjs）
 * 任一校验失败以非零码退出。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const rootChangelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const docsChangelog = readFileSync(join(root, 'apps/docs/guide/changelog.md'), 'utf8')

const failures = []
const ok = msg => console.log(`  ✓ ${msg}`)
const fail = msg => failures.push(msg) || console.error(`  ✗ ${msg}`)

// ---- 已发布包登记表：包名 → package.json 相对路径 ----
// 裸格式版本段（## x.y.z）归入 BARE_SECTION_PKG（uikit-im 历史段）。
const BARE_SECTION_PKG = '@easemob/uikit-im'
const PACKAGES = {
  '@easemob/uikit-im': 'packages/uikit-im/package.json',
  '@easemob/uikit-core': 'packages/uikit-core/package.json',
  '@easemob/uikit-chatroom': 'packages/uikit-chatroom/package.json',
}

// ---- 解析根 CHANGELOG 全部版本段并按包归类（保持文件出现顺序） ----
const SECTION_RE = /^## (?:(@[\w./-]+) )?(\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/gm
/** @type {Record<string, Array<{ version: string, date: string }>>} */
const sectionsByPkg = {}
for (const m of rootChangelog.matchAll(SECTION_RE)) {
  const pkg = m[1] ?? BARE_SECTION_PKG
  if (!(pkg in PACKAGES)) {
    fail(`根 CHANGELOG.md 出现未登记包名前缀的版本段：${m[0]}（已登记：${Object.keys(PACKAGES).join(' / ')}；裸段归入 ${BARE_SECTION_PKG}）`)
    continue
  }
  ;(sectionsByPkg[pkg] ||= []).push({ version: m[2], date: m[3] })
}

// ---- 1/2. 逐包校验：package.json version 与最新段一致；段内无重复、semver 降序 ----
const semverKey = v => v.split('.').map(n => Number(n).toString().padStart(5, '0')).join('.')
for (const [pkg, pkgPath] of Object.entries(PACKAGES)) {
  const pkgVersion = JSON.parse(readFileSync(join(root, pkgPath), 'utf8')).version
  const sections = sectionsByPkg[pkg] ?? []
  if (sections.length === 0) {
    fail(`根 CHANGELOG.md 未解析到 ${pkg} 的任何版本段`)
    continue
  }
  const latest = sections[0]
  ok(`根 CHANGELOG.md 最新 ${pkg} 版本段：${latest.version} (${latest.date})`)
  if (pkgVersion !== latest.version) {
    fail(`${pkg} package.json version（${pkgVersion}）与根 CHANGELOG.md 最新段（${latest.version}）不一致`)
  }
  else {
    ok(`${pkg} package.json version（${pkgVersion}）与根 CHANGELOG.md 一致`)
  }

  const seen = new Set()
  for (const s of sections) {
    if (seen.has(s.version))
      fail(`根 CHANGELOG.md 存在重复 ${pkg} 版本段：${s.version}`)
    seen.add(s.version)
  }
  const sortedDesc = [...seen].sort((a, b) => semverKey(b).localeCompare(semverKey(a)))
  if (sortedDesc.join(',') !== [...seen].join(','))
    fail(`根 CHANGELOG.md ${pkg} 版本段未按降序排列：${[...seen].join(' → ')}`)
  else
    ok(`根 CHANGELOG.md ${pkg} 版本段 ${seen.size} 个，无重复且降序`)
}

// ---- 4. 文档站 changelog 不得再手写版本段 ----
// （另起非全局正则：复用带 /g 的 SECTION_RE.test 会受 lastIndex 状态影响）
if (/^## (?:@[\w./-]+ )?\d+\.\d+\.\d+ \(\d{4}-\d{2}-\d{2}\)$/m.test(docsChangelog)) {
  fail('apps/docs/guide/changelog.md 仍包含手写版本段，应只保留 @include 根 CHANGELOG.md')
}
else {
  ok('apps/docs/guide/changelog.md 无手写版本段（单一数据源生效）')
}
if (!docsChangelog.includes('@include: ../../../CHANGELOG.md'))
  fail('apps/docs/guide/changelog.md 缺少 @include 引用根 CHANGELOG.md')

// ---- 汇总 ----
console.log(failures.length === 0 ? '\n版本同步校验通过 ✓' : `\n校验失败 ${failures.length} 项：`)
failures.forEach(f => console.error(`  - ${f}`))
process.exit(failures.length === 0 ? 0 : 1)
