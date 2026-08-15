import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// dist/store.js 与 src/store.ts 的上级目录都是 packages/mcp，data/ 在其下
const DATA_DIR = join(__dirname, '..', 'data')

export interface ComponentInfo {
  name: string
  title: string
  category: string
  api: boolean
}

export interface GuideInfo {
  name: string
  title: string
}

export interface Manifest {
  version: string
  guides: GuideInfo[]
  components: ComponentInfo[]
}

export interface SearchHit {
  file: string
  title: string
  kind: 'guide' | 'component'
  snippet: string
  score: number
}

interface DocEntry {
  file: string
  title: string
  kind: 'guide' | 'component'
  content: string
}

function readText(file: string): string | null {
  try {
    return readFileSync(file, 'utf-8')
  }
  catch {
    return null
  }
}

function loadManifest(): Manifest {
  const raw = readText(join(DATA_DIR, 'manifest.json'))
  if (!raw) {
    return { version: 'unknown', guides: [], components: [] }
  }
  return JSON.parse(raw) as Manifest
}

const manifest = loadManifest()

export function getVersion(): string {
  return manifest.version
}

export function listComponents(): ComponentInfo[] {
  return manifest.components
}

export function listGuides(): GuideInfo[] {
  return manifest.guides
}

/** 防目录穿越：组件名只允许小写字母/数字/连字符 */
function isSafeName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name)
}

export function readComponentApi(name: string): string | null {
  if (!isSafeName(name)) return null
  return readText(join(DATA_DIR, 'api', `${name}.md`))
}

export function readGuide(name: string): string | null {
  if (!isSafeName(name)) return null
  return readText(join(DATA_DIR, 'guide', `${name}.md`))
}

export function readChangelog(): string | null {
  return readText(join(DATA_DIR, 'CHANGELOG.md'))
}

function collectDocs(): DocEntry[] {
  const docs: DocEntry[] = []
  for (const g of manifest.guides) {
    const content = readGuide(g.name)
    if (content) docs.push({ file: g.name, title: g.title, kind: 'guide', content })
  }
  for (const c of manifest.components) {
    const content = readComponentApi(c.name)
    if (content) docs.push({ file: c.name, title: c.title, kind: 'component', content })
  }
  return docs
}

export function searchDocs(query: string, limit = 8): SearchHit[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []

  const hits: SearchHit[] = []
  for (const doc of collectDocs()) {
    const lower = doc.content.toLowerCase()
    let score = 0
    let firstIndex = -1
    for (const term of terms) {
      const idx = lower.indexOf(term)
      if (idx >= 0) {
        score++
        if (firstIndex < 0 || idx < firstIndex) firstIndex = idx
      }
    }
    if (score === 0) continue

    const start = Math.max(0, firstIndex - 80)
    const end = Math.min(doc.content.length, firstIndex + 160)
    const snippet = `${start > 0 ? '…' : ''}${doc.content.slice(start, end).replace(/\s+/g, ' ').trim()}${end < doc.content.length ? '…' : ''}`
    hits.push({ file: doc.file, title: doc.title, kind: doc.kind, snippet, score })
  }

  return hits
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}
