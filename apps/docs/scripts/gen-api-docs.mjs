/**
 * UIKit API 文档自动生成脚本
 *
 * 解析组件 <script setup> 中的：
 * - `export interface XxxProps`（属性 + JSDoc 注释）
 * - `withDefaults(defineProps<XxxProps>(), {...})` 默认值
 * - `export interface XxxEmits` / `defineEmits<{...}>()` 事件
 * - 模板中的 <slot name="..."> 插槽
 *
 * 生成 markdown 表格片段，输出到 .vitepress/gen/<component>.md，
 * 组件页通过 `<!-- @include: ../.vitepress/gen/<component>.md -->` 引用。
 *
 * 用法：pnpm gen:api（支持增量重跑，重复执行覆盖生成）
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@vue/compiler-sfc'
import ts from 'typescript'

const __dirname = dirname(fileURLToPath(import.meta.url))
const COMPONENTS_ROOT = join(__dirname, '../../../packages/uikit/src/components')
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

function kebabToPascal(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/** 取 JSDoc 注释的第一行文本 */
function getDocText(node) {
  const jsDocs = node.jsDoc
  if (!jsDocs || jsDocs.length === 0) return ''
  const comment = jsDocs[0].comment
  if (!comment) return ''
  const text = Array.isArray(comment)
    ? comment.map((part) => part.text ?? '').join('')
    : comment.text ?? String(comment)
  return text.split('\n')[0].trim()
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

/** 解析 Props 接口成员 */
function parsePropsMembers(interfaceNode) {
  const members = []
  for (const member of interfaceNode.members) {
    if (!ts.isPropertySignature(member)) continue
    const name = member.name.getText(interfaceNode.getSourceFile())
    const type = member.type
      ? formatType(member.type.getText(interfaceNode.getSourceFile()))
      : 'any'
    members.push({ name, type, doc: getDocText(member) })
  }
  return members
}

/** 解析 withDefaults 默认值 */
function parseDefaults(sourceFile, propsInterfaceName) {
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

/** 解析事件：兼容 interface XxxEmits 与 defineEmits<{...}> 两种写法 */
function parseEmits(sourceFile, componentName) {
  const events = []
  const pascal = kebabToPascal(componentName)
  const interfaceName = `${pascal}Emits`
  const sf = sourceFile

  function collectFromCallSignatures(signatures, sourceFile) {
    for (const sig of signatures) {
      if (!ts.isCallSignatureDeclaration(sig)) continue
      const params = sig.parameters
      if (params.length === 0) continue
      // 第一个参数为事件名字面量
      const nameParam = params[0]
      const nameType = nameParam.type
      let eventName = ''
      if (nameType && ts.isLiteralTypeNode(nameType) && ts.isStringLiteral(nameType.literal)) {
        eventName = nameType.literal.text
      }
      if (!eventName) continue
      // 其余参数为事件负载
      const args = params.slice(1).map((p) => {
        const typeText = p.type ? formatType(p.type.getText(sourceFile)) : 'any'
        return `${p.name.getText(sourceFile)}: ${typeText}`
      })
      events.push({ name: eventName, args: args.join(', '), doc: getDocText(sig) })
    }
  }

  // 1) interface XxxEmits
  for (const stmt of sf.statements) {
    if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === interfaceName) {
      collectFromCallSignatures(stmt.members, sf)
      break
    }
  }

  // 2) defineEmits<{...}>() 内联
  if (events.length === 0) {
    function visit(node) {
      if (
        ts.isCallExpression(node)
        && node.expression.getText(sf) === 'defineEmits'
        && node.typeArguments
        && node.typeArguments.length > 0
      ) {
        const typeArg = node.typeArguments[0]
        if (ts.isTypeLiteralNode(typeArg)) {
          collectFromCallSignatures(typeArg.members, sf)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }

  return events
}

/** 从模板中提取具名插槽 */
function parseSlots(templateContent) {
  const slots = []
  const re = /<slot\s+name=["']([^"']+)["']/g
  let match
  while ((match = re.exec(templateContent))) {
    if (!slots.includes(match[1])) slots.push(match[1])
  }
  return slots
}

/** markdown 表格对齐：按列宽 padEnd，每行 `| a | b |`；表头后插入 `| --- |` 分隔行（缺了它 markdown 不会解析为表格） */
function alignTable(rows) {
  const colCount = rows[0].length
  const widths = Array.from({ length: colCount }, (_, i) =>
    Math.max(...rows.map((r) => escapeCell(r[i]).length)),
  )
  const formatRow = (row) =>
    `| ${row.map((cell, i) => escapeCell(cell).padEnd(widths[i])).join(' | ')} |`.trimEnd()
  const separator = `| ${Array.from({ length: colCount }, () => '---').join(' | ')} |`
  return [
    formatRow(rows[0]),
    separator,
    ...rows.slice(1).map(formatRow),
  ].join('\n')
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
    (stmt) => ts.isInterfaceDeclaration(stmt) && stmt.name.text === `${pascal}Props`,
  )
  const propsMembers = propsInterface ? parsePropsMembers(propsInterface) : []
  const defaults = parseDefaults(sf, `${pascal}Props`)

  // Events / Slots
  const events = parseEmits(sf, componentName)
  const slots = parseSlots(descriptor.template?.content ?? '')

  // ---- 生成 markdown ----
  const lines = []
  lines.push(`<!-- 由 scripts/gen-api-docs.mjs 自动生成，请勿手动编辑 -->`)
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

  if (events.length > 0) {
    lines.push('### Events')
    lines.push('')
    const rows = [['事件名', '参数', '说明']]
    for (const event of events) {
      rows.push([
        `\`${event.name}\``,
        event.args || '—',
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

  return lines.join('\n')
}

// ---- 主流程 ----
mkdirSync(OUTPUT_DIR, { recursive: true })

let success = 0
for (const componentName of COMPONENTS) {
  const pascal = kebabToPascal(componentName)
  const markdown = buildMarkdown(componentName, pascal)
  if (!markdown) continue
  const outFile = join(OUTPUT_DIR, `${componentName}.md`)
  writeFileSync(outFile, markdown, 'utf-8')
  success++
  console.log(`[ok] ${componentName} -> .vitepress/gen/${componentName}.md`)
}

console.log(`\n完成：${success}/${COMPONENTS.length} 个组件 API 已生成 -> ${OUTPUT_DIR}`)
