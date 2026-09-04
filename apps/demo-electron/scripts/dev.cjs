/**
 * demo-electron 一键启动脚本：
 * 1. 用专属端口 5273 启动本仓库 apps/demo 的 vite dev server（strictPort，被占即报错）；
 * 2. 轮询等待 dev server 就绪；
 * 3. 启动 Electron 壳（DEMO_URL 指向该端口）；
 * 4. Electron 退出 / Ctrl+C 时连带杀掉 dev server 子进程。
 *
 * 调试渲染层需要自动打开 DevTools 时追加 `--console`（即 npm run dev:console），
 * 会以 ELECTRON_OPEN_DEVTOOLS=1 传给 Electron 主进程。
 *
 * 专属端口的目的：本机可能有其他项目的 dev server 占用 5173，若静默顺延，
 * Electron 壳会加载到别的应用（已踩过）。5273 为 demo-electron 约定端口。
 */
const { spawn } = require('node:child_process')
const process = require('node:process')

const PORT = process.env.DEMO_PORT || '5273'
const DEMO_URL = `http://localhost:${PORT}`
const OPEN_DEVTOOLS = process.argv.includes('--console')

function run(command, args, env = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...env },
  })
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      if (res.ok)
        return
    }
    catch { /* 未就绪，继续等 */ }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`等待 demo dev server 超时（${url}）。若报端口占用，请释放 ${PORT} 或用 DEMO_PORT 换端口`)
}

async function main() {
  const vite = run('pnpm', ['-F', '@easemob/demo', 'dev'], { DEMO_PORT: PORT })

  let electron = null
  const cleanup = () => {
    if (electron && !electron.killed)
      electron.kill()
    if (!vite.killed)
      vite.kill()
  }
  const shutdown = () => {
    cleanup()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  vite.on('exit', (code) => {
    // dev server 先退出（如 strictPort 端口冲突），壳不必再等
    if (!electron) {
      console.error(`[demo-electron] demo dev server 退出（code=${code}），启动中止`)
      process.exit(code || 1)
    }
  })

  await waitForServer(DEMO_URL)
  electron = run('electron', ['.'], {
    DEMO_URL,
    ...(OPEN_DEVTOOLS ? { ELECTRON_OPEN_DEVTOOLS: '1' } : {}),
  })
  electron.on('exit', shutdown)
}

main().catch((err) => {
  console.error(`[demo-electron] ${err.message}`)
  process.exit(1)
})
