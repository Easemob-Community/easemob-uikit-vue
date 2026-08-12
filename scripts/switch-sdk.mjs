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
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
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
else {
  console.error(`[switch-sdk] 未知参数：${arg}（支持：tgz / npm / status）`)
  process.exit(1)
}

function runInstall() {
  console.log('[switch-sdk] 执行 pnpm install ...')
  const result = spawnSync('pnpm', ['install'], { cwd: ROOT, stdio: 'inherit', shell: true })
  if (result.status !== 0)
    process.exit(result.status ?? 1)
  console.log(`[switch-sdk] pnpm install 完成，当前模式：${readMode()}`)
}
