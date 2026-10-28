#!/usr/bin/env node
/**
 * UIKit 发布标签：校验目标提交中的真实包版本与 CHANGELOG，再创建 annotated tag。
 *
 * 演练（只校验，不写本地/远端标签）：
 *   node scripts/tag-uikit-release.mjs 3.11.0 25436df2
 * 创建并推送：
 *   pnpm release:tag -- 3.11.0 25436df2 --push
 * 发布成功后推签失败时，核对原发布提交后用同一命令恢复；不要改用新的 HEAD。
 */
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PACKAGE_PATHS = ['packages/uikit-im/package.json', 'packages/uikit/package.json']

function runGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false })
  if (result.status !== 0)
    throw new Error(`git ${args.join(' ')} 失败：${result.stderr.trim() || `退出码 ${result.status ?? 'unknown'}`}`)
  return result.stdout.trim()
}

function tryGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', shell: false })
  return result.status === 0 ? result.stdout.trim() : ''
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function assertCleanReleaseWorktree(cwd = ROOT) {
  const status = runGit(cwd, ['status', '--porcelain'])
  if (status)
    throw new Error(`工作区不干净，真实发布会构建出与 HEAD/tag 不一致的产物；请先提交或移走改动：\n${status}`)
}

export function tagUIKitRelease({ version, commit, push = false, cwd = ROOT, remote = 'origin' }) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9a-z.-]+)?$/i.test(version))
    throw new Error(`非法 UIKit 版本号：${version}`)

  const targetCommit = runGit(cwd, ['rev-parse', '--verify', `${commit}^{commit}`])
  let pkg
  for (const path of PACKAGE_PATHS) {
    const source = tryGit(cwd, ['show', `${targetCommit}:${path}`])
    if (source) {
      pkg = JSON.parse(source)
      break
    }
  }
  if (!pkg)
    throw new Error(`目标提交 ${targetCommit} 中找不到 UIKit package.json`)
  if (pkg.version !== version)
    throw new Error(`目标提交 UIKit 包版本为 ${pkg.version}，与待打版本 ${version} 不一致`)

  const changelog = runGit(cwd, ['show', `${targetCommit}:CHANGELOG.md`])
  const heading = new RegExp(`^## (?:${escapeRegExp(pkg.name)} )?${escapeRegExp(version)} \\(\\d{4}-\\d{2}-\\d{2}\\)$`, 'm')
  if (!heading.test(changelog))
    throw new Error(`目标提交 CHANGELOG 缺少 ${pkg.name} ${version} 对应版本段（历史裸版本段也可）`)

  const tag = `v${version}`
  const tagRef = `refs/tags/${tag}`
  const localCommit = tryGit(cwd, ['rev-parse', '--verify', `${tagRef}^{}`])
  if (localCommit && localCommit !== targetCommit)
    throw new Error(`本地标签 ${tag} 指向 ${localCommit}，与目标 ${targetCommit} 冲突；拒绝覆盖`)

  const remoteOutput = runGit(cwd, ['ls-remote', '--tags', remote, tagRef, `${tagRef}^{}`])
  let remoteCommit = ''
  for (const line of remoteOutput.split('\n').filter(Boolean)) {
    const [sha, ref] = line.split('\t')
    if (ref === `${tagRef}^{}`) {
      remoteCommit = sha
      break
    }
    if (ref === tagRef)
      remoteCommit = sha
  }
  if (remoteCommit && remoteCommit !== targetCommit)
    throw new Error(`远端标签 ${tag} 指向 ${remoteCommit}，与目标 ${targetCommit} 冲突；拒绝覆盖`)

  let created = false
  let pushed = false
  if (push && !remoteCommit) {
    if (!localCommit) {
      runGit(cwd, ['tag', '-a', tag, targetCommit, '-m', `${pkg.name}@${version}`])
      created = true
    }
    runGit(cwd, ['push', remote, tagRef])
    pushed = true
  }

  return { tag, commit: targetCommit, created, pushed }
}

const isCLI = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isCLI) {
  const args = process.argv.slice(2)
  const push = args.includes('--push')
  const positional = args.filter(arg => arg !== '--push')
  if (positional.length !== 2) {
    console.error('[release:tag] 用法：node scripts/tag-uikit-release.mjs <version> <commit> [--push]')
    process.exitCode = 1
  }
  else {
    try {
      const result = tagUIKitRelease({ version: positional[0], commit: positional[1], push })
      if (!push)
        console.log(`[release:tag] 校验通过：${result.tag} → ${result.commit}；确认后加 --push 创建并推送`)
      else if (result.created || result.pushed)
        console.log(`[release:tag] 已完成：${result.tag} → ${result.commit}（created=${result.created}, pushed=${result.pushed}）`)
      else
        console.log(`[release:tag] 远端已存在且指向一致：${result.tag} → ${result.commit}`)
    }
    catch (error) {
      console.error(`[release:tag] ✗ ${error.message}`)
      process.exitCode = 1
    }
  }
}
