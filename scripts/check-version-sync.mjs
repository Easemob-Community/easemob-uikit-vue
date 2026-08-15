/**
 * 版本号同步校验（changelog:check）
 *
 * 背景：曾发生文档站 changelog 与根 CHANGELOG.md、package.json 版本号三处脱节
 * （1.5.0/1.5.1 只写进文档站，根 CHANGELOG 停在 1.4.0，package.json 停在 1.3.1）。
 * 现约定单一数据源：根 CHANGELOG.md 唯一维护版本段，文档站通过 @include 引用。
 *
 * 多包约定（P1 抽核后，对应 CHATROOM-UIKIT-DESIGN.md「复审修正 6」）：
 * - `@easemob/uikit-im`（场景包）：版本段格式 `## x.y.z (yyyy-mm-dd)`，最新段即首个匹配段；
 * - `@easemob/uikit-core`（共享基座）：版本段格式 `## @easemob/uikit-core x.y.z (yyyy-mm-dd)`，
 *   最新段即首个匹配段；两包版本独立推进。
 *
 * 校验点：
 * 1. packages/uikit-im/package.json 的 version 与根 CHANGELOG.md 最新 im 版本段一致
 * 2. packages/uikit-core/package.json 的 version 与根 CHANGELOG.md 最新 core 版本段一致
 * 3. 根 CHANGELOG.md 各包版本段无重复、按 semver 降序排列（不含 Unreleased 之外的断层）
 * 4. apps/docs/guide/changelog.md 不再允许手写版本段（只能 @include 根 CHANGELOG）
 *
 * 用法：pnpm changelog:check（或 node scripts/check-version-sync.mjs）
 * 任一校验失败以非零码退出。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const imPkg = JSON.parse(readFileSync(join(root, 'packages/uikit-im/package.json'), 'utf8'))
const corePkg = JSON.parse(readFileSync(join(root, 'packages/uikit-core/package.json'), 'utf8'))
const rootChangelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
const docsChangelog = readFileSync(join(root, 'apps/docs/guide/changelog.md'), 'utf8')

const failures = []
const ok = msg => console.log(`  ✓ ${msg}`)
const fail = msg => failures.push(msg) || console.error(`  ✗ ${msg}`)

// ---- 1. im package.json version 与根 CHANGELOG 最新 im 段一致 ----
const imSections = [...rootChangelog.matchAll(/^## (\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/gm)]
if (imSections.length === 0) {
  fail('根 CHANGELOG.md 未解析到任何 im 版本段（## x.y.z (yyyy-mm-dd)）')
}
else {
  const latest = imSections[0][1]
  ok(`根 CHANGELOG.md 最新 im 版本段：${latest} (${imSections[0][2]})`)
  if (imPkg.version !== latest) {
    fail(`uikit-im package.json version（${imPkg.version}）与根 CHANGELOG.md 最新段（${latest}）不一致`)
  }
  else {
    ok(`uikit-im package.json version（${imPkg.version}）与根 CHANGELOG.md 一致`)
  }
}

// ---- 2. core package.json version 与根 CHANGELOG 最新 core 段一致 ----
const coreSections = [...rootChangelog.matchAll(/^## @easemob\/uikit-core (\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/gm)]
if (coreSections.length === 0) {
  fail('根 CHANGELOG.md 未解析到任何 core 版本段（## @easemob/uikit-core x.y.z (yyyy-mm-dd)）')
}
else {
  const latest = coreSections[0][1]
  ok(`根 CHANGELOG.md 最新 core 版本段：${latest} (${coreSections[0][2]})`)
  if (corePkg.version !== latest) {
    fail(`uikit-core package.json version（${corePkg.version}）与根 CHANGELOG.md 最新段（${latest}）不一致`)
  }
  else {
    ok(`uikit-core package.json version（${corePkg.version}）与根 CHANGELOG.md 一致`)
  }
}

// ---- 3. 根 CHANGELOG.md 各包版本段无重复、按 semver 降序 ----
const semverKey = v => v.split('.').map(n => Number(n).toString().padStart(5, '0')).join('.')
function checkOrder(label, sections) {
  const seen = new Set()
  for (const m of sections) {
    if (seen.has(m[1]))
      fail(`根 CHANGELOG.md 存在重复 ${label} 版本段：${m[1]}`)
    seen.add(m[1])
  }
  const sortedDesc = [...seen].sort((a, b) => semverKey(b).localeCompare(semverKey(a)))
  if (sortedDesc.join(',') !== [...seen].join(','))
    fail(`根 CHANGELOG.md ${label} 版本段未按降序排列：${[...seen].join(' → ')}`)
  else
    ok(`根 CHANGELOG.md ${label} 版本段 ${seen.size} 个，无重复且降序`)
}
checkOrder('im', imSections)
checkOrder('core', coreSections)

// ---- 4. 文档站 changelog 不得再手写版本段 ----
if (/^## \d+\.\d+\.\d+ /m.test(docsChangelog) || /^## @easemob\/uikit-core \d+\.\d+\.\d+ /m.test(docsChangelog)) {
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
