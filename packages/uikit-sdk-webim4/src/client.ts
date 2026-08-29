import WebIM from 'easemob-websdk'
import type { EasemobChat } from 'easemob-websdk'
import { createLogger } from '@easemob/uikit-sdk-contract'

const log = createLogger('UIKit:Webim4Client')

/** 4.x Connection 类型别名 */
export type Webim4Connection = EasemobChat.Connection

/**
 * easemob-websdk@4.x 客户端包装。
 *
 * 与 5.x `ChatClient.init` 不同，4.x 是 `new WebIM.connection({ appKey })` 构造 +
 * `conn.open({ user, accessToken | pwd })` 登录；所有能力都挂单一 `connection` 对象
 * （无 ChatManager/ContactManager/... 拆分）。
 */
export class Webim4Client {
  private _conn: Webim4Connection | null = null
  private _currentUserId = ''

  constructor(appKey: string) {
    this._conn = new WebIM.connection({ appKey }) as Webim4Connection
  }

  /** 底层 4.x Connection 实例（Domain/事件层唯一 SDK 操作入口） */
  get connection(): Webim4Connection | null {
    return this._conn
  }

  /** 当前是否已建立连接 */
  get isConnected(): boolean {
    return this._conn?.isOpened() ?? false
  }

  /** 当前登录用户 ID */
  get currentUserId(): string {
    return this._currentUserId
  }

  /** 登录（accessToken 或密码，token 参数承载二者） */
  async login(user: string, token: string): Promise<void> {
    if (!this._conn)
      throw new Error('[Webim4Client] connection 尚未构造')
    await this._conn.open({ user, accessToken: token })
    this._currentUserId = user
    log.info('login', { user })
  }

  /** 登出（断开连接） */
  async logout(): Promise<void> {
    this._conn?.close()
    this._currentUserId = ''
  }
}

/** 创建 4.x 客户端 */
export function createClient(appKey: string): Webim4Client {
  return new Webim4Client(appKey)
}
