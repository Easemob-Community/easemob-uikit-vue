/* eslint-disable no-console, node/prefer-global/process -- CLI 脚本日志与退出码 */
/**
 * 文档站 Playground vendor 同步脚本
 *
 * 将浏览器可直跑的 ESM 产物同步到 apps/docs/public/vendor/，
 * 供 VuePlayground（@vue/repl）的 import map 引用，全程本地静态托管、不依赖 CDN。
 *
 * 运行时机：docs 的 dev / build 前置执行（见 package.json scripts）。
 * 注意：easemob-uikit.js 来自 uikit 构建产物，改 uikit 源码后需先
 * `pnpm -F @easemob/uikit build` 再运行本脚本，playground 预览才会同步。
 */
import { copyFileSync, existsSync, mkdirSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const docsRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const vendorDir = join(docsRoot, 'public', 'vendor')
const require = createRequire(pathToFileURL(join(docsRoot, 'package.json')))

/**
 * 解析包根目录（兼容 pnpm .pnpm 布局）。
 * 部分包的 exports 未暴露 ./package.json 子路径，退化为解析主入口再取父目录。
 */
function pkgRoot(name) {
  try {
    return dirname(require.resolve(`${name}/package.json`))
  }
  catch {
    return dirname(require.resolve(name))
  }
}

/**
 * 解析依赖包的 peer 兄弟包根目录（如 @vue/server-renderer 之于 vue）。
 * pnpm 将 peer 依赖硬链到依赖者所在 .pnpm 目录：对主包路径 realpath 后取父 node_modules 找兄弟包。
 */
function siblingPkgRoot(name, sibling) {
  try {
    const nm = dirname(realpathSync(pkgRoot(name)))
    const candidate = join(nm, sibling)
    return existsSync(join(candidate, 'package.json')) ? candidate : null
  }
  catch {
    return null
  }
}

const serverRendererRoot = siblingPkgRoot('vue', '@vue/server-renderer')
// esbuild 是 vite 的依赖（打包 pinia 用），从 vite 的 .pnpm 目录解析
const esbuildRoot = siblingPkgRoot('vite', 'esbuild')

/** 复制类产物：src 源文件 / dest 目标文件名 / required 缺失是否报错 / hint 缺失提示 */
const entries = [
  {
    src: join(docsRoot, '..', '..', 'packages', 'uikit', 'dist', 'easemob-uikit.js'),
    dest: 'easemob-uikit.js',
    required: true,
    hint: '请先执行 pnpm -F @easemob/uikit build',
  },
  {
    // uikit 构建产物 CSS（dist/theme/index.css = :root 主题变量 + 全部组件样式，
    // 由 vite lib 构建 cssCodeSplit:false 合并而成），playground iframe 预览必须注入，
    // 否则组件无任何样式（docs 页面本体经 alias 直连 src 有样式，iframe 预览没有）
    src: join(docsRoot, '..', '..', 'packages', 'uikit', 'dist', 'theme', 'index.css'),
    dest: 'uikit-theme.css',
    required: true,
  },
  {
    src: join(pkgRoot('vue'), 'dist', 'vue.runtime.esm-browser.js'),
    dest: 'vue.js',
    required: true,
  },
  {
    src: join(pkgRoot('@vue/compiler-sfc'), 'dist', 'compiler-sfc.esm-browser.js'),
    dest: 'compiler-sfc.js',
    required: true,
  },
  {
    // 仅 Repl 的 SSR 预览开关需要；缺失时跳过，client 预览不受影响
    src: serverRendererRoot
      ? join(serverRendererRoot, 'dist', 'server-renderer.esm-browser.js')
      : '',
    dest: 'server-renderer.js',
    required: false,
  },
]

/**
 * 用 esbuild 将浏览器构建打成单文件（依赖链内联，external 仅白名单）。
 * pinia / easemob-websdk 的浏览器构建均非自包含单文件（依赖 vue-demi →
 * devtools-api(-kit) 链 / 内部 chunks + zod），裸复制会在 iframe 中因模块
 * 解析失败而无法挂载，统一打包彻底收口。
 * @param {object} opts entry 入口（文件路径）或 stdin（{ contents, resolveDir }，二选一）/
 *   outfile 输出 / external 外部模块白名单 /
 *   minify 是否压缩 / cssLoader 'bundle'（默认，css 随包输出）| 'empty'（丢弃，
 *   css 由独立文件另行托管）
 */
function bundleModule({ entry, stdin, outfile, external = [], minify = false, cssLoader = 'bundle' }) {
  if (!entry && !stdin) {
    console.error('[sync:vendor] bundleModule 缺少 entry 或 stdin')
    return false
  }
  if (entry && !existsSync(entry)) {
    console.error(`[sync:vendor] 缺少必要产物: ${entry}`)
    return false
  }
  if (!esbuildRoot) {
    console.error('[sync:vendor] 找不到 esbuild（vite 依赖），无法打包产物')
    return false
  }
  const esbuildRequire = createRequire(pathToFileURL(join(esbuildRoot, 'package.json')))
  const { buildSync } = esbuildRequire('esbuild')
  const options = {
    bundle: true,
    format: 'esm',
    external,
    minify,
    loader: cssLoader === 'empty' ? { '.css': 'empty' } : undefined,
    outfile,
    logLevel: 'silent',
  }
  if (stdin)
    options.stdin = stdin
  else
    options.entryPoints = [entry]
  buildSync(options)
  console.log(`[sync:vendor] bundled ${outfile}`)
  return true
}

mkdirSync(vendorDir, { recursive: true })
let failed = false
for (const { src, dest, required, hint } of entries) {
  if (!existsSync(src)) {
    if (required) {
      console.error(`[sync:vendor] 缺少必要产物: ${src}${hint ? `（${hint}）` : ''}`)
      failed = true
    }
    else {
      console.warn(`[sync:vendor] 跳过非必需产物（仅 SSR 预览受影响）: ${src}`)
    }
    continue
  }
  copyFileSync(src, join(vendorDir, dest))
  console.log(`[sync:vendor] synced ${dest}`)
}

// 非自包含产物统一走 esbuild 打包（依赖链内联），不参与上面的复制循环
// pinia：依赖链 vue-demi → @vue/devtools-api(-kit)，内联后仅 external vue
if (!bundleModule({
  entry: join(pkgRoot('pinia'), 'dist', 'pinia.esm-browser.js'),
  outfile: join(vendorDir, 'pinia.js'),
  external: ['vue'],
})) {
  failed = true
}

// easemob-websdk：barrel 入口依赖 ./chunks/*、./managers/* 与 zod，全量内联
if (!bundleModule({
  entry: join(pkgRoot('easemob-websdk'), 'index.js'),
  outfile: join(vendorDir, 'easemob-websdk.js'),
})) {
  failed = true
}

// @vue/repl 独立页产物（VuePlayground「新标签打开」→ public/playground.html 用）：
// repl 本体与 codemirror 编辑器必须打成一个 bundle（stdin 入口同时 re-export 两者）——
// 若分开打包，@vue/repl 共享 chunk 中的 injectKeyProps Symbol 会在两个 bundle 内各求值
// 一次，Repl provide 的 Symbol 与编辑器 inject 的 Symbol 失配，编辑器 setup 直接
// 崩（Cannot destructure property 'autoResize' of inject(...)）→ 独立页白屏。
// 合并后共享 chunk 只内联一份，Symbol 单例；import map 里 '@vue/repl' 与
// '@vue/repl/codemirror-editor' 都指向同一 vendor/repl.js（见 playground.html）。
const replRoot = pkgRoot('@vue/repl')
if (!bundleModule({
  stdin: {
    contents: [
      "export { Repl, useStore } from '@vue/repl'",
      "export { default } from '@vue/repl/codemirror-editor'",
    ].join('\n'),
    resolveDir: docsRoot,
    sourcefile: 'playground-repl-entry.mjs',
  },
  outfile: join(vendorDir, 'repl.js'),
  // 注意 repl 的编译器 import 是 'vue/compiler-sfc'（vue 包子路径），不是 '@vue/compiler-sfc'；
  // 两者都 external 并由 import map 指向 vendor/compiler-sfc.js（见 playground.html 父页面 import map）
  external: ['vue', 'vue/compiler-sfc', '@vue/compiler-sfc'],
  minify: true,
  cssLoader: 'empty',
})) {
  failed = true
}
for (const { name, dest } of [
  { name: 'vue-repl.css', dest: 'repl.css' },
  { name: 'codemirror-editor.css', dest: 'codemirror-editor.css' },
]) {
  const src = join(replRoot, 'dist', name)
  if (existsSync(src)) {
    copyFileSync(src, join(vendorDir, dest))
    console.log(`[sync:vendor] synced ${dest}`)
  }
  else {
    console.warn(`[sync:vendor] 跳过非必需产物（独立页样式受影响）: ${src}`)
  }
}

if (failed) {
  console.error('[sync:vendor] 存在缺失产物，同步失败')
  process.exit(1)
}
