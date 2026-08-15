import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import {
  getVersion,
  listComponents,
  readComponentApi,
  searchDocs,
  type ComponentInfo,
  type SearchHit,
} from './store.js'
import { validateProviderConfig } from './validate.js'

interface ToolDef {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

const TOOL_DEFS: ToolDef[] = [
  {
    name: 'list_components',
    description: '列出 @easemob/uikit 全部组件（含中文名与分类），用于快速了解可用组件。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_component_api',
    description: '返回指定组件的 props / emits / slots 明细（Markdown）。组件名用 kebab-case，如 button、chat-container、uikit-provider。',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: '组件名（kebab-case），如 button / chat-container / uikit-provider' },
      },
      required: ['name'],
    },
  },
  {
    name: 'search_docs',
    description: '在 UIKit 接入指南与组件 API 文档中全文搜索关键词，返回命中片段与所在文档。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词，如「暗色模式」「dataSource」「appKey」「下拉刷新」' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_latest_version',
    description: '查询 @easemob/uikit 最新版本（npm registry）并与本地文档快照版本对比。',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'validate_provider_config',
    description: '校验 EmUIKitProvider 的配置对象（JS props 对象，camelCase 键）是否合法，返回错误与告警列表。',
    inputSchema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          description: 'EmUIKitProvider 的 props 配置对象，如 { appKey, theme, h5, enableContact, dataSource, notification, logger }',
        },
      },
      required: ['config'],
    },
  },
]

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name
    const args = (request.params.arguments ?? {}) as Record<string, unknown>
    try {
      const text = await dispatch(name, args)
      return { content: [{ type: 'text' as const, text }] }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { content: [{ type: 'text' as const, text: `错误：${message}` }], isError: true }
    }
  })
}

async function dispatch(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'list_components':
      return listComponentsText()

    case 'get_component_api': {
      const n = typeof args.name === 'string' ? args.name : ''
      const content = readComponentApi(n)
      if (!content) {
        return `未找到组件「${n}」。请用 list_components 查看可用组件名（kebab-case）。`
      }
      return content
    }

    case 'search_docs': {
      const query = typeof args.query === 'string' ? args.query : ''
      return formatSearchHits(query, searchDocs(query))
    }

    case 'get_latest_version':
      return getLatestVersionText()

    case 'validate_provider_config':
      return validateText(args.config)

    default:
      throw new Error(`未知工具：${name}`)
  }
}

function listComponentsText(): string {
  const comps = listComponents()
  const byCat = new Map<string, ComponentInfo[]>()
  for (const c of comps) {
    const arr = byCat.get(c.category) ?? []
    arr.push(c)
    byCat.set(c.category, arr)
  }

  const lines = ['# @easemob/uikit 组件清单', '']
  for (const [cat, items] of byCat) {
    lines.push(`## ${cat}`, '')
    for (const it of items) {
      lines.push(`- ${it.title}（\`${it.name}\`）`)
    }
    lines.push('')
  }
  lines.push(`共 ${comps.length} 个组件。查某组件的 props / emits / slots 用 get_component_api。`)
  return lines.join('\n')
}

function formatSearchHits(query: string, hits: SearchHit[]): string {
  if (hits.length === 0) {
    return `未找到与「${query}」相关的内容。`
  }
  const lines = [`「${query}」命中 ${hits.length} 处：`, '']
  for (const h of hits) {
    const kind = h.kind === 'guide' ? '指南' : '组件'
    lines.push(`### ${h.title}（${kind}，\`${h.file}\`）`)
    lines.push(`> ${h.snippet}`, '')
  }
  return lines.join('\n')
}

async function getLatestVersionText(): Promise<string> {
  const bundled = getVersion()
  try {
    const res = await fetch('https://registry.npmjs.org/@easemob/uikit/latest', {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const data = (await res.json()) as { version?: string }
    const latest = data.version ?? bundled
    if (latest === bundled) {
      return `@easemob/uikit 最新版本：${latest}（与本地文档快照一致）。`
    }
    return `@easemob/uikit 最新版本：${latest}；本地文档快照版本：${bundled}（快照可能滞后，建议以 npm 最新文档为准）。`
  }
  catch {
    return `无法连接 npm registry，本地文档快照版本：${bundled}。`
  }
}

function validateText(config: unknown): string {
  const issues = validateProviderConfig(config)
  if (issues.length === 0) {
    return '✅ 配置校验通过，未发现问题。'
  }
  const errors = issues.filter(i => i.level === 'error')
  const warnings = issues.filter(i => i.level === 'warning')
  const lines = [`共 ${errors.length} 个错误、${warnings.length} 个告警：`, '']
  for (const i of issues) {
    const tag = i.level === 'error' ? '错误' : '告警'
    lines.push(`- [${tag}] \`${i.path}\`: ${i.message}`)
  }
  return lines.join('\n')
}
