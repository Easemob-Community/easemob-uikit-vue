/**
 * vendor-lucide-icons.mjs
 *
 * 用途：将 src/assets/icons/ 下手工收集的 SVG 图标批量替换为 Lucide 图标（ISC License）。
 * 替换策略是「保留文件路径、只替换内容」，因此 Icon 组件按 name（"分类/图标名"）解析
 * 的引用方式完全不变，零 breaking。
 *
 * 重新执行方法（升级 lucide-static 或调整映射后）：
 *   cd packages/uikit && pnpm run icons:vendor
 *
 * 脚本行为：
 *   1. 按 ICON_MAP 从 node_modules/lucide-static/icons/ 拷贝 SVG 覆盖到对应现有路径；
 *   2. 按 ADD_ICONS 补齐源码中已引用但历史上缺失的图标文件（同样使用 Lucide 源）；
 *   3. 未出现在映射中的现有文件保持不动（无合适 Lucide 对应，如 logo、空状态插画等）；
 *   4. 把 lucide-static 的 LICENSE 固化复制为 src/assets/icons/LICENSE.lucide.txt；
 *   5. 打印替换 / 新增 / 保留清单。
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, dirname as pathDirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgRoot = join(__dirname, '..')
const iconsDir = join(pkgRoot, 'src/assets/icons')
const lucideDir = join(pkgRoot, 'node_modules/lucide-static/icons')
const lucideLicense = join(pkgRoot, 'node_modules/lucide-static/LICENSE')

/**
 * 现有图标 → Lucide 图标名映射表。
 * 注释中标注「语义近似」的条目表示 Lucide 没有完全等价的图形，选了语义最接近的，
 * 建议人工复核视觉效果。
 */
const ICON_MAP = {
  // ---------- actions ----------
  'actions/check': 'check',
  'actions/check_2': 'check-check', // 语义近似：双勾 → check-check
  'actions/check_in_circle_fill': 'circle-check',
  'actions/checked_ellipse': 'circle-check',
  'actions/checked_rectangle': 'square-check',
  'actions/close': 'x',
  'actions/ellipsis_vertical': 'ellipsis-vertical',
  'actions/loading_circle': 'loader-circle',
  'actions/plus_in_circle': 'circle-plus',
  'actions/trash': 'trash-2',
  'actions/unchecked_ellipse': 'circle',
  'actions/xmark_in_circle_fill': 'circle-x',
  'actions/xmark_thick': 'x',
  'actions/xmark_thin': 'x',

  // ---------- arrows ----------
  'arrows/arrow_down_n_box': 'download',
  'arrows/arrow_n_line': 'arrow-down-to-line',
  'arrows/arrow_turn_left': 'corner-up-left',
  'arrows/arrow_turn_right': 'corner-up-right',
  'arrows/arrow_up_n_box': 'upload',
  'arrows/arrow_up_thick': 'arrow-up',
  'arrows/arrow_Uturn_anti_clockwise': 'undo-2',
  'arrows/arrowto': 'reply', // 语义近似：左向回弯箭头 → reply
  'arrows/line_n_arrow': 'arrow-up-to-line',

  // ---------- audio-video ----------
  'audio-video/camera': 'camera',
  'audio-video/mic': 'mic',
  'audio-video/mic_on': 'mic',
  'audio-video/phone_pick': 'phone',
  'audio-video/speaker_wave_2': 'volume-2',
  'audio-video/speaker_xmark': 'volume-x',
  'audio-video/video_camera': 'video',

  // ---------- chat ----------
  'chat/3lines_n_arrow': 'forward', // 语义近似：列表+右箭头（转发） → forward
  'chat/bubble_fill': 'message-circle',
  'chat/doneAll': 'check-check',
  'chat/modifyMsg': 'square-pen',
  'chat/pin': 'pin',
  'chat/pinned': 'pin',
  'chat/unpin': 'pin-off',

  // ---------- emojis-reactions ----------
  'emojis-reactions/face': 'smile',

  // ---------- files-media ----------
  'files-media/archives': 'archive',
  'files-media/doc': 'file-text',
  'files-media/doc_on_doc': 'copy',
  'files-media/file': 'file',
  'files-media/folder': 'folder',
  'files-media/img': 'image',

  // ---------- gifts ----------

  // ---------- misc ----------
  'misc/bell': 'bell',
  'misc/gear': 'settings',
  'misc/globe_asia-australia': 'globe',
  'misc/lock': 'lock',
  'misc/magnifier2': 'search',

  // ---------- navigation ----------
  'navigation/chevron_left': 'chevron-left',
  'navigation/chevron_right': 'chevron-right',

  // ---------- people ----------
  'people/person_3lines_fill': 'contact', // 语义近似：人+列表（通讯录） → contact
  'people/person_add': 'user-plus',
  'people/person_double_fill': 'users',

  // ---------- status ----------
}

/**
 * 源码中已引用、但 assets/icons 下历史上缺失的图标，补齐为 Lucide 源。
 * 补齐后 icons:check 才能达到 0 缺失，同时修复这些位置原本静默不渲染的问题。
 */
const ADD_ICONS = {
  'actions/plus': 'plus', // cell.story.vue / chat-info-drawer.vue 已引用
  'actions/edit': 'pencil', // 通用编辑按钮（chat-info-drawer / contact-detail）
  'actions/lock': 'lock', // 禁言
  'actions/unlock': 'unlock', // 取消禁言
  'actions/shield': 'shield', // 设为管理员
  'actions/shield-off': 'shield-off', // 取消管理员
  'actions/crown': 'crown', // 转让群主
  'actions/user-minus': 'user-minus', // 移除成员
  'actions/user-x': 'user-x', // 拉黑
  'actions/user-check': 'user-check', // 取消拉黑
  'arrows/arrow_right': 'arrow-right', // forward-modal.vue 已引用
  'people/person_single': 'user', // address-book-container.story.vue 已引用
  'people/member_group': 'users', // address-book-container.story.vue 已引用
  'status/info': 'info', // toast.vue info 状态
  'status/success': 'circle-check', // toast.vue success 状态
  'status/error': 'circle-x', // toast.vue error 状态
  'status/warning': 'alert-triangle', // toast.vue warning 状态

  // ---------- empty states ----------
  'empty/contact': 'users', // 暂无联系人
  'empty/group': 'users', // 暂无群组
  'empty/members': 'users', // 暂无成员
  'empty/conversation': 'message-circle', // 暂无会话
  'empty/chat': 'message-square', // 请选择会话
  'empty/search': 'search-x', // 搜索无结果
  'empty/blocklist': 'shield-off', // 暂无黑名单成员
  'empty/mutelist': 'volume-x', // 暂无禁言成员
  'empty/files': 'folder-open', // 暂无群文件
  'empty/mentions': 'at-sign', // @提及无结果
  'empty/read-receipt': 'check-check', // 已读回执空
}

/** 递归收集 iconsDir 下所有 svg 的 name（相对路径去扩展名） */
function collectExistingSvgNames(dir, prefix = '') {
  const names = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      names.push(...collectExistingSvgNames(full, prefix ? `${prefix}/${entry}` : entry))
    } else if (entry.endsWith('.svg')) {
      names.push(prefix ? `${prefix}/${entry.replace(/\.svg$/, '')}` : entry.replace(/\.svg$/, ''))
    }
  }
  return names
}

if (!existsSync(lucideDir)) {
  console.error('未找到 lucide-static，请先在 packages/uikit 下执行: pnpm add -D lucide-static')
  process.exit(1)
}

const replaced = []
const added = []
let failed = 0

/** 拷贝一个 lucide 图标到目标 name 路径 */
function vendorOne(name, lucideName, bucket) {
  const src = join(lucideDir, `${lucideName}.svg`)
  const dest = join(iconsDir, `${name}.svg`)
  if (!existsSync(src)) {
    console.error(`  ✗ Lucide 图标不存在: ${lucideName}（目标 ${name}）`)
    failed++
    return
  }
  mkdirSync(pathDirname(dest), { recursive: true })
  copyFileSync(src, dest)
  bucket.push(`${name}  <=  ${lucideName}`)
}

for (const [name, lucideName] of Object.entries(ICON_MAP)) {
  if (!existsSync(join(iconsDir, `${name}.svg`))) {
    console.error(`  ✗ 映射目标文件不存在: ${name}.svg`)
    failed++
    continue
  }
  vendorOne(name, lucideName, replaced)
}

for (const [name, lucideName] of Object.entries(ADD_ICONS)) {
  vendorOne(name, lucideName, added)
}

const mappedNames = new Set([...Object.keys(ICON_MAP), ...Object.keys(ADD_ICONS)])
const kept = collectExistingSvgNames(iconsDir).filter((n) => !mappedNames.has(n))

// 固化 Lucide 许可证
copyFileSync(lucideLicense, join(iconsDir, 'LICENSE.lucide.txt'))

console.log(`\n已替换（${replaced.length}）：`)
replaced.forEach((r) => console.log(`  ${r}`))
console.log(`\n已新增补齐（${added.length}）：`)
added.forEach((r) => console.log(`  ${r}`))
console.log(`\n保留原样（${kept.length}，无合适 Lucide 对应或品牌/插画类）：`)
kept.forEach((r) => console.log(`  ${r}`))
console.log('\n已复制 LICENSE -> src/assets/icons/LICENSE.lucide.txt')

if (failed > 0) {
  console.error(`\n${failed} 个图标处理失败`)
  process.exit(1)
}
console.log('\nLucide 图标 vendor 完成。')
