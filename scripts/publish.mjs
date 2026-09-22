#!/usr/bin/env node
/**
 * 发布编排脚本（@easemob/* 全家桶）
 *
 * 默认演练模式（dry-run）：跑发布门禁 + 构建 + pnpm pack + npm publish --dry-run，
 * 不上传任何东西，用于发布前核对产物。
 * 显式加 --publish 才真实发布：npm publish 弹出浏览器完成 passkey 2FA 验证。
 *
 * 为什么用 pnpm pack + npm publish 组合：
 * - 子包之间用 workspace:^ 互引，npm publish 不会改写该协议（消费者会解析失败），
 *   pnpm pack 会在产物 manifest 中改写为真实版本号；
 * - 浏览器 passkey 2FA 挑战是 npm CLI 的能力，pnpm 9 不支持，所以发布动作交给 npm。
 *
 * 用法：
 *   node scripts/publish.mjs                        # 演练（默认）
 *   node scripts/publish.mjs --publish              # 真实发布（浏览器 2FA）
 *   node scripts/publish.mjs --only uikit-im        # 只处理指定包（短名，可逗号分隔多个）
 *   node scripts/publish.mjs --from uikit-core      # 从指定包开始按拓扑顺序处理
 *   node scripts/publish.mjs --skip-build           # 跳过构建（确认 dist 已是最新时用）
 *
 * 发布顺序为依赖拓扑序，已在 PACKAGES 中固化；某版本已存在于 registry 时自动跳过。
 * 所有 npm 调用固定 --registry=https://registry.npmjs.org（本机全局 .npmrc 可能指向
 * npmmirror 等只读镜像，镜像不能用于发布与已发布版本检查）。
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const NPM_REGISTRY = 'https://registry.npmjs.org'

const PACKAGES = [
  { dir: 'packages/uikit-sdk-contract', short: 'sdk-contract' },
  { dir: 'packages/uikit-core', short: 'core' },
  { dir: 'packages/uikit-sdk-websdk5', short: 'sdk-websdk5' },
  { dir: 'packages/uikit-sdk-webim4', short: 'sdk-webim4' },
  { dir: 'packages/uikit-im', short: 'im' },
  { dir: 'packages/uikit-chatroom', short: 'chatroom' },
  { dir: 'packages/mcp', short: 'mcp' },
]

const args = process.argv.slice(2)
const isPublish = args.includes('--publish')
const skipBuild = args.includes('--skip-build')

function readFlagValue(flag) {
  const idx = args.indexOf(flag)
  return idx >= 0 ? (args[idx + 1] ?? '') : ''
}

function fail(msg) {
  console.error(`[publish] ✗ ${msg}`)
  process.exit(1)
}

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: false, ...opts })
  if (result.status !== 0)
    fail(`${cmd} ${cmdArgs.join(' ')} 退出码 ${result.status ?? 'unknown'}`)
  return result
}

function runCapture(cmd, cmdArgs) {
  return spawnSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf-8', shell: false })
}

// 解析包选择
let selected = PACKAGES.map(p => ({ ...p }))
const only = readFlagValue('--only')
const from = readFlagValue('--from')
if (only) {
  const names = only.split(',').map(s => s.trim()).filter(Boolean)
  selected = selected.filter(p => names.includes(p.short) || names.includes(p.dir))
  if (selected.length === 0)
    fail(`--only 未匹配到任何包：${only}（可选：${PACKAGES.map(p => p.short).join(', ')}）`)
}
else if (from) {
  const idx = selected.findIndex(p => p.short === from || p.dir === from)
  if (idx < 0)
    fail(`--from 未匹配到任何包：${from}`)
  selected = selected.slice(idx)
}

// 读取各包 name/version
for (const p of selected) {
  const pkgJson = JSON.parse(readFileSync(resolve(ROOT, p.dir, 'package.json'), 'utf-8'))
  p.name = pkgJson.name
  p.version = pkgJson.version
}

console.log(`[publish] 模式：${isPublish ? '真实发布（将弹浏览器 2FA 验证）' : '演练（dry-run，不上传）'}`)
console.log(`[publish] 待处理包：${selected.map(p => `${p.name}@${p.version}`).join(' → ')}`)

// ---------- 门禁 ----------
console.log('\n[publish] ── 门禁检查 ──')

// 1. pnpm.overrides 不得残留任何 file: 本地包（SDK tgz 联调 / 内部包 tgz 验证都会污染构建与依赖解析）
const rootPkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
const fileOverrides = Object.entries(rootPkg.pnpm?.overrides ?? {})
  .filter(([, v]) => typeof v === 'string' && v.startsWith('file:'))
if (fileOverrides.length > 0) {
  console.error('[publish] ✗ 根 package.json 的 pnpm.overrides 仍指向本地 tgz：')
  for (const [k, v] of fileOverrides)
    console.error(`[publish]   ${k} → ${v}`)
  fail('请先移除上述 overrides 并 pnpm install，确保发布基于 registry/工作区真实依赖')
}
console.log('[publish] ✓ pnpm.overrides 无本地 tgz 残留')

// 2. 版本号与根 CHANGELOG 同步
run('node', ['scripts/check-version-sync.mjs'])

// 3. 暂存区不得混入产物
const staged = runCapture('git', ['diff', '--cached', '--name-only'])
if (staged.status === 0) {
  const bad = staged.stdout.split('\n').filter(f => /dist\/|node_modules\/|\.tgz$/.test(f))
  if (bad.length > 0)
    fail(`暂存区混入产物/依赖文件：${bad.join(', ')}`)
}
console.log('[publish] ✓ 暂存区无产物混入')

// 4. 登录态：真实发布必须已登录；演练只提示
const whoami = runCapture('npm', ['whoami', '--registry', NPM_REGISTRY])
if (whoami.status === 0) {
  console.log(`[publish] ✓ npm 已登录（${NPM_REGISTRY}）：${whoami.stdout.trim()}`)
}
else if (isPublish) {
  fail(`未登录 npm 官方 registry，请先执行 npm login --registry ${NPM_REGISTRY}（浏览器流程）`)
}
else {
  console.log(`[publish] ! 未登录 npm 官方 registry（演练不影响；真实发布前需 npm login --registry ${NPM_REGISTRY}）`)
}

// ---------- 逐包处理 ----------
const packDir = mkdtempSync(join(tmpdir(), 'easemob-publish-'))
console.log(`\n[publish] 打包临时目录：${packDir}`)

let done = 0
let skipped = 0
try {
  for (const p of selected) {
    console.log(`\n[publish] ── ${p.name}@${p.version} ──`)

    // 已发布则跳过（幂等，可重复跑）
    const view = runCapture('npm', ['view', `${p.name}@${p.version}`, 'version', '--registry', NPM_REGISTRY])
    if (view.status === 0 && view.stdout.trim()) {
      console.log(`[publish] ↷ registry 已存在 ${p.name}@${p.version}，跳过`)
      skipped++
      continue
    }

    if (!skipBuild)
      run('pnpm', ['-F', p.name, 'build'])

    // pnpm pack：改写 workspace: 协议为真实版本号
    run('pnpm', ['--dir', p.dir, 'pack', '--pack-destination', packDir])
    const tgz = readdirSync(packDir).find(f => f.endsWith('.tgz'))
    if (!tgz)
      fail(`${p.name} pack 后未找到 tgz 产物`)
    const tgzPath = join(packDir, tgz)

    // 校验产物 manifest 不含 workspace: 协议
    const manifest = runCapture('tar', ['-xzOf', tgzPath, 'package/package.json'])
    if (manifest.status !== 0)
      fail(`读取 ${tgz} 内 package.json 失败`)
    if (manifest.stdout.includes('workspace:'))
      fail(`${p.name} 产物 manifest 仍含 workspace: 协议，禁止发布`)

    if (isPublish)
      run('npm', ['publish', tgzPath, '--access', 'public', '--registry', NPM_REGISTRY])
    else
      run('npm', ['publish', tgzPath, '--dry-run', '--access', 'public', '--registry', NPM_REGISTRY])

    rmSync(tgzPath, { force: true })
    done++
  }
}
finally {
  if (existsSync(packDir))
    rmSync(packDir, { recursive: true, force: true })
}

console.log(`\n[publish] 完成：处理 ${done} 个，跳过 ${skipped} 个（已发布）。`)
if (!isPublish)
  console.log('[publish] 以上为演练结果；确认无误后执行：node scripts/publish.mjs --publish')
