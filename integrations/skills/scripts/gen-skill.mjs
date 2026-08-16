/**
 * 从文档站自动生成的组件 API（apps/docs/.vitepress/gen/<pkg>/）同步到集成侧 Skills。
 *
 * 数据源：apps/docs/.vitepress/gen/*.md
 *   —— 由 `pnpm -F @easemob/docs gen:api`（scripts/gen-api-docs.mjs）产出，
 *   uikit-im 覆盖 22 个原子组件 + 4 个业务模块 + uikit-provider；
 *   chatroom 覆盖容器 + 直播组件集 + PC 三件套（P5 起参数化，见 gen-api-docs.mjs PACKAGES）。
 *
 * 产物：
 *   - integrations/skills/reference/api/*.md（uikit-im 集成 skill）
 *   - integrations/skills/chatroom/reference/api/*.md（聊天室集成 skill）
 *   各目标目录内附带 README.md 索引。
 *
 * 用法：node integrations/skills/scripts/gen-skill.mjs
 * 说明：重跑即覆盖 reference/api 下的 md，保持与文档站一致（防漂移）。
 */
/* eslint-disable no-console -- CLI 脚本日志输出 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** 标题提取：`## Xxx API`（锚定行首；`\S` 排除空白，避免与 `\s+` 可交换字符回溯） */
const TITLE_RE = /^##\s+(\S.*)$/m

/** 同步目标：gen 源目录 → skill reference/api 输出目录（参数化，禁止复制脚本） */
const TARGETS = [
  {
    src: join(__dirname, '../../../apps/docs/.vitepress/gen'),
    out: join(__dirname, '../reference/api'),
  },
  {
    src: join(__dirname, '../../../apps/docs/.vitepress/gen/chatroom'),
    out: join(__dirname, '../chatroom/reference/api'),
  },
]

let total = 0
for (const { src, out } of TARGETS) {
  if (!existsSync(src)) {
    console.warn(`[skip] 源目录不存在：${src}`)
    continue
  }
  mkdirSync(out, { recursive: true })

  // 清空目标目录中的历史 md（只清 .md，避免残留已下架的组件）
  for (const f of readdirSync(out)) {
    if (f.endsWith('.md')) {
      rmSync(join(out, f))
    }
  }

  const files = readdirSync(src)
    .filter(f => f.endsWith('.md'))
    .sort()
  const entries = []

  for (const file of files) {
    const content = readFileSync(join(src, file), 'utf-8')
    // 提取标题行（如 `## UikitProvider API` / `## Button API`）
    const titleMatch = content.match(TITLE_RE)
    const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, '')
    writeFileSync(join(out, file), content, 'utf-8')
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
  writeFileSync(join(out, 'README.md'), `${lines.join('\n')}\n`, 'utf-8')

  console.log(`完成：${entries.length} 个 API 已同步 -> ${out}`)
  total += entries.length
}

console.log(`\n合计：${total} 个 API 已同步（${TARGETS.length} 个目标）`)
