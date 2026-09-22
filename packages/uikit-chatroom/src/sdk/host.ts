import type { ChatManager, ChatRoomManager } from 'easemob-websdk'
import type { SdkAdapter } from '@easemob-community/uikit-sdk-contract'

/**
 * 聊天室场景依赖的最小 SDK host 接口（本包本地定义，不依赖具体 adapter 包）。
 * 运行时实例来自 `SdkAdapter.client`（具体 adapter 的原生客户端包装），结构兼容即可。
 *
 * 注：ChatManager/ChatRoomManager 类型来自 easemob-websdk —— 聊天室场景包当前
 * 与 websdk5 绑定（managers 由本包注入），后续接入其它 SDK 代际时再中立化。
 */
export interface ChatroomSdkHost {
  readonly chatManager: ChatManager
  readonly chatRoomManager: ChatRoomManager
}

/**
 * 从 SdkAdapter 解析聊天室 SDK host（惰性代理）。
 * 延迟到属性访问时读取 adapter.client：未初始化时给出清晰错误
 * （与旧 ManagerHost 代理「初始化前调用即抛错」语义一致），
 * 支持延迟初始化 / 重新初始化场景。
 */
export function resolveChatroomSdkHost(adapter: SdkAdapter): ChatroomSdkHost {
  return new Proxy({} as ChatroomSdkHost, {
    get: (_target, key) => {
      const host = adapter.client as ChatroomSdkHost | null | undefined
      if (!host) {
        throw new Error(
          '[UIKit:Chatroom] SDK 尚未初始化：请先调用 init(config)，或保持 Provider auto-init 开启',
        )
      }
      return (host as unknown as Record<string, unknown>)[key as string]
    },
  })
}
