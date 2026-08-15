#!/usr/bin/env node
/**
 * 生成 fluent-emoji-map.ts：内置 emoji 列表 → fluentui-emoji 资产路径映射
 *
 * 数据源：https://github.com/microsoft/fluentui-emoji（MIT）
 * 只映射 emoji-picker.vue 内置列表里出现的 glyph（约 120 个），控制体积。
 *
 * 用法：node packages/uikit-im/scripts/generate-fluent-emoji-map.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PICKER = resolve(__dirname, '../src/components/emoji-picker/emoji-picker.vue')
const OUT = resolve(__dirname, '../src/components/emoji-picker/fluent-emoji-map.ts')

const CDN = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main'
const TREE_API = 'https://api.github.com/repos/microsoft/fluentui-emoji/git/trees/main?recursive=1'
const CONCURRENCY = 32

/** 去掉 variation selector（❤️ → ❤），便于双向匹配 */
function normalize(glyph) {
  return glyph.replaceAll('️', '')
}

/** 从 emoji-picker.vue 提取内置 emoji 列表（单引号字面量） */
function extractBuiltinEmojis() {
  const src = readFileSync(PICKER, 'utf8')
  const m = src.match(/emojis:\s*\[([^\]]*)\]/)
  if (!m)
    throw new Error('未在 emoji-picker.vue 中找到 emojis 数组')
  const emojis = [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(x => x[1])
  return [...new Set(emojis)]
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok)
    throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function main() {
  const builtin = extractBuiltinEmojis()
  const wanted = new Map() // normalized glyph -> raw glyph
  for (const g of builtin) wanted.set(normalize(g), g)
  console.log(`内置 emoji ${builtin.length} 个`)

  // 1. 拉取仓库文件树
  const tree = await fetchJson(TREE_API)
  if (tree.truncated)
    throw new Error('git tree 被截断，请改用分段拉取')
  const files = tree.tree.filter(n => n.type === 'blob').map(n => n.path)

  // 2. 目录 -> 资产文件归组，提取文件干名与各风格可用性
  const dirs = new Map() // dir -> { stems: Set, styles: Set }
  for (const p of files) {
    const m = p.match(/^assets\/(.+)\/(3D|Color|Flat)\/([^/]+)\.(png|svg)$/)
    if (!m)
      continue
    const [, dir, style, filename] = m
    if (!dirs.has(dir))
      dirs.set(dir, { styles: new Set(), fileStem: null })
    const entry = dirs.get(dir)
    entry.styles.add(style)
    const stem = filename.replace(/_(3d|color|flat)$/, '')
    entry.fileStem = entry.fileStem || stem
  }
  console.log(`fluent 资产目录 ${dirs.size} 个`)

  // 3. 并发拉取 metadata.json，按 glyph 匹配内置列表
  // 变体子目录（如 'Thumbs up/Default'，肤色/发型变体）glyph 与基础目录重复，跳过以减半请求
  const dirList = [...dirs.keys()].filter(dir => !dir.includes('/'))
  const map = {}
  const missingStyles = []
  let done = 0
  for (let i = 0; i < dirList.length; i += CONCURRENCY) {
    const batch = dirList.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (dir) => {
      try {
        const meta = await fetchJson(`${CDN}/assets/${encodeURIComponent(dir)}/metadata.json`)
        const glyph = meta.glyph
        if (!glyph)
          return
        const raw = wanted.get(glyph) ?? wanted.get(normalize(glyph))
        if (!raw)
          return
        const entry = dirs.get(dir)
        for (const style of ['3D', 'Color', 'Flat']) {
          if (!entry.styles.has(style))
            missingStyles.push(`${raw} (${dir}) 缺少 ${style}`)
        }
        map[raw] = { dir, file: entry.fileStem }
      }
      catch {
        // 无 metadata 的目录忽略
      }
      done++
      if (done % 200 === 0)
        console.log(`metadata 进度 ${done}/${dirList.length}`)
    }))
  }

  // 4. 检查未匹配的内置 emoji
  const unmatched = builtin.filter(g => !map[g])
  if (unmatched.length > 0)
    console.warn('未匹配到 fluent 资产的 emoji:', unmatched.join(' '))
  if (missingStyles.length > 0)
    console.warn('风格缺失:\n' + missingStyles.join('\n'))

  // 5. 写出映射文件
  const body = Object.entries(map)
    .map(([g, v]) => `  '${g}': { dir: '${v.dir.replace(/'/g, "\\'")}', file: '${v.file}' },`)
    .join('\n')
  const out = `/**
 * 本文件由 scripts/generate-fluent-emoji-map.mjs 生成，请勿手改
 * 数据源：https://github.com/microsoft/fluentui-emoji（MIT License）
 * 仅覆盖 emoji-picker 内置列表的常用 emoji，控制包体积
 */
export interface FluentEmojiAsset {
  /** assets/ 下的目录名（CLDR 名） */
  dir: string
  /** 资产文件干名（不含风格后缀与扩展名） */
  file: string
}

/** glyph（含 ❤️ 等带 FE0F 的原始形式）→ fluent 资产 */
export const FLUENT_EMOJI_MAP: Record<string, FluentEmojiAsset> = {
${body}
}
`
  writeFileSync(OUT, out)
  console.log(`已生成 ${OUT}，共 ${Object.keys(map).length} 条映射`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
