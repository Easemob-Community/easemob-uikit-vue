import type { SdkAdapter, SdkCapabilities, SdkConfig, SdkDomainSet, SdkEventHandlers } from '@easemob/uikit-sdk-contract'
import type { ContactRepository, ConversationRepository, GroupRepository, MessageRepository, PresenceRepository, UserInfoRepository } from '@easemob/uikit-sdk-contract'

/**
 * 创建「延迟解析」的默认适配器：
 * 内部用动态 import 加载具体 adapter 包（默认 `@easemob/uikit-sdk-websdk5`），
 * 避免 core/uikit-im 主入口对具体 adapter 形成顶层静态依赖（利于摇树与分包）。
 *
 * 行为：
 * - init/login/logout 等异步方法等待真实 adapter 就绪后再调用（调用顺序保持）；
 * - capabilities / currentUserId / isConnected 等同步读取在就绪前返回安全兜底值；
 * - subscribe 在就绪后补挂，返回的取消函数始终可用；
 * - domains / 各 repository 在就绪前访问会抛错（与「未初始化即调用 Domain」语义一致）。
 */
export function createDeferredSdkAdapter(
  factory: () => Promise<SdkAdapter> = () =>
    import('@easemob/uikit-sdk-websdk5').then(m => new m.Websdk5Adapter()),
): SdkAdapter {
  let inner: SdkAdapter | null = null
  let innerError: unknown = null
  const ready = factory().then((a) => {
    inner = a
  }).catch((err) => {
    innerError = err
  })

  function requireInner(): SdkAdapter {
    if (inner)
      return inner
    if (innerError)
      throw innerError
    throw new Error('[UIKit] 默认 SDK 适配器尚未加载完成，请在 init() 之后再访问该属性')
  }

  async function afterReady<T>(fn: (adapter: SdkAdapter) => T | Promise<T>): Promise<T> {
    await ready
    return fn(requireInner())
  }

  return {
    init: (config: SdkConfig) => afterReady(a => a.init(config)),
    login: (user: string, token: string) => afterReady(a => a.login(user, token)),
    logout: () => afterReady(a => a.logout()),
    subscribe: (handlers: SdkEventHandlers) => {
      let dispose: (() => void) | null = null
      void ready.then(() => {
        dispose = requireInner().subscribe(handlers)
      })
      return () => dispose?.()
    },
    get currentUserId() {
      return inner?.currentUserId ?? ''
    },
    get isConnected() {
      return inner?.isConnected ?? false
    },
    get capabilities(): SdkCapabilities {
      return inner?.capabilities ?? {
        combineMessage: false,
        pinnedMessage: false,
        streamingMessage: false,
        groupReadReceipt: false,
      }
    },
    get message(): MessageRepository {
      return requireInner().message
    },
    get conversation(): ConversationRepository {
      return requireInner().conversation
    },
    get contact(): ContactRepository {
      return requireInner().contact
    },
    get group(): GroupRepository {
      return requireInner().group
    },
    get presence(): PresenceRepository {
      return requireInner().presence
    },
    get userInfo(): UserInfoRepository {
      return requireInner().userInfo
    },
    get domains(): SdkDomainSet {
      return requireInner().domains
    },
    get client() {
      return inner?.client
    },
  }
}
