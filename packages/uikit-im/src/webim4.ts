/**
 * `@easemob/uikit-im/webim4` 子路径入口（D122 主计划决策 22）。
 *
 * 用途：4.x「默认内置」快捷方式——import 本入口即把 webim4 注册为默认适配器，
 * `<UIKitProvider>` 不传 `adapter` prop 时自动使用（UIKit 全权管理生命周期）。
 *
 * 为什么独立成子路径入口：主入口 `@easemob/uikit-im` 保持零 adapter 静态引用，
 * 5.x 下游（`@easemob/uikit-sdk-websdk5`）的依赖图与产物中不会带进 4.x adapter
 * 与 `easemob-websdk@4.x`；反向同理。同时 re-export adapter 包全量 API。
 *
 * 注意：本入口靠 import 副作用完成注册，请勿标记为可摇树剔除；
 * 需要注入模式（业务全权）时不要用本入口，改为：
 * `import { Webim4Adapter } from '@easemob/uikit-sdk-webim4'` 并显式传 adapter prop。
 */
import { Webim4Adapter } from '@easemob/uikit-sdk-webim4'
import { registerDefaultSdkAdapterFactory } from '@easemob/uikit-core'

registerDefaultSdkAdapterFactory(() => new Webim4Adapter())

export * from '@easemob/uikit-sdk-webim4'
