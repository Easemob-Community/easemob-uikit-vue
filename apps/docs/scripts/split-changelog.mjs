/**
 * 拆分根 CHANGELOG.md 为三个包独立的 changelog 文件
 *
 * 根 CHANGELOG.md 使用两种版本段格式：
 * - 裸格式 `## x.y.z (yyyy-mm-dd)`：视为 @easemob/uikit-im 历史段
 * - 带包名前缀 `## @easemob/<pkg> x.y.z (yyyy-mm-dd)`：对应包段
 *
 * 本脚本按包名提取版本段，生成：
 * - .vitepress/gen/changelog-im.md
 * - .vitepress/gen/changelog-core.md
 * - .vitepress/gen/changelog-chatroom.md
 *
 * 生成的文件由 apps/docs/guide/changelog.md 通过 tabs 引入展示。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const genDir = join(root, 'apps/docs/.vitepress/gen')
const changelogPath = join(root, 'CHANGELOG.md')

const changelog = readFileSync(changelogPath, 'utf8')

// 版本段分隔线后的第一个标题视为新段开始；段内可能包含 ---
const SECTION_RE = /^## (?:(@[\w./-]+) )?(\d+\.\d+\.\d+) \((\d{4}-\d{2}-\d{2})\)$/gm

const BARE_SECTION_PKG = '@easemob/uikit-im'
const OUTPUT_MAP = {
  '@easemob/uikit-im': join(genDir, 'changelog-im.md'),
  '@easemob/uikit-core': join(genDir, 'changelog-core.md'),
  '@easemob/uikit-chatroom': join(genDir, 'changelog-chatroom.md'),
}

/** @type {Record<string, string[]>} */
const sectionsByPkg = {}

let lastIndex = 0
let lastPkg = null
let lastMatch = null

for (const m of changelog.matchAll(SECTION_RE)) {
  if (lastMatch) {
    const content = changelog.slice(lastIndex, m.index).replace(/^---\n+/m, '').trimEnd()
    if (lastPkg)
      (sectionsByPkg[lastPkg] ||= []).push(`${lastMatch[0]}\n\n${content}`)
  }
  lastPkg = m[1] ?? BARE_SECTION_PKG
  lastIndex = m.index + m[0].length + 1
  lastMatch = m
}

// 最后一段到文件末尾
if (lastMatch) {
  const content = changelog.slice(lastIndex).replace(/^---\n+/m, '').trimEnd()
  if (lastPkg)
    (sectionsByPkg[lastPkg] ||= []).push(`${lastMatch[0]}\n\n${content}`)
}

for (const [pkg, outPath] of Object.entries(OUTPUT_MAP)) {
  const sections = sectionsByPkg[pkg] ?? []
  const content = sections.join('\n\n---\n\n')
  writeFileSync(outPath, content ? `${content}\n` : '> 暂无更新日志\n')
}

console.log('[split-changelog] generated:', Object.values(OUTPUT_MAP).map(p => p.split('/').pop()).join(', '))
