/**
 * 同步文档快照与 manifest 到 packages/mcp/data/，供 MCP 运行时读取。
 *
 * 数据源（单一数据源 = apps/docs + 根 CHANGELOG）：
 * - apps/docs/guide/*.md（白名单过滤，排除 demo-phase 内部规划页）
 * - apps/docs/.vitepress/gen/*.md（gen-api-docs.mjs 产出的组件 API）
 * - 根 CHANGELOG.md
 * - packages/uikit-im/package.json 的 version
 *
 * 产物：packages/mcp/data/{guide,api,CHANGELOG.md,manifest.json}
 *
 * 用法：node packages/mcp/scripts/sync-docs.mjs（或在 packages/mcp 下 pnpm build 自动执行）
 */
/* eslint-disable no-console -- CLI 脚本日志输出 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../../..')
const OUT = join(__dirname, '../data')

/** guide 白名单：文件名 → 标题（排除 demo-phase1/2 内部规划页） */
const GUIDES = [
  ['quickstart', '快速开始'],
  ['theme', '主题定制'],
  ['icons', '图标'],
  ['h5-adaptation', 'H5 适配'],
  ['notice-customization', '系统通知文案定制'],
  ['advanced', '进阶指南'],
  ['changelog', '更新日志'],
]

/** 组件清单：文件名 → [标题, 分类]，对应 .vitepress/gen/*.md（分类/标题取自文档站 sidebar） */
const COMPONENTS = [
  ['uikit-provider', 'Provider 全局配置', '顶级容器'],
  ['button', 'Button 按钮', '基础组件'],
  ['icon', 'Icon 图标', '基础组件'],
  ['avatar', 'Avatar 头像', '基础组件'],
  ['badge', 'Badge 徽标', '基础组件'],
  ['cell', 'Cell 单元格', '基础组件'],
  ['empty', 'Empty 空状态', '基础组件'],
  ['input', 'Input 输入框', '基础组件'],
  ['icon-button', 'IconButton 图标按钮', '基础组件'],
  ['scroll-to-top', 'ScrollToTop 回到顶部', '基础组件'],
  ['resizable', 'Resizable 拖拽尺寸', '基础组件'],
  ['action-sheet', 'ActionSheet 操作菜单', '反馈组件'],
  ['modal', 'Modal 弹窗', '反馈组件'],
  ['popup', 'Popup 弹出层', '反馈组件'],
  ['toast', 'Toast 轻提示', '反馈组件'],
  ['status-banner', 'StatusBanner 状态横幅', '反馈组件'],
  ['notification', 'Notification 消息通知', '反馈组件'],
  ['emoji-picker', 'EmojiPicker 表情选择', '反馈组件'],
  ['image-viewer', 'ImageViewer 图片预览', '反馈组件'],
  ['presence-avatar', 'PresenceAvatar 在线头像', '数据展示'],
  ['presence-selector', 'PresenceSelector 状态选择', '数据展示'],
  ['user-card', 'UserCard 用户卡片', '数据展示'],
  ['group-card', 'GroupCard 群组卡片', '数据展示'],
  ['conversation-container', '会话模块', '业务模块'],
  ['chat-container', '聊天模块', '业务模块'],
  ['message-list', '消息列表 MessageList', '业务模块'],
  ['group-container', '群组模块', '业务模块'],
]

const uikitVersion = JSON.parse(
  readFileSync(join(ROOT, 'packages/uikit-im/package.json'), 'utf-8'),
).version

// 清理并重建 data 目录
if (existsSync(OUT)) {
  rmSync(OUT, { recursive: true, force: true })
}
mkdirSync(join(OUT, 'guide'), { recursive: true })
mkdirSync(join(OUT, 'api'), { recursive: true })

// guide
for (const [name] of GUIDES) {
  const src = join(ROOT, 'apps/docs/guide', `${name}.md`)
  if (!existsSync(src)) {
    console.warn(`[skip] guide/${name}.md 不存在`)
    continue
  }
  writeFileSync(join(OUT, 'guide', `${name}.md`), readFileSync(src, 'utf-8'), 'utf-8')
  console.log(`[ok] guide/${name}.md`)
}

// api（来自 gen-api-docs 产出）
for (const [name] of COMPONENTS) {
  const src = join(ROOT, 'apps/docs/.vitepress/gen', `${name}.md`)
  if (!existsSync(src)) {
    console.warn(`[skip] api/${name}.md 不存在`)
    continue
  }
  writeFileSync(join(OUT, 'api', `${name}.md`), readFileSync(src, 'utf-8'), 'utf-8')
  console.log(`[ok] api/${name}.md`)
}

// changelog
writeFileSync(join(OUT, 'CHANGELOG.md'), readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf-8'), 'utf-8')
console.log('[ok] CHANGELOG.md')

// manifest
const manifest = {
  version: uikitVersion,
  guides: GUIDES.map(([name, title]) => ({ name, title })),
  components: COMPONENTS.map(([name, title, category]) => ({ name, title, category, api: true })),
}
writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')

console.log(`\n完成：${manifest.components.length} 组件 / ${manifest.guides.length} 指南 -> ${OUT}（UIKit version ${uikitVersion}）`)
