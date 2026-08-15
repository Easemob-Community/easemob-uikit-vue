import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import {
  listComponents,
  listGuides,
  readChangelog,
  readComponentApi,
  readGuide,
} from './store.js'

const BASE = 'uikit://'

export function registerResources(server: Server): void {
  const resources = [
    {
      uri: `${BASE}changelog`,
      name: 'UIKit 更新日志（CHANGELOG）',
      description: '@easemob/uikit-im 版本更新与破坏性变更说明',
      mimeType: 'text/markdown',
    },
    ...listGuides().map(g => ({
      uri: `${BASE}guide/${g.name}`,
      name: `指南：${g.title}`,
      description: `UIKit 接入指南「${g.title}」`,
      mimeType: 'text/markdown',
    })),
    ...listComponents().map(c => ({
      uri: `${BASE}component/${c.name}`,
      name: `组件：${c.title}`,
      description: `${c.title} 的 props / emits / slots 明细`,
      mimeType: 'text/markdown',
    })),
  ]

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources }))

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri
    const content = resolveResource(uri)
    if (content == null) {
      throw new Error(`未知资源：${uri}`)
    }
    return { contents: [{ uri, mimeType: 'text/markdown', text: content }] }
  })
}

function resolveResource(uri: string): string | null {
  if (uri === `${BASE}changelog`) {
    return readChangelog()
  }
  if (uri.startsWith(`${BASE}guide/`)) {
    return readGuide(uri.slice(`${BASE}guide/`.length))
  }
  if (uri.startsWith(`${BASE}component/`)) {
    return readComponentApi(uri.slice(`${BASE}component/`.length))
  }
  return null
}
