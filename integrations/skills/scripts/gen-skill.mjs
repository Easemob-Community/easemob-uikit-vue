/**
 * 从文档站自动生成的组件 API（apps/docs/.vitepress/gen/*.md）同步到集成侧 Skills。
 *
 * 数据源：apps/docs/.vitepress/gen/*.md
 *   —— 由 `pnpm -F @easemob/docs gen:api`（scripts/gen-api-docs.mjs）产出，
 *   覆盖 22 个原子组件 + 4 个业务模块 + uikit-provider 的 props/emits/slots。
 *
 * 产物：integrations/skills/reference/api/*.md + README.md 索引
 *
 * 用法：node integrations/skills/scripts/gen-skill.mjs
 * 说明：重跑即覆盖 reference/api 下的 md，保持与文档站一致（防漂移）。
 */
/* eslint-disable no-console -- CLI 脚本日志输出 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SRC = join(__dirname, '../../../apps/docs/.vitepress/gen')
const OUT = join(__dirname, '../reference/api')

mkdirSync(OUT, { recursive: true })

// 清空目标目录中的历史 md（只清 .md，避免残留已下架的组件）
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.md')) {
    rmSync(join(OUT, f))
  }
}

const files = readdirSync(SRC)
  .filter(f => f.endsWith('.md'))
  .sort()
const entries = []

for (const file of files) {
  const content = readFileSync(join(SRC, file), 'utf-8')
  // 提取标题行（如 `## UikitProvider API` / `## Button API`）
  const titleMatch = content.match(/^##\s+(.+?)\s*$/m)
  const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '')
  writeFileSync(join(OUT, file), content, 'utf-8')
  entries.push({ file, title })
  console.log(`[ok] ${file}`)
}

// 生成索引
const lines = [
  '# 组件 API 明细索引',
  '',
  '> 由 `scripts/gen-skill.mjs` 从 `apps/docs/.vitepress/gen/*.md` 自动生成，请勿手改。',
  '',
  '| 组件 | 文件 |',
  '| --- | --- |',
]
for (const e of entries) {
  lines.push(`| ${e.title} | [${e.file}](./${e.file}) |`)
}
writeFileSync(join(OUT, 'README.md'), `${lines.join('\n')}\n`, 'utf-8')

console.log(`\n完成：${entries.length} 个 API 已同步 -> ${OUT}`)
