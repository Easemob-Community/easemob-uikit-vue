/**
 * ⚠️ 本文件由 packages/uikit-core/scripts/gen-aux-entries.mjs 参数化生成，勿手改。
 * 配置见包根 aux-entries.config.mjs；composables 导出变更后执行 pnpm -F @easemob/uikit-core aux:gen 重新生成，
 * build 前置 --check 会校验漂移。
 */

export interface ComponentResolver {
  type: string
  resolve: (name: string) => { name: string, from: string } | undefined
}

export interface EasemobUIKitCoreResolverOptions {
  /**
   * 组件名前缀，必须与 PascalCase 名称的开头一致。
   * 默认 'Em'，例如模板中写 <EmUIKitProvider /> 会被解析到 @easemob/uikit-core 的 EmUIKitProvider 导出。
   */
  prefix?: string
}

/**
 * unplugin-vue-components 的解析器，启用后模板中带前缀的组件可以自动按需引入。
 *
 * 使用示例：
 * ```ts
 * import Components from 'unplugin-vue-components/vite'
 * import { EasemobUIKitCoreResolver } from '@easemob/uikit-core/resolver'
 *
 * export default {
 *   plugins: [Components({ resolvers: [EasemobUIKitCoreResolver()] })],
 * }
 * ```
 */
export function EasemobUIKitCoreResolver(
  options: EasemobUIKitCoreResolverOptions = {},
): ComponentResolver {
  const prefix = options.prefix ?? 'Em'
  return {
    type: 'component',
    resolve: (name: string) => {
      if (!name.startsWith(prefix))
        return
      // 直接返回 PascalCase 名称，对应 @easemob/uikit-core 的命名导出
      // 例如 <EmUIKitProvider /> -> import { EmUIKitProvider } from '@easemob/uikit-core'
      return {
        name,
        from: '@easemob/uikit-core',
      }
    },
  }
}
