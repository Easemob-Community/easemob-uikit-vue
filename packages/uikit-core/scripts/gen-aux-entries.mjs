/* eslint-disable no-console -- CLI 脚本日志与退出码（同 sync-vendor.mjs 约定） */
/**
 * 参数化生成按需引入工具入口（工具链防复制：各包一份产物，模板与派生逻辑只此一处）。
 *
 * 为指定包生成两个 aux 入口源文件：
 * - src/resolver.ts     —— unplugin-vue-components 解析器（包名/前缀/导出名参数化）
 * - src/auto-imports.ts —— unplugin-auto-import 的「业务主 hook」白名单
 *
 * auto-imports 白名单派生逻辑（取代原 uikit-im scripts/check-auto-imports.mjs）：
 * 1. 扫描配置 scan 指定的 composables 入口（桶文件或目录）：
 *    - 桶文件：跟进 `export * from './xxx'`（递归）提取 `export function/const <Name>`，
 *      并捕获 `export { a, b as c } from '<pkg>'` 的具名 re-export（跳过 export type）；
 *    - 目录：直接扫描目录下一层所有 *.ts；
 * 2. 剔除 exclude（内部实现细节，业务侧按需显式 import）；
 * 3. 追加 include（composables 之外的合法登记，如 locale 模块的 useLocale）；
 * 4. 排序后写入模板。
 *
 * 用法：
 *   node gen-aux-entries.mjs <pkgRoot>           生成/更新两个入口文件
 *   node gen-aux-entries.mjs <pkgRoot> --check   只校验不写入，漂移即非零退出（build 前置）
 *
 * 包根需有 aux-entries.config.mjs（default export）：
 *   {
 *     pkgName: '@easemob/uikit-im',        // 必填，resolver 的 from 与 auto-imports 的 key
 *     resolverName: 'EasemobUIKitResolver',// 必填
 *     importsName: 'EasemobUIKitImports',  // 必填
 *     prefix: 'Em',                        // 可选，默认 'Em'
 *     scan: ['src/composables/index.ts'],  // 必填，桶文件或目录（相对包根），可多个
 *     exclude: [...],                      // 可选，内部实现细节名单
 *     include: ['useLocale'],              // 可选，额外合法登记
 *     exampleComponent: 'EmXxx',           // 可选，resolver 注释示例组件名，默认 `${prefix}ChatContainer`
 *   }
 *
 * 挂载：core 与 uikit-im 的 build 前置 `--check`；改动 composables 导出后跑
 * `pnpm -F <pkg> aux:gen` 重新生成。
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

const args = process.argv.slice(2)
const checkMode = args.includes('--check')
const pkgRoot = resolve(args.find(a => !a.startsWith('--')) ?? '.')

function fail(msg) {
  console.error(`\n[gen-aux-entries] ${msg}\n`)
  process.exit(1)
}

// ---------- 读取包配置 ----------
const configPath = resolve(pkgRoot, 'aux-entries.config.mjs')
if (!existsSync(configPath))
  fail(`未找到 ${configPath}，请先在包根创建 aux-entries.config.mjs`)
const config = (await import(pathToFileURL(configPath).href)).default
const {
  pkgName,
  resolverName,
  importsName,
  prefix = 'Em',
  scan = [],
  exclude = [],
  include = [],
  exampleComponent = `${prefix}ChatContainer`,
} = config
if (!pkgName || !resolverName || !importsName || scan.length === 0)
  fail('aux-entries.config.mjs 缺少必填字段：pkgName / resolverName / importsName / scan')

// ---------- 从 scan 入口派生 hook 名单 ----------
const EXPORT_DECL_RE = /export (?:async )?(?:function|const) ([A-Za-z_$][\w$]*)/g
const EXPORT_STAR_RE = /export \* from '\.\/([^']+)'/g
// 具名 re-export（export type 单独一行不匹配；花括号内的行内 type 成员在解析时剔除）
const EXPORT_NAMED_RE = /export\s+\{([^}]*)\}\s*from\s*'[^']+'/g

const names = new Set()
const visited = new Set()

function scanTsFile(file) {
  const real = resolve(file)
  if (visited.has(real))
    return
  visited.add(real)
  const src = readFileSync(real, 'utf-8')
  for (const m of src.matchAll(EXPORT_DECL_RE))
    names.add(m[1])
  // 具名 re-export（含跨包 re-export core 符号），取 as 后的别名
  for (const m of src.matchAll(EXPORT_NAMED_RE)) {
    for (const part of m[1].split(',')) {
      const seg = part.trim()
      if (!seg || seg.startsWith('type '))
        continue
      const asMatch = seg.match(/(?:\bas\s+)?([A-Za-z_$][\w$]*)$/)
      if (asMatch)
        names.add(asMatch[1])
    }
  }
  // 跟进 export * from './xxx'
  for (const m of src.matchAll(EXPORT_STAR_RE))
    scanTsFile(resolve(dirname(real), `${m[1]}.ts`))
}

function scanEntry(entry) {
  const abs = resolve(pkgRoot, entry)
  if (!existsSync(abs))
    fail(`scan 入口不存在：${abs}`)
  if (statSync(abs).isDirectory()) {
    for (const f of readdirSync(abs)) {
      if (f.endsWith('.ts') && !f.endsWith('.d.ts'))
        scanTsFile(join(abs, f))
    }
  }
  else {
    scanTsFile(abs)
  }
}

for (const entry of scan)
  scanEntry(entry)

const excluded = new Set(exclude)
const hooks = [...names].filter(n => !excluded.has(n))
for (const n of include) {
  if (!hooks.includes(n))
    hooks.push(n)
}
hooks.sort()

// ---------- 模板 ----------
const header = `/**
 * ⚠️ 本文件由 packages/uikit-core/scripts/gen-aux-entries.mjs 参数化生成，勿手改。
 * 配置见包根 aux-entries.config.mjs；composables 导出变更后执行 pnpm -F ${pkgName} aux:gen 重新生成，
 * build 前置 --check 会校验漂移。
 */
`

function renderResolver() {
  return `${header}
export interface ComponentResolver {
  type: string
  resolve: (name: string) => { name: string, from: string } | undefined
}

export interface ${resolverName}Options {
  /**
   * 组件名前缀，必须与 PascalCase 名称的开头一致。
   * 默认 '${prefix}'，例如模板中写 <${exampleComponent} /> 会被解析到 ${pkgName} 的 ${exampleComponent} 导出。
   */
  prefix?: string
}

/**
 * unplugin-vue-components 的解析器，启用后模板中带前缀的组件可以自动按需引入。
 *
 * 使用示例：
 * \`\`\`ts
 * import Components from 'unplugin-vue-components/vite'
 * import { ${resolverName} } from '${pkgName}/resolver'
 *
 * export default {
 *   plugins: [Components({ resolvers: [${resolverName}()] })],
 * }
 * \`\`\`
 */
export function ${resolverName}(
  options: ${resolverName}Options = {},
): ComponentResolver {
  const prefix = options.prefix ?? '${prefix}'
  return {
    type: 'component',
    resolve: (name: string) => {
      if (!name.startsWith(prefix))
        return
      // 直接返回 PascalCase 名称，对应 ${pkgName} 的命名导出
      // 例如 <${exampleComponent} /> -> import { ${exampleComponent} } from '${pkgName}'
      return {
        name,
        from: '${pkgName}',
      }
    },
  }
}
`
}

function renderAutoImports() {
  return `${header}
/**
 * unplugin-auto-import 的「业务主 hook」白名单（${pkgName} 包自动导入）。
 *
 * 约定：仅登记**面向业务集成的完整能力 hook**；内部实现细节（存储抽象 /
 * provider 装配 / 内部状态工具等）不自动导入，业务侧按需显式 import。
 */
export const ${importsName} = {
  '${pkgName}': [
${hooks.map(h => `    '${h}',`).join('\n')}
  ],
}
`
}

// ---------- 写入或校验 ----------
for (const [file, content] of [
  ['src/resolver.ts', renderResolver()],
  ['src/auto-imports.ts', renderAutoImports()],
]) {
  const target = resolve(pkgRoot, file)
  if (checkMode) {
    if (!existsSync(target))
      fail(`${file} 不存在，请执行 aux:gen 生成`)
    if (readFileSync(target, 'utf-8') !== content)
      fail(`${file} 与派生结果漂移（composables 导出或配置已变更），请执行 pnpm -F ${pkgName} aux:gen 重新生成`)
    console.log(`[gen-aux-entries] OK：${pkgName} ${file} 与派生结果一致`)
  }
  else {
    writeFileSync(target, content)
    console.log(`[gen-aux-entries] 已生成 ${pkgName} ${file}`)
  }
}
if (!checkMode)
  console.log(`[gen-aux-entries] ${pkgName} 白名单共 ${hooks.length} 个 hook`)
