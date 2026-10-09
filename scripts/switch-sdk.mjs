#!/usr/bin/env node
/**
 * SDK 引入模式切换脚本（easemob-websdk）
 *
 * 两种模式：
 * - npm（默认/生产）：依赖声明为 npm 版本（^5.0.0），发布与构建使用 npm registry 包
 * - tgz（dev 联调）：在根 package.json 的 pnpm.overrides 中指向本地 tgz 包，
 *   本地安装/构建全部使用 tgz 内容，无需改动子包依赖声明
 *
 * 用法：
 *   node scripts/switch-sdk.mjs           # 查看当前模式
 *   node scripts/switch-sdk.mjs tgz       # 切换到 tgz 模式（需重新 pnpm install）
 *   node scripts/switch-sdk.mjs npm       # 切回 npm 模式（需重新 pnpm install）
 *   node scripts/switch-sdk.mjs tgz --install  # 切换后自动执行 pnpm install
 *   node scripts/switch-sdk.mjs up        # 升级 SDK 到 range 内最新（不改写子包声明，声明恒为 ^5.0.0）
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PKG_PATH = resolve(ROOT, 'package.json')
const SDK_NAME = 'easemob-websdk'
const TGZ_FILE = 'easemob-websdk-5.0.0.tgz'

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf-8'))

function readMode() {
  return pkg.pnpm?.overrides?.[SDK_NAME] === `file:./${TGZ_FILE}`
    ? 'tgz'
    : 'npm'
}

function writePkg() {
  writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`)
}

function setTgzMode() {
  if (readMode() === 'tgz') {
    console.log('[switch-sdk] 当前已是 tgz 模式，无需切换。')
    return false
  }
  const tgzPath = resolve(ROOT, TGZ_FILE)
  if (!existsSync(tgzPath)) {
    console.error(`[switch-sdk] 未找到本地 tgz 包：${TGZ_FILE}`)
    console.error('[switch-sdk] 请将 SDK 的 tgz 包放到仓库根目录后重试。')
    process.exit(1)
  }
  pkg.pnpm ??= {}
  pkg.pnpm.overrides ??= {}
  pkg.pnpm.overrides[SDK_NAME] = `file:./${TGZ_FILE}`
  writePkg()
  console.log(`[switch-sdk] 已切换到 tgz 模式：pnpm.overrides.${SDK_NAME} = file:./${TGZ_FILE}`)
  return true
}

function setNpmMode() {
  if (readMode() === 'npm') {
    console.log('[switch-sdk] 当前已是 npm 模式（使用 npm registry 版本），无需切换。')
    return false
  }
  delete pkg.pnpm.overrides[SDK_NAME]
  if (Object.keys(pkg.pnpm.overrides).length === 0)
    delete pkg.pnpm.overrides
  if (pkg.pnpm && Object.keys(pkg.pnpm).length === 0)
    delete pkg.pnpm
  writePkg()
  console.log('[switch-sdk] 已切回 npm 模式：移除 overrides，使用 npm registry 版本。')
  return true
}

const arg = process.argv[2] ?? 'status'
const autoInstall = process.argv.includes('--install')

if (arg === 'tgz') {
  if (setTgzMode() && autoInstall)
    runInstall()
}
else if (arg === 'npm') {
  if (setNpmMode() && autoInstall)
    runInstall()
}
else if (arg === 'status') {
  console.log(`[switch-sdk] 当前 SDK 引入模式：${readMode()}${readMode() === 'npm' ? '（生产默认）' : '（本地 tgz 联调）'}`)
  console.log('[switch-sdk] 提示：切换模式后需执行 pnpm install 生效；切换脚本本身不自动重装（可加 --install）。')
}
else if (arg === 'up') {
  upgradeSdk()
}
else {
  console.error(`[switch-sdk] 未知参数：${arg}（支持：tgz / npm / status / up）`)
  process.exit(1)
}

/**
 * 升级 SDK 到依赖声明 range 内最新版本。
 * `pnpm up -r` 会把各 workspace 包的 `"easemob-websdk": "^5.0.0"` 声明改写成最新版本号
 * （--lockfile-only 也不例外），违反「声明恒为 ^5.0.0」约定；
 * 因此先快照声明，升级后按原文恢复，再 pnpm install 落地 lockfile 解析结果。
 */
function upgradeSdk() {
  const manifests = collectSdkManifests()
  const snapshots = new Map()
  for (const file of manifests) {
    const text = readFileSync(file, 'utf-8')
    const match = text.match(new RegExp(`("${SDK_NAME}":\\s*")([^"]+)(")`))
    if (match)
      snapshots.set(file, { text, spec: match[2] })
  }
  console.log(`[switch-sdk] 升级 ${SDK_NAME} 至 range 内最新（快照 ${snapshots.size} 处声明）...`)
  const up = spawnSync('pnpm', ['up', '-r', SDK_NAME], { cwd: ROOT, stdio: 'inherit', shell: true })
  if (up.status !== 0)
    process.exit(up.status ?? 1)
  let restored = 0
  for (const [file, snap] of snapshots) {
    const current = readFileSync(file, 'utf-8')
    if (current === snap.text)
      continue
    const restoredText = current.replace(
      new RegExp(`("${SDK_NAME}":\\s*")[^"]+(")`),
      `$1${snap.spec}$2`,
    )
    writeFileSync(file, restoredText)
    restored++
  }
  if (restored > 0)
    console.log(`[switch-sdk] 已恢复 ${restored} 处依赖声明（声明恒为 ${[...snapshots.values()][0]?.spec}，仅 lockfile 跟进最新）`)
  runInstall()
}

/** 收集声明了 easemob-websdk 的 workspace manifest（根 + packages/* + apps/*） */
function collectSdkManifests() {
  const files = [PKG_PATH]
  for (const dir of ['packages', 'apps']) {
    const base = join(ROOT, dir)
    if (!existsSync(base))
      continue
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory())
        continue
      const manifest = join(base, entry.name, 'package.json')
      if (!existsSync(manifest))
        continue
      if (readFileSync(manifest, 'utf-8').includes(`"${SDK_NAME}"`))
        files.push(manifest)
    }
  }
  return files
}

function runInstall() {
  console.log('[switch-sdk] 执行 pnpm install ...')
  const result = spawnSync('pnpm', ['install'], { cwd: ROOT, stdio: 'inherit', shell: true })
  if (result.status !== 0)
    process.exit(result.status ?? 1)
  console.log(`[switch-sdk] pnpm install 完成，当前模式：${readMode()}`)
}
