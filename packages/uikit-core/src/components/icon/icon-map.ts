/**
 * 图标资源注册表
 *
 * 使用 Vite import.meta.glob 预加载 assets/icons 与 assets/icons-v2 下所有 SVG 为原始字符串，
 * Icon 组件通过 name 查找并内联渲染。
 *
 * - assets/icons：旧版类目命名（如 "actions/trash"），逐步迁移中
 * - assets/icons-v2：设计师约定命名（如 "chevron/down"），新图标统一放这里
 */
// 本文件会被消费方（demo/docs）经 tsconfig paths 以源码形式纳入类型检查，
// 自行引用 vite/client，不依赖消费方 tsconfig 的 types 配置
/// <reference types="vite/client" />
const legacySvgModules = import.meta.glob<{ default: string }>(
  '../../assets/icons/**/*.svg',
  { eager: true, query: '?raw' }
)

const v2SvgModules = import.meta.glob<{ default: string }>(
  '../../assets/icons-v2/**/*.svg',
  { eager: true, query: '?raw' }
)

const svgModuleGroups = [
  { modules: legacySvgModules, prefix: 'assets/icons/' },
  { modules: v2SvgModules, prefix: 'assets/icons-v2/' },
]

/** 解析后的图标数据：body 为 <svg> 内部子元素，viewBox 保留原 svg 画布 */
export interface IconSvgData {
  body: string
  viewBox: string
  /**
   * 源 <svg> 根节点的绘制属性。
   * 描边式图标的 path 不带 fill/stroke，依赖根节点继承，
   * 剥离 <svg> 标签后必须由 Icon 组件透传这些属性，否则描边图标会渲染成实心色块。
   */
  fill?: string
  stroke?: string
  strokeWidth?: string
  strokeLinecap?: string
  strokeLinejoin?: string
}

/** 默认 viewBox，与原 Icon 组件硬编码值保持一致 */
const DEFAULT_VIEW_BOX = '0 0 24 24'

/** 从 <svg> 开标签中提取指定属性值 */
function pickAttr(tag: string, attr: string): string | undefined {
  const m = tag.match(new RegExp(`\\b${attr}="([^"]+)"`))
  return m ? m[1] : undefined
}

function parseIconFromModule(raw: string): IconSvgData {
  const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
  const openTagMatch = raw.match(/<svg[^>]*>/)
  const openTag = openTagMatch ? openTagMatch[0] : ''
  const viewBox = pickAttr(openTag, 'viewBox') ?? DEFAULT_VIEW_BOX
  return {
    body: innerMatch ? innerMatch[1].trim() : '',
    viewBox,
    // 透传根节点绘制属性（描边图标必需；填充图标通常无 stroke，不影响）
    fill: pickAttr(openTag, 'fill'),
    stroke: pickAttr(openTag, 'stroke'),
    strokeWidth: pickAttr(openTag, 'stroke-width'),
    strokeLinecap: pickAttr(openTag, 'stroke-linecap'),
    strokeLinejoin: pickAttr(openTag, 'stroke-linejoin'),
  }
}

function loadIconMap(modules: Record<string, unknown>, prefix: string): Map<string, IconSvgData> {
  const map = new Map<string, IconSvgData>()
  const regex = new RegExp(`${prefix.replace(/\//g, '\\/')}(.+)\\.svg$`)
  for (const path of Object.keys(modules)) {
    const match = path.match(regex)
    if (!match)
      continue
    const mod = modules[path]
    const raw = (mod as any)?.default ?? mod
    if (typeof raw === 'string')
      map.set(match[1], parseIconFromModule(raw))
  }
  return map
}

const legacyIconMap = loadIconMap(legacySvgModules, 'assets/icons/')
const v2IconMap = loadIconMap(v2SvgModules, 'assets/icons-v2/')

/** 合并后的总表：v2 与旧库同名时，v2 覆盖（用于渐进替换） */
const iconMap = new Map<string, IconSvgData>([
  ...legacyIconMap,
  ...v2IconMap,
])

/**
 * 根据图标名获取 SVG 数据（内部元素 + 原始 viewBox）
 * @param name 图标名称，如旧 "actions/trash" 或新 "chevron/down"
 */
export function getIconSvg(name: string): IconSvgData | undefined {
  return iconMap.get(name)
}

/** 获取所有已注册的图标名称列表（旧 + 新） */
export function getIconNames(): string[] {
  return Array.from(iconMap.keys())
}

/** 获取 V2 图标名称列表（仅设计师约定名） */
export function getV2IconNames(): string[] {
  return Array.from(v2IconMap.keys())
}

/** 检查某个图标名是否已注册 */
export function hasIcon(name: string): boolean {
  return iconMap.has(name)
}
