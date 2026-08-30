/**
 * Demo SDK 版本切换（4.x adapter 人工验证）
 *
 * 职责：
 * - 持有 `Webim4Adapter` 模块级单例（注入模式：Provider 经 adapter prop 接入，
 *   login/logout 归 demo 业务侧，core 不转发）
 * - 统一 init 配置组装 / 登录 / 登出 的版本分支，供 app.vue / login-page.vue /
 *   settings/demo-sdk-panel.vue 三处调用点复用
 *
 * 模式差异：
 * - websdk5（内置模式）：`useClient().login/logout` 由 core 转发到自注册的 5.x adapter；
 * - webim4（注入模式）：core 只负责 adapter.init 装配与 stores 清理，
 *   登录/登出必须直连本文件持有的 `webim4Adapter`。
 */
import { Webim4Adapter } from '@easemob/uikit-sdk-webim4'
import { demoSdkVersion, sdkIsHttpDNS } from './use-demo-settings'

/** 4.x adapter 单例（模块级持有，与 Provider 解耦；demo 全权管理其 login/logout） */
export const webim4Adapter = new Webim4Adapter()

/** 当前是否 4.x（webim4）模式 */
export function isWebim4Mode() {
  return demoSdkVersion.value === 'webim4'
}

/** demo 侧 SDK 初始化入参（对齐 core 延迟初始化配置：未知字段下沉 adapterConfig 透传） */
export interface DemoSdkInitInput {
  appKey: string
  apiUrl?: string
  debug?: boolean
}

/**
 * 组装 init 配置：apiUrl 非空才传；webim4 模式追加 isHttpDNS（私有化部署验证时关闭）。
 * core 会把 appKey/debug 之外的平铺字段下沉 adapterConfig，
 * 4.x adapter 再将剩余字段原样透传给 `new WebIM.connection(params)`。
 */
export function buildDemoSdkInitConfig(input: DemoSdkInitInput) {
  return {
    appKey: input.appKey,
    ...(input.apiUrl ? { apiUrl: input.apiUrl } : {}),
    ...(isWebim4Mode() ? { isHttpDNS: sdkIsHttpDNS.value } : {}),
    debug: input.debug,
  }
}

/** demo 侧登录参数（与 core `CoreUIKitLoginParams` 结构一致） */
export interface DemoLoginParams {
  user: string
  accessToken?: string
  password?: string
}

/**
 * 统一登录入口：
 * - webim4：直连 `webim4Adapter.login(user, token)`（token 参数承载 accessToken 或密码，
 *   4.x `open({user, accessToken|pwd})` 两种都支持）；store 记账由 adapter 经注入 stores 完成；
 * - websdk5：走 core `useClient().login`（core 内部转发 5.x adapter）。
 */
export async function demoLogin(
  uikitLogin: (params: DemoLoginParams) => Promise<void>,
  params: DemoLoginParams,
): Promise<void> {
  if (isWebim4Mode()) {
    await webim4Adapter.login(params.user, params.accessToken ?? params.password ?? '')
    return
  }
  await uikitLogin(params)
}

/**
 * 统一登出入口：
 * - webim4：先直连 `webim4Adapter.logout()` 断开 4.x 连接，
 *   再走 UIKit 层 logout（注入模式下 core 不转发 adapter.logout，但仍负责 stores 清理）；
 * - websdk5：仅 UIKit 层 logout（core 内部会先调 5.x adapter.logout）。
 */
export async function demoLogout(uikitLogout: (() => Promise<void>) | undefined): Promise<void> {
  if (isWebim4Mode())
    await webim4Adapter.logout()
  await uikitLogout?.()
}
