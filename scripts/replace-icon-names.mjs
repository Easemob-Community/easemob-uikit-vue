#!/usr/bin/env node
// 按 tmp/icon-v2-mapping.json 批量替换源码中的图标名引用
// 只匹配被引号包围的完整旧名，避免误替换路径/注释中的片段
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const mapping = JSON.parse(
  await readFile(resolve(dirname(fileURLToPath(import.meta.url)), '../tmp/icon-v2-mapping.json'), 'utf8')
)

const EXTS = new Set(['.vue', '.ts', '.tsx', '.js', '.jsx', '.mjs'])
const SCAN_ROOTS = [
  'packages/uikit-im/src',
  'packages/uikit-core/src',
  'apps/demo/src',
]

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(path)
    }
    else if (entry.isFile() && EXTS.has(entry.name.slice(entry.name.lastIndexOf('.')))) {
      yield path
    }
  }
}

const entries = Object.entries(mapping).sort((a, b) => b[0].length - a[0].length)
const patterns = entries.map(([old, neu]) => ({
  old,
  neu,
  regex: new RegExp(`(['"\`])${escapeRegExp(old)}\\1`, 'g'),
}))

async function main() {
  let changedFiles = 0
  let total = 0
  for (const root of SCAN_ROOTS) {
    for await (const file of walk(root)) {
      let content = await readFile(file, 'utf8')
      let modified = false
      let fileReplaces = 0
      for (const { neu, regex } of patterns) {
        content = content.replace(regex, (m, quote) => {
          modified = true
          fileReplaces++
          return `${quote}${neu}${quote}`
        })
      }
      if (modified) {
        await writeFile(file, content, 'utf8')
        changedFiles++
        total += fileReplaces
        console.log(`${file}: ${fileReplaces}`)
      }
    }
  }
  console.log(`\n完成：${changedFiles} 个文件，共 ${total} 处替换`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
