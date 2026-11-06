import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const docsRoot = fileURLToPath(new URL('..', import.meta.url))
const packageRoot = resolve(docsRoot, '../../packages/uikit-im')
const sourceRoot = join(packageRoot, 'src')
const apiRoot = join(docsRoot, 'api')
const errors = []

function resolveSource(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier)
  for (const candidate of [`${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(`Cannot resolve ${specifier} from ${fromFile}`)
}

function collectExports(entry, accept, seen = new Set()) {
  if (seen.has(entry)) return new Set()
  seen.add(entry)
  const source = readFileSync(entry, 'utf8')
  const names = new Set()

  for (const match of source.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+([A-Za-z_$][\w$]*)/g)) {
    if (accept(match[1])) names.add(match[1])
  }

  for (const match of source.matchAll(/export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/gs)) {
    for (const part of match[1].split(',')) {
      const item = part.trim().replace(/^type\s+/, '')
      if (!item) continue
      const name = item.split(/\s+as\s+/).at(-1)?.trim()
      if (name && accept(name)) names.add(name)
    }
  }

  for (const match of source.matchAll(/export\s*\*\s*from\s*['"](\.[^'"]+)['"]/g)) {
    for (const name of collectExports(resolveSource(entry, match[1]), accept, seen)) names.add(name)
  }

  return names
}

function kebabCase(name) {
  return name.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()
}

function readApiPage(relativePath) {
  const path = join(apiRoot, relativePath)
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function hasApiName(content, name) {
  return new RegExp(`\\b${name}\\b`).test(content)
}

function checkIndividualPages(category, entry, accept) {
  for (const name of collectExports(entry, accept).values()) {
    const relativePath = `${category}/${kebabCase(name)}.md`
    const content = readApiPage(relativePath)
    if (!content) errors.push(`缺少 ${name} 参考页：api/${relativePath}`)
    else if (!hasApiName(content, name)) errors.push(`api/${relativePath} 未包含公开名称 ${name}`)
  }
}

function checkUtils() {
  const names = collectExports(join(sourceRoot, 'utils/index.ts'), name => /^[a-z][A-Za-z\d]*$/.test(name))
  const content = readApiPage('utils/format-message.md')
    + readApiPage('utils/mention.md')
    + readApiPage('utils/resolve-last-message-text.md')
    + readApiPage('utils/core.md')
    + readApiPage('utils/general.md')
  for (const name of names) {
    if (!hasApiName(content, name)) errors.push(`Utils API 未覆盖 ${name}`)
  }
}

async function checkManifestLinks() {
  const { default: manifest } = await import(pathToFileURL(join(docsRoot, 'docs.manifest.mjs')).href)
  const sidebar = manifest.locale.themeConfig.sidebar['/api/'] ?? []
  const pending = [...sidebar]
  while (pending.length) {
    const item = pending.pop()
    if (item.items) pending.push(...item.items)
    if (!item.link?.startsWith('/api/')) continue
    const pathname = item.link.split('#')[0]
    const relativePath = pathname.slice('/api/'.length)
    const candidates = relativePath
      ? [join(apiRoot, `${relativePath}.md`), join(apiRoot, relativePath, 'index.md')]
      : [join(apiRoot, 'index.md')]
    if (!candidates.some(existsSync)) errors.push(`API sidebar 链接目标不存在：${item.link}`)
  }
}

checkIndividualPages('composables', join(sourceRoot, 'composables/index.ts'), name => /^use[A-Z]/.test(name))
checkIndividualPages('stores', join(sourceRoot, 'store/index.ts'), name => /^use[A-Z].*Store$/.test(name))
checkUtils()
await checkManifestLinks()

if (errors.length) {
  console.error(`✗ API 参考覆盖检查失败（${errors.length} 项）：`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('✓ Vue API 参考覆盖与 sidebar 链接检查通过')
