#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { registerResources } from './resources.js'
import { getVersion } from './store.js'
import { registerTools } from './tools.js'

const server = new Server(
  { name: 'easemob-uikit-mcp', version: getVersion() },
  { capabilities: { tools: {}, resources: {} } },
)

registerTools(server)
registerResources(server)

const transport = new StdioServerTransport()
await server.connect(transport)
