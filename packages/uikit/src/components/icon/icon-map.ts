/**
 * 图标资源注册表
 *
 * 使用 Vite import.meta.glob 预加载 assets/icons 下所有 SVG 为原始字符串，
 * Icon 组件通过 name（格式: "category/icon-name"）查找并内联渲染。
 */
const svgModules = import.meta.glob<{ default: string }>(
  '../../assets/icons/**/*.svg',
  { eager: true, query: '?raw' }
)

/** 解析后的图标数据：body 为 <svg> 内部子元素，viewBox 保留原 svg 画布 */
export interface IconSvgData {
  body: string
  viewBox: string
}

/** 默认 viewBox，与原 Icon 组件硬编码值保持一致 */
const DEFAULT_VIEW_BOX = '0 0 24 24'

/** 将文件路径解析为图标名，如 "../../assets/icons/actions/trash.svg" → "actions/trash" */
const iconMap = new Map<string, IconSvgData>()

for (const path of Object.keys(svgModules)) {
  // 提取 category/name 部分
  const match = path.match(/assets\/icons\/(.+)\.svg$/)
  if (match) {
    const mod = svgModules[path]
    const raw = (mod as any)?.default ?? mod
    if (typeof raw === 'string') {
      // 只提取 <svg> 内部的子元素内容（<path> 等），不含 <svg> 标签本身
      const innerMatch = raw.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
      // 保留原 svg 的 viewBox（画布不一定是 24x24），缺失时回退默认值
      const viewBoxMatch = raw.match(/<svg[^>]*\bviewBox="([^"]+)"/)
      iconMap.set(match[1], {
        body: innerMatch ? innerMatch[1].trim() : '',
        viewBox: viewBoxMatch ? viewBoxMatch[1] : DEFAULT_VIEW_BOX,
      })
    }
  }
}

/**
 * 根据图标名获取 SVG 数据（内部元素 + 原始 viewBox）
 * @param name 图标名称，格式 "category/icon-name"，如 "actions/trash"
 */
export function getIconSvg(name: string): IconSvgData | undefined {
  return iconMap.get(name)
}

/** 获取所有已注册的图标名称列表 */
export function getIconNames(): string[] {
  return Array.from(iconMap.keys())
}

/** 检查某个图标名是否已注册 */
export function hasIcon(name: string): boolean {
  return iconMap.has(name)
}
