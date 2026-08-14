/**
 * UIKit API 文档自动生成脚本
 *
 * 解析组件 <script setup> 中的：
 * - `export interface XxxProps`（属性 + JSDoc 注释）
 * - `withDefaults(defineProps<XxxProps>(), {...})` 默认值
 * - `export interface XxxEmits` / `defineEmits<{...}>()` 事件
 * - 模板中的 <slot name="..."> 插槽
 *
 * 原子组件（COMPONENTS）生成 markdown 表格片段到 .vitepress/gen/<component>.md；
 * 业务模块容器（MODULES）额外递归展开嵌套配置类型（如 ChatConfig）为子小节，
 * 输出 .vitepress/gen/<module>.md。页面通过
 * `<!-- @include: ../.vitepress/gen/<x>.md -->` 引用。
 *
 * 用法：pnpm gen:api（支持增量重跑，重复执行覆盖生成）
 */
/* eslint-disable no-console -- CLI 脚本日志输出 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const COMPONENTS_ROOT = join(__dirname, '../../../packages/uikit/src/components')
const MODULES_ROOT = join(__dirname, '../../../packages/uikit/src/modules')
const CONTAINERS_ROOT = join(__dirname, '../../../packages/uikit/src/containers')
const OUTPUT_DIR = join(__dirname, '../.vitepress/gen')

/** 22 个原子组件：目录名 → 展示名 */
const COMPONENTS = [
  'action-sheet',
  'avatar',
  'badge',
  'button',
  'cell',
  'empty',
  'emoji-picker',
  'group-card',
  'icon',
  'icon-button',
  'image-viewer',
  'input',
  'modal',
  'notification',
  'popup',
  'presence-avatar',
  'presence-selector',
  'resizable',
  'scroll-to-top',
  'status-banner',
  'toast',
  'user-card',
]

/**
 * 业务模块容器白名单：输出名 → 组件相对 modules 的文件路径。
 * Props 接口按「首个 *Props 结尾的 interface」宽松匹配（如 ChatProps /
 * ConversationListProps），emits 按「首个 *Emits 结尾的 interface」匹配。
 * nestedOnly：仅展开这些嵌套路径（其余成员显示类型原文）；不配置则全量展开。
 */
const MODULES = [
  { name: 'chat-container', file: 'chat/chat.vue' },
  { name: 'conversation-container', file: 'conversation/conversation-list.vue' },
  // 注意：contact-container.md 页面描述的是 EmContactContainer（通讯录聚合容器），
  // 该组件尚未实现（无对应 .vue 文件），待 props 接口补齐后按同样方式追加；
  // 不要错接 contact-list.vue（联系人列表，与页面内容不符）
  { name: 'group-container', file: 'group/group-list.vue' },
  // EmMessageList 的 config 为完整 ChatConfig，但组件只消费 messageList 子树，
  // 仅展开 config.messageList，避免误导读者以为其余配置对消息列表生效
  { name: 'message-list', file: 'chat/message-list/message-list.vue', nestedOnly: ['config.messageList'] },
]

/**
 * 顶级容器白名单：相对 containers 的 .vue 路径，复用 MODULES 的生成逻辑
 * （接口名不匹配 ${pascal}Props 时按首个 *Props 后缀宽松匹配，如 ProviderProps）。
 * nestedOnly：仅展开这些嵌套路径（theme / notification / logger 为内联对象类型，
 * dataSource / noticeConfig / sdkConfig / h5 等为外部类型，显示类型原文即可）。
 */
const CONTAINERS = [
  {
    name: 'uikit-provider',
    file: 'uikit-provider/uikit-provider.vue',
    nestedOnly: ['theme', 'notification', 'logger'],
  },
]

function kebabToPascal(name) {
  return name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** 提取 JSDoc 全部非空行（不转义） */
function getDocLines(node) {
  const jsDocs = node.jsDoc
  if (!jsDocs || jsDocs.length === 0) {
    return []
  }
  const comment = jsDocs[0].comment
  if (!comment) {
    return []
  }
  const text = Array.isArray(comment)
    ? comment.map(part => part.text ?? '').join('')
    : comment.text ?? String(comment)
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

/** 转义说明文本中的 `<`，避免 `Promise<false>` 之类被 markdown-it 误判为 HTML 标签 */
function escapeDocHtml(text) {
  return text.replace(/</g, '&lt;')
}

/**
 * 成员说明：取完整 JSDoc（多行注释逐行合并，换行由 escapeCell 转 `<br>`）。
 * 只取第一行会丢失后续说明（如 conversation-list 的 tabs 三行注释）。
 */
function getDocText(node) {
  return getDocLines(node).map(escapeDocHtml).join('\n')
}

/** 小节标题说明：只取 JSDoc 第一行（blockquote 应简短，多行内容留给成员表格） */
function getDocFirstLine(node) {
  const first = getDocLines(node)[0] ?? ''
  return escapeDocHtml(first)
}

/** 转义 markdown 表格单元格内容 */
function escapeCell(text) {
  return String(text)
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>')
}

/** 格式化类型文本：压缩多行、避免超长 */
function formatType(typeText) {
  return typeText
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\s*\{\s*/, '{ ')
    .replace(/\s*\}\s*$/, ' }')
}

/** 解析一组属性签名成员（interface 成员或嵌套对象字面量成员） */
function parseMemberSignatures(members, sourceFile) {
  const rows = []
  for (const member of members) {
    if (!ts.isPropertySignature(member)) {
      continue
    }
    const name = member.name.getText(sourceFile)
    // 内联对象类型（如 ProviderProps.theme）用 compactTypeText 去注释压缩，
    // 避免表格单元格内联整段 JSDoc；外部 interface 引用保持类型原文
    const type = member.type
      ? (ts.isTypeLiteralNode(member.type)
          ? compactTypeText(member.type, sourceFile)
          : formatType(member.type.getText(sourceFile)))
      : 'any'
    rows.push({ name, type, doc: getDocText(member) })
  }
  return rows
}

/** 解析 Props 接口成员 */
function parsePropsMembers(interfaceNode) {
  return parseMemberSignatures(interfaceNode.members, interfaceNode.getSourceFile())
}

/** 解析 withDefaults 默认值 */
function parseDefaults(sourceFile) {
  const defaults = {}
  function visit(node) {
    if (
      ts.isCallExpression(node)
      && node.expression.getText(sourceFile) === 'withDefaults'
      && node.arguments.length >= 2
      && ts.isObjectLiteralExpression(node.arguments[1])
    ) {
      for (const prop of node.arguments[1].properties) {
        if (ts.isPropertyAssignment(prop)) {
          const key = prop.name.getText(sourceFile).replace(/^["']|["']$/g, '')
          let value = prop.initializer.getText(sourceFile)
          value = value.replace(/\s+/g, ' ').trim()
          defaults[key] = value
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)
  return defaults
}

/** 收集调用签名事件（defineEmits 内联 / interface 成员的公共提取） */
function collectFromCallSignatures(signatures, sourceFile) {
  const events = []
  for (const sig of signatures) {
    if (!ts.isCallSignatureDeclaration(sig)) {
      continue
    }
    const params = sig.parameters
    if (params.length === 0) {
      continue
    }
    // 第一个参数为事件名字面量
    const nameParam = params[0]
    const nameType = nameParam.type
    let eventName = ''
    if (nameType && ts.isLiteralTypeNode(nameType) && ts.isStringLiteral(nameType.literal)) {
      eventName = nameType.literal.text
    }
    if (!eventName) {
      continue
    }
    // 其余参数为事件负载
    const args = params.slice(1).map((p) => {
      const typeText = p.type ? formatType(p.type.getText(sourceFile)) : 'any'
      return `${p.name.getText(sourceFile)}: ${typeText}`
    })
    events.push({ name: eventName, args: args.join(', '), doc: getDocText(sig) })
  }
  return events
}

/** 查找首个名字以指定后缀结尾的 interface（如 *Props / *Emits） */
function findInterfaceBySuffix(sourceFile, suffix) {
  return sourceFile.statements.find(
    stmt => ts.isInterfaceDeclaration(stmt) && stmt.name.text.endsWith(suffix),
  )
}

/** 解析事件：兼容 interface XxxEmits 与 defineEmits<{...}> 两种写法 */
function parseEmits(sourceFile, componentName) {
  const events = []
  const pascal = kebabToPascal(componentName)
  const interfaceName = `${pascal}Emits`

  // 1) interface XxxEmits（精确匹配优先，失败后宽松匹配首个 *Emits）
  let emitsInterface = sourceFile.statements.find(
    stmt => ts.isInterfaceDeclaration(stmt) && stmt.name.text === interfaceName,
  )
  if (!emitsInterface) {
    emitsInterface = findInterfaceBySuffix(sourceFile, 'Emits')
  }
  if (emitsInterface) {
    events.push(...collectFromCallSignatures(emitsInterface.members, sourceFile))
  }

  // 2) defineEmits<{...}>() 内联
  if (events.length === 0) {
    function visit(node) {
      if (
        ts.isCallExpression(node)
        && node.expression.getText(sourceFile) === 'defineEmits'
        && node.typeArguments
        && node.typeArguments.length > 0
      ) {
        const typeArg = node.typeArguments[0]
        if (ts.isTypeLiteralNode(typeArg)) {
          events.push(...collectFromCallSignatures(typeArg.members, sourceFile))
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)
  }

  return events
}

/** 从模板中提取具名插槽 */
function parseSlots(templateContent) {
  const slots = []
  const re = /<slot\s+name=["']([^"']+)["']/g
  let match = re.exec(templateContent)
  while (match !== null) {
    if (!slots.includes(match[1])) {
      slots.push(match[1])
    }
    match = re.exec(templateContent)
  }
  return slots
}

/** markdown 表格对齐：按列宽 padEnd，每行 `| a | b |`；表头后插入 `| --- |` 分隔行（缺了它 markdown 不会解析为表格） */
function alignTable(rows) {
  const colCount = rows[0].length
  const widths = Array.from(
    { length: colCount },
    (_, i) => Math.max(...rows.map(r => escapeCell(r[i]).length)),
  )
  const formatRow = row =>
    `| ${row.map((cell, i) => escapeCell(cell).padEnd(widths[i])).join(' | ')} |`.trimEnd()
  const separator = `| ${Array.from({ length: colCount }, () => '---').join(' | ')} |`
  return [
    formatRow(rows[0]),
    separator,
    ...rows.slice(1).map(formatRow),
  ].join('\n')
}

/** 追加 Events / Slots 段落（原子组件与业务模块共用） */
function appendEventAndSlotSections(lines, events, slots) {
  if (events.length > 0) {
    lines.push('### Events')
    lines.push('')
    const rows = [['事件名', '参数', '说明']]
    for (const event of events) {
      rows.push([
        `\`${event.name}\``,
        // 参数文本含 `{ type: string, ... }` 匿名对象时，裸写会被 markdown-it-attrs
        // 误判为元素属性块并注入相邻标签，导致编译期 Duplicate attribute；
        // 仅此时用反引号包裹（code_inline 内 attrs 插件不生效），其余保持裸文本
        event.args && event.args.includes('{') ? `\`${event.args}\`` : (event.args || '—'),
        event.doc || '—',
      ])
    }
    lines.push(alignTable(rows))
    lines.push('')
  }

  if (slots.length > 0) {
    lines.push('### Slots')
    lines.push('')
    const rows = [['插槽名', '说明']]
    for (const slot of slots) {
      rows.push([`\`${slot}\``, '—'])
    }
    lines.push(alignTable(rows))
    lines.push('')
  }
}

/** 嵌套类型最大展开深度（顶层 props 成员为第 1 层） */
const MAX_NESTED_DEPTH = 3

/** 收集源文件中所有 interface 声明：名称 → 节点 */
function collectInterfaces(sourceFile) {
  const map = new Map()
  for (const stmt of sourceFile.statements) {
    if (ts.isInterfaceDeclaration(stmt)) {
      map.set(stmt.name.text, stmt)
    }
  }
  return map
}

/**
 * 构建类型索引：组件 <script setup> 自身 + 同目录 types.ts + 父目录 types.ts。
 * 如 chat/message-list/message-list.vue 的 ChatConfig 定义在 chat/types.ts。
 */
function buildTypeIndex(componentPath, scriptSetupSf) {
  const sources = [scriptSetupSf]
  for (const candidate of [
    join(dirname(componentPath), 'types.ts'),
    join(dirname(dirname(componentPath)), 'types.ts'),
  ]) {
    try {
      const content = readFileSync(candidate, 'utf-8')
      sources.push(ts.createSourceFile(candidate, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS))
    }
    catch {
      // types.ts 不存在则跳过
    }
  }
  const index = new Map()
  for (const sourceFile of sources) {
    for (const [name, node] of collectInterfaces(sourceFile)) {
      if (!index.has(name)) {
        index.set(name, { node, sourceFile })
      }
    }
  }
  return index
}

/**
 * 解析嵌套类型成员：
 * - 匿名对象字面量（{ ... }）直接展开；
 * - 裸标识符引用（如 ChatConfig）在类型索引中查找同名 interface；
 * - 其余（函数 / 联合 / 泛型 / 数组等）返回 null，显示类型原文。
 */
function resolveNestedType(typeNode, typeIndex) {
  if (ts.isTypeLiteralNode(typeNode)) {
    const sourceFile = typeNode.getSourceFile()
    return { members: typeNode.members, sourceFile, doc: null, dedupeKey: null }
  }
  if (ts.isTypeReferenceNode(typeNode) && !typeNode.typeArguments) {
    const name = typeNode.typeName.getText(typeNode.getSourceFile())
    const info = typeIndex.get(name)
    if (info) {
      return {
        members: info.node.members,
        sourceFile: info.sourceFile,
        doc: getDocFirstLine(info.node),
        dedupeKey: name,
      }
    }
  }
  return null
}

/**
 * 紧凑化嵌套成员类型文本：匿名对象压缩为 `{ a?: boolean, b?: string }` 形式
 * （递归去注释，避免未展开成员的原始类型文本含 JSDoc 注释过于冗长）。
 */
function compactTypeText(typeNode, sourceFile) {
  if (ts.isTypeLiteralNode(typeNode)) {
    const parts = []
    for (const child of typeNode.members) {
      if (!ts.isPropertySignature(child)) {
        continue
      }
      const name = child.name.getText(sourceFile)
      const optional = child.questionToken ? '?' : ''
      const typeText = child.type ? compactTypeText(child.type, sourceFile) : 'any'
      parts.push(`${name}${optional}: ${typeText}`)
    }
    return `{ ${parts.join(', ')} }`
  }
  return formatType(typeNode.getText(sourceFile))
}

/**
 * 深度优先收集嵌套类型小节。
 * nestedOnly 为空 = 全量展开；否则仅展开目标路径及其祖先链
 * （如 ['config.messageList'] 会展开 config 与 config.messageList，其余成员显示类型原文）。
 */
function collectNestedSections(member, path, depth, ctx, out) {
  if (depth > MAX_NESTED_DEPTH) {
    return
  }
  if (ctx.nestedOnly && !ctx.nestedOnly.some(n => n === path || n.startsWith(`${path}.`))) {
    return
  }
  const resolved = resolveNestedType(member.type, ctx.typeIndex)
  if (!resolved) {
    return
  }
  if (resolved.dedupeKey) {
    if (ctx.seen.has(resolved.dedupeKey)) {
      return
    }
    ctx.seen.add(resolved.dedupeKey)
  }
  const members = []
  for (const child of resolved.members) {
    if (!ts.isPropertySignature(child)) {
      continue
    }
    members.push({
      name: child.name.getText(resolved.sourceFile),
      type: child.type ? compactTypeText(child.type, resolved.sourceFile) : 'any',
      doc: getDocText(child),
    })
  }
  const doc = resolved.doc ?? getDocFirstLine(member)
  out.push({ path, doc, members })
  for (const child of resolved.members) {
    if (!ts.isPropertySignature(child)) {
      continue
    }
    const childName = child.name.getText(resolved.sourceFile)
    collectNestedSections(child, `${path}.${childName}`, depth + 1, ctx, out)
  }
}

/** 生成业务模块容器 / 顶级容器 API 文档（顶层 Props 表格 + 嵌套类型递归展开子小节） */
function buildModuleMarkdown(entry, root = MODULES_ROOT) {
  const filePath = join(root, entry.file)
  const source = readFileSync(filePath, 'utf-8')
  const { descriptor, errors } = parse(source, { filename: filePath })
  if (errors.length > 0) {
    console.warn(`[skip] ${entry.name}: parse error -> ${errors[0].message}`)
    return null
  }
  const scriptSetup = descriptor.scriptSetup
  if (!scriptSetup) {
    console.warn(`[skip] ${entry.name}: no <script setup>`)
    return null
  }

  const sf = ts.createSourceFile(
    filePath,
    scriptSetup.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )

  // Props：精确 XxxProps 优先，失败后宽松匹配首个 *Props 接口
  const pascal = kebabToPascal(entry.name)
  let propsInterface = sf.statements.find(
    stmt => ts.isInterfaceDeclaration(stmt) && stmt.name.text === `${pascal}Props`,
  )
  if (!propsInterface) {
    propsInterface = findInterfaceBySuffix(sf, 'Props')
  }
  const propsMembers = propsInterface ? parsePropsMembers(propsInterface) : []
  const defaults = parseDefaults(sf)

  // 嵌套类型：索引组件自身 + types.ts，递归展开
  const ctx = {
    typeIndex: buildTypeIndex(filePath, sf),
    nestedOnly: entry.nestedOnly ?? null,
    seen: new Set(),
  }
  const nestedSections = []
  if (propsInterface) {
    for (const member of propsInterface.members) {
      if (!ts.isPropertySignature(member)) {
        continue
      }
      const name = member.name.getText(sf)
      collectNestedSections(member, name, 1, ctx, nestedSections)
    }
  }

  // Events / Slots
  const events = parseEmits(sf, entry.name)
  const slots = parseSlots(descriptor.template?.content ?? '')

  // ---- 生成 markdown ----
  const lines = []
  lines.push('<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->')
  lines.push(`## ${pascal} API`)
  lines.push('')

  if (propsMembers.length > 0) {
    lines.push('### Props')
    lines.push('')
    const rows = [['属性', '类型', '默认值', '说明']]
    for (const member of propsMembers) {
      rows.push([
        member.name,
        `\`${member.type}\``,
        member.name in defaults ? `\`${defaults[member.name]}\`` : '—',
        member.doc || '—',
      ])
    }
    lines.push(alignTable(rows))
    lines.push('')
  }

  for (const section of nestedSections) {
    lines.push(`#### ${section.path}`)
    lines.push('')
    if (section.doc) {
      lines.push(`> ${section.doc}`)
      lines.push('')
    }
    // 嵌套类型成员的默认值写在 JSDoc 第一行，默认值列以「—」占位
    const rows = [['属性', '类型', '默认值', '说明']]
    for (const member of section.members) {
      rows.push([member.name, `\`${member.type}\``, '—', member.doc || '—'])
    }
    lines.push(alignTable(rows))
    lines.push('')
  }

  appendEventAndSlotSections(lines, events, slots)

  return lines.join('\n')
}

function buildMarkdown(componentName, pascal) {
  const filePath = join(COMPONENTS_ROOT, componentName, `${componentName}.vue`)
  const source = readFileSync(filePath, 'utf-8')
  const { descriptor, errors } = parse(source, { filename: filePath })
  if (errors.length > 0) {
    console.warn(`[skip] ${componentName}: parse error -> ${errors[0].message}`)
    return null
  }
  const scriptSetup = descriptor.scriptSetup
  if (!scriptSetup) {
    console.warn(`[skip] ${componentName}: no <script setup>`)
    return null
  }

  const sf = ts.createSourceFile(
    `${componentName}.ts`,
    scriptSetup.content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )

  // Props
  const propsInterface = sf.statements.find(
    stmt => ts.isInterfaceDeclaration(stmt) && stmt.name.text === `${pascal}Props`,
  )
  const propsMembers = propsInterface ? parsePropsMembers(propsInterface) : []
  const defaults = parseDefaults(sf)

  // Events / Slots
  const events = parseEmits(sf, componentName)
  const slots = parseSlots(descriptor.template?.content ?? '')

  // ---- 生成 markdown ----
  const lines = []
  lines.push('<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->')
  lines.push(`## ${pascal} API`)
  lines.push('')

  if (propsMembers.length > 0) {
    lines.push('### Props')
    lines.push('')
    const rows = [['属性', '类型', '默认值', '说明']]
    for (const member of propsMembers) {
      rows.push([
        member.name,
        `\`${member.type}\``,
        member.name in defaults ? `\`${defaults[member.name]}\`` : '—',
        member.doc || '—',
      ])
    }
    lines.push(alignTable(rows))
    lines.push('')
  }

  appendEventAndSlotSections(lines, events, slots)

  return lines.join('\n')
}

// ---- 主流程 ----
mkdirSync(OUTPUT_DIR, { recursive: true })

let success = 0
for (const componentName of COMPONENTS) {
  const pascal = kebabToPascal(componentName)
  const markdown = buildMarkdown(componentName, pascal)
  if (!markdown) {
    continue
  }
  const outFile = join(OUTPUT_DIR, `${componentName}.md`)
  writeFileSync(outFile, markdown, 'utf-8')
  success++
  console.log(`[ok] ${componentName} -> .vitepress/gen/${componentName}.md`)
}

for (const entry of MODULES) {
  const markdown = buildModuleMarkdown(entry)
  if (!markdown) {
    continue
  }
  const outFile = join(OUTPUT_DIR, `${entry.name}.md`)
  writeFileSync(outFile, markdown, 'utf-8')
  success++
  console.log(`[ok] ${entry.name} -> .vitepress/gen/${entry.name}.md`)
}

for (const entry of CONTAINERS) {
  const markdown = buildModuleMarkdown(entry, CONTAINERS_ROOT)
  if (!markdown) {
    continue
  }
  const outFile = join(OUTPUT_DIR, `${entry.name}.md`)
  writeFileSync(outFile, markdown, 'utf-8')
  success++
  console.log(`[ok] ${entry.name} -> .vitepress/gen/${entry.name}.md`)
}

const total = COMPONENTS.length + MODULES.length + CONTAINERS.length
console.log(`\n完成：${success}/${total} 个 API 已生成 -> ${OUTPUT_DIR}`)
