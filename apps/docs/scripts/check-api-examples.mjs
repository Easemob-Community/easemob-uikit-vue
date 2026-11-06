import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const docsRoot = fileURLToPath(new URL('..', import.meta.url))
const packageRoot = resolve(docsRoot, '../../packages')
const apiRoot = process.env.API_EXAMPLES_ROOT ? resolve(process.env.API_EXAMPLES_ROOT) : join(docsRoot, 'api')
const sourceRoots = [
  join(packageRoot, 'uikit-im/src/composables'),
  join(packageRoot, 'uikit-im/src/utils'),
  join(packageRoot, 'uikit-core/src/composables'),
  join(packageRoot, 'uikit-sdk-contract/src/message-preview.ts'),
]
const signatures = new Map()
const errors = []

function files(path) {
  if (!existsSync(path)) return []
  if (statSync(path).isFile()) return /\.(?:ts|md)$/.test(path) ? [path] : []
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const target = join(path, entry.name)
    if (entry.isDirectory()) return files(target)
    return /\.(?:ts|md)$/.test(entry.name) ? [target] : []
  })
}

function addSignature(node) {
  if (!ts.isFunctionDeclaration(node) || !node.name) return
  const parameters = [...node.parameters]
  const required = parameters.filter(parameter => !parameter.questionToken && !parameter.initializer && !parameter.dotDotDotToken).length
  const record = {
    min: required,
    max: parameters.length,
    types: parameters.map(parameter => parameter.type?.getText() ?? ''),
  }
  const name = node.name.text
  signatures.set(name, [...(signatures.get(name) ?? []), record])
}

function registerSource(path) {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  function visit(node) {
    addSignature(node)
    ts.forEachChild(node, visit)
  }
  visit(source)
}

for (const root of sourceRoots) {
  for (const path of files(root).filter(path => path.endsWith('.ts'))) registerSource(path)
}

const loginSource = ts.createSourceFile(
  'use-uikit.ts',
  readFileSync(join(packageRoot, 'uikit-core/src/composables/use-uikit.ts'), 'utf8'),
  ts.ScriptTarget.Latest,
  true,
)
const loginFields = new Set()
for (const statement of loginSource.statements) {
  if (ts.isInterfaceDeclaration(statement) && statement.name.text === 'CoreUIKitLoginParams') {
    for (const member of statement.members) {
      if (ts.isPropertySignature(member) && ts.isIdentifier(member.name)) loginFields.add(member.name.text)
    }
  }
}

function checkCall(call, documentPath) {
  if (call.arguments.some(argument => /^[A-Za-z_$][\w$]*\s*:/.test(argument.getText().trim()))) return
  if (call.arguments.some(argument => ts.isArrowFunction(argument) && argument.parameters.some(parameter => parameter.type))) return
  const expression = call.expression
  const name = ts.isIdentifier(expression)
    ? expression.text
    : ts.isPropertyAccessExpression(expression)
      ? expression.name.text
      : ''
  const candidates = signatures.get(name)
  if (!candidates) return
  const count = call.arguments.length
  if (!candidates.some(candidate => count >= candidate.min && count <= candidate.max)) {
    const ranges = candidates.map(candidate => candidate.min === candidate.max ? `${candidate.min}` : `${candidate.min}-${candidate.max}`).join(', ')
    errors.push(`${documentPath}: ${name} 参数数量 ${count} 与源码要求 ${ranges} 不符`)
  }
  if (name === 'login' && count > 0 && ts.isObjectLiteralExpression(call.arguments[0])) {
    for (const property of call.arguments[0].properties) {
      if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && !loginFields.has(property.name.text)) {
        errors.push(`${documentPath}: login 包含 CoreUIKitLoginParams 未定义字段 ${property.name.text}`)
      }
    }
  }
  if (name === 'addBlock' && count > 0 && ts.isStringLiteral(call.arguments[0])) {
    errors.push(`${documentPath}: addBlock 需要 Contact 对象，不能传 userId 字符串`)
  }
  if (name === 'resolveLastMessageText' && count > 1 && ts.isObjectLiteralExpression(call.arguments[1])) {
    errors.push(`${documentPath}: resolveLastMessageText 第二参数必须是 resolver 函数，labels 应放在第五参数`)
  }
}

function inspectTypeScript(code, documentPath) {
  const source = ts.createSourceFile(documentPath, code, ts.ScriptTarget.Latest, true)
  function visit(node) {
    if (ts.isCallExpression(node)) checkCall(node, documentPath)
    ts.forEachChild(node, visit)
  }
  visit(source)
}

for (const path of files(apiRoot).filter(path => path.endsWith('.md'))) {
  const documentPath = relative(apiRoot, path)
  const markdown = readFileSync(path, 'utf8')
  for (const match of markdown.matchAll(/```ts\s*\n([\s\S]*?)```/g)) {
    const code = match[1]
    const isTypeSignature = !/\b(?:import|const|let|var|await|return|function|async|export|interface|type)\b/.test(code)
      && /:\s*[^,()]+/.test(code)
    if (!isTypeSignature) inspectTypeScript(code, documentPath)
  }
  for (const match of markdown.matchAll(/`([^`\n]+)`/g)) {
    const inline = match[1]
    if (inline.includes(':') || inline.includes('<') || inline.includes('...')) continue
    for (const call of inline.matchAll(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\(([^()]*)\)/g)) {
      inspectTypeScript(`const __result = ${call[1]}(${call[2]})`, documentPath)
    }
  }
}

if (errors.length) {
  console.error(`✗ API 示例签名检查失败（${errors.length} 项）：`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('✓ Vue API Markdown 示例参数数量与关键参数类型检查通过')
