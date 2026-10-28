import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { assertCleanReleaseWorktree, tagUIKitRelease } from '../tag-uikit-release.mjs'

const tempRoots: string[] = []

function git(cwd: string, args: string[]) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function remoteGit(remote: string, args: string[]) {
  return execFileSync('git', ['--git-dir', remote, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function createRepo(options: { legacy?: boolean, version?: string, changelogVersion?: string } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'uikit-release-tag-'))
  tempRoots.push(root)
  const cwd = join(root, 'repo')
  const remote = join(root, 'origin.git')
  const version = options.version ?? '1.2.3'
  const changelogVersion = options.changelogVersion ?? version
  const packageName = options.legacy ? '@easemob/uikit' : '@easemob-community/uikit-im'
  const packagePath = options.legacy ? 'packages/uikit/package.json' : 'packages/uikit-im/package.json'

  mkdirSync(cwd, { recursive: true })
  git(cwd, ['init', '-b', 'main'])
  git(cwd, ['init', '--bare', remote])
  git(cwd, ['config', 'user.name', 'UIKit Test'])
  git(cwd, ['config', 'user.email', 'uikit@example.com'])
  mkdirSync(dirname(join(cwd, packagePath)), { recursive: true })
  writeFileSync(join(cwd, packagePath), `${JSON.stringify({ name: packageName, version }, null, 2)}\n`)
  const heading = options.legacy ? `## ${changelogVersion}` : `## ${packageName} ${changelogVersion}`
  writeFileSync(join(cwd, 'CHANGELOG.md'), `# Changelog\n\n${heading} (2026-10-28)\n\n- release\n`)
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-m', `release ${version}`])
  git(cwd, ['remote', 'add', 'origin', remote])
  git(cwd, ['push', '-u', 'origin', 'main'])

  return { cwd, remote, commit: git(cwd, ['rev-parse', 'HEAD']), version }
}

function expectNoTag(cwd: string, remote: string, tag: string) {
  expect(() => git(cwd, ['rev-parse', `refs/tags/${tag}`])).toThrow()
  expect(remoteGit(remote, ['tag', '--list', tag])).toBe('')
}

afterEach(() => {
  for (const root of tempRoots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

describe('tagUIKitRelease', () => {
  it('dry-run 校验当前包路径但不创建本地或远端标签', () => {
    const { cwd, remote, commit, version } = createRepo()

    const result = tagUIKitRelease({ version, commit, cwd })

    expect(result).toMatchObject({ tag: `v${version}`, commit, created: false, pushed: false })
    expectNoTag(cwd, remote, `v${version}`)
  })

  it('支持 legacy 包路径与裸版本段，并推送指向源提交的 annotated tag', () => {
    const { cwd, remote, commit, version } = createRepo({ legacy: true })

    const result = tagUIKitRelease({ version, commit, cwd, push: true })

    expect(result).toMatchObject({ tag: `v${version}`, commit, created: true, pushed: true })
    expect(git(cwd, ['cat-file', '-t', `v${version}`])).toBe('tag')
    expect(git(cwd, ['rev-parse', `v${version}^{}`])).toBe(commit)
    expect(remoteGit(remote, ['rev-parse', `v${version}^{}`])).toBe(commit)
  })

  it('包版本不匹配时拒绝且不打签', () => {
    const { cwd, remote, commit } = createRepo()

    expect(() => tagUIKitRelease({ version: '1.2.4', commit, cwd })).toThrow(/包版本/)
    expectNoTag(cwd, remote, 'v1.2.4')
  })

  it('changelog 版本段不匹配时拒绝且不打签', () => {
    const { cwd, remote, commit, version } = createRepo({ changelogVersion: '1.2.4' })

    expect(() => tagUIKitRelease({ version, commit, cwd })).toThrow(/CHANGELOG/)
    expectNoTag(cwd, remote, `v${version}`)
  })

  it('同目标重跑幂等，不同目标冲突且保留原标签', () => {
    const { cwd, remote, commit, version } = createRepo()
    tagUIKitRelease({ version, commit, cwd, push: true })

    const repeated = tagUIKitRelease({ version, commit, cwd, push: true })
    expect(repeated).toMatchObject({ created: false, pushed: false })

    writeFileSync(join(cwd, 'later.txt'), 'later\n')
    git(cwd, ['add', 'later.txt'])
    git(cwd, ['commit', '-m', 'later change'])
    const laterCommit = git(cwd, ['rev-parse', 'HEAD'])
    expect(() => tagUIKitRelease({ version, commit: laterCommit, cwd, push: true })).toThrow(/冲突|不一致/)
    expect(git(cwd, ['rev-parse', `v${version}^{}`])).toBe(commit)
    expect(remoteGit(remote, ['rev-parse', `v${version}^{}`])).toBe(commit)
  })
})

describe('assertCleanReleaseWorktree', () => {
  it('干净工作区通过，未跟踪与已跟踪改动均拒绝', () => {
    const { cwd } = createRepo()
    expect(() => assertCleanReleaseWorktree(cwd)).not.toThrow()

    const untracked = join(cwd, 'untracked.txt')
    writeFileSync(untracked, 'dirty\n')
    expect(() => assertCleanReleaseWorktree(cwd)).toThrow(/工作区/)

    rmSync(untracked)
    writeFileSync(join(cwd, 'CHANGELOG.md'), '# dirty\n')
    expect(() => assertCleanReleaseWorktree(cwd)).toThrow(/工作区/)
  })
})
