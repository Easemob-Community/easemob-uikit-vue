#!/usr/bin/env node
// 线性图标集 V2 规范化脚本
// 输入：线性/icon/stroked/**/*.svg（设计师源文件）
// 输出：packages/uikit-core/src/assets/icons-v2/**/*.svg（包内规范化产物）
import { readFile, writeFile, readdir, mkdir, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, relative, resolve, join } from 'node:path'

const ROOT = process.cwd()
const SRC_DIR = resolve(ROOT, '线性/icon/stroked')
const OUT_DIR = resolve(ROOT, 'packages/uikit-core/src/assets/icons-v2')
const STRAY_DIR = resolve(ROOT, '线性/icon/stroke') // 游离目录，仅记录不纳入

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

/** 简单 XML 实体转义，保证输出安全 */
function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 提取并校验关键属性 */
function parseSvg(raw) {
  const openMatch = raw.match(/<svg\b[^>]*>/)
  if (!openMatch)
    throw new Error('未找到 <svg> 开标签')

  const viewBox = openMatch[0].match(/\bviewBox="([^"]+)"/)?.[1]
  if (!viewBox)
    throw new Error('缺失 viewBox')

  // 去掉 <svg ...> 与 </svg>，取 body
  let body = raw.replace(/<svg\b[^>]*>/, '').replace(/<\/svg\s*>/, '').trim()

  // 1. 删除 <defs>...</defs> 块（设计师导出的 clipPath 全在这里）
  body = body.replace(/<defs\b[\s\S]*?<\/defs\s*>/gi, '')

  // 2. 删除 clip-path 包裹 <g>（保留其内部 path）
  //    用非贪婪匹配处理，循环直到没有
  let prev
  do {
    prev = body
    body = body.replace(/<g\b[^>]*?\sclip-path="url\([^)]+\)"[^>]*?>([\s\S]*?)<\/g\s*>/i, '$1')
  } while (body !== prev)

  // 3. 将黑色统一改为 currentColor（fill/stroke 均适用）
  body = body.replace(/\bfill="black"/gi, 'fill="currentColor"')
  body = body.replace(/\bstroke="black"/gi, 'stroke="currentColor"')

  // 4. 清理无意义空白行
  body = body.replace(/\n{2,}/g, '\n').trim()

  return { viewBox, body }
}

function buildSvg(viewBox, body) {
  return `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg">\n${body}\n</svg>`
}

async function main() {
  if (!existsSync(SRC_DIR))
    throw new Error(`源目录不存在：${SRC_DIR}`)

  const anomalies = []
  const strayFiles = []
  let processed = 0

  // 记录游离文件
  if (existsSync(STRAY_DIR)) {
    for await (const path of walk(STRAY_DIR))
      strayFiles.push(relative(ROOT, path))
  }

  for await (const srcPath of walk(SRC_DIR)) {
    const rel = relative(SRC_DIR, srcPath)
    const outPath = resolve(OUT_DIR, rel)

    let raw
    try {
      raw = await readFile(srcPath, 'utf8')
    }
    catch (e) {
      anomalies.push({ file: rel, reason: `读取失败：${e.message}` })
      continue
    }

    let parsed
    try {
      parsed = parseSvg(raw)
    }
    catch (e) {
      anomalies.push({ file: rel, reason: `解析失败：${e.message}` })
      continue
    }

    await mkdir(dirname(outPath), { recursive: true })
    await writeFile(outPath, buildSvg(parsed.viewBox, parsed.body), 'utf8')
    processed++
  }

  // 汇总报告
  console.log(`✅ 已规范化 ${processed} 个图标到 ${relative(ROOT, OUT_DIR)}`)
  if (strayFiles.length) {
    console.log('\n⚠️ 发现游离文件（未纳入 v2，请转设计师确认）：')
    for (const f of strayFiles)
      console.log(`  - ${f}`)
  }
  if (anomalies.length) {
    console.log('\n❌ 异常文件：')
    for (const a of anomalies)
      console.log(`  - ${a.file}: ${a.reason}`)
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
