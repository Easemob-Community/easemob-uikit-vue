#!/usr/bin/env node
// 图标资源规范化脚本（支持多源目录）
// 用法：
//   node prepare-icons-v2.mjs                          # 默认处理线性/icon/stroked → assets/icons-v2
//   node prepare-icons-v2.mjs <src> <dst> [src dst ...] # 自定义源/目标目录对
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, relative, resolve, join } from 'node:path'

const ROOT = process.cwd()
const DEFAULT_PAIRS = [
  [resolve(ROOT, '线性/icon/stroked'), resolve(ROOT, 'packages/uikit-core/src/assets/icons-v2')],
]

const IGNORED_NAMES = new Set(['.DS_Store'])

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(path)
    }
    else if (entry.isFile() && entry.name.endsWith('.svg') && !IGNORED_NAMES.has(entry.name)) {
      yield path
    }
  }
}

function parseSvg(raw) {
  const openMatch = raw.match(/<svg\b[^>]*>/)
  if (!openMatch)
    throw new Error('未找到 <svg> 开标签')

  const viewBox = openMatch[0].match(/\bviewBox="([^"]+)"/)?.[1]
  if (!viewBox)
    throw new Error('缺失 viewBox')

  let body = raw.replace(/<svg\b[^>]*>/, '').replace(/<\/svg\s*>/, '').trim()

  // 删除 <defs>...</defs>
  body = body.replace(/<defs\b[\s\S]*?<\/defs\s*>/gi, '')

  // 删除 clip-path 包裹 <g>
  let prev
  do {
    prev = body
    body = body.replace(/<g\b[^>]*?\sclip-path="url\([^)]+\)"[^>]*?>([\s\S]*?)<\/g\s*>/i, '$1')
  } while (body !== prev)

  // 黑色统一改为 currentColor
  body = body.replace(/\bfill="black"/gi, 'fill="currentColor"')
  body = body.replace(/\bstroke="black"/gi, 'stroke="currentColor"')

  body = body.replace(/\n{2,}/g, '\n').trim()
  return { viewBox, body }
}

function buildSvg(viewBox, body) {
  return `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${body}\n</svg>`
}

async function normalizePair(srcDir, outDir) {
  if (!existsSync(srcDir))
    throw new Error(`源目录不存在：${srcDir}`)

  let processed = 0
  for await (const srcPath of walk(srcDir)) {
    const rel = relative(srcDir, srcPath)
    const outPath = resolve(outDir, rel)
    const raw = await readFile(srcPath, 'utf8')
    const parsed = parseSvg(raw)
    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, buildSvg(parsed.viewBox, parsed.body), 'utf8')
    processed++
  }
  return processed
}

async function main() {
  const args = process.argv.slice(2)
  const pairs = args.length > 0
    ? []
    : DEFAULT_PAIRS

  if (args.length > 0) {
    if (args.length % 2 !== 0)
      throw new Error('自定义模式参数须成对：<src> <dst> [...]')
    for (let i = 0; i < args.length; i += 2)
      pairs.push([resolve(args[i]), resolve(args[i + 1])])
  }

  for (const [src, dst] of pairs) {
    const count = await normalizePair(src, dst)
    console.log(`✅ ${relative(ROOT, src)} → ${relative(ROOT, dst)}：${count} 个图标`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
