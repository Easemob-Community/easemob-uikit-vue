import WebIM from 'easemob-websdk'
import type { EasemobChat } from 'easemob-websdk'
import { createLogger } from '@easemob/uikit-sdk-contract'
import { patchPbMetaDecode } from './patch-pb-decode'
import type { PbPatchableConnection } from './patch-pb-decode'

const log = createLogger('UIKit:Webim4Client')

/** 4.x Connection 类型别名 */
export type Webim4Connection = EasemobChat.Connection

/** 4.x 连接配置（`new WebIM.connection(params)` 的原生参数，私有化场景常用 apiUrl/url/isHttpDNS 等） */
export type Webim4ConnectionParameters = EasemobChat.ConnectionParameters

/**
 * easemob-websdk@4.x 客户端包装。
 *
 * 与 5.x `ChatClient.init` 不同，4.x 是 `new WebIM.connection(params)` 构造 +
 * `conn.open({ user, accessToken | pwd })` 登录；所有能力都挂单一 `connection` 对象
 * （无 ChatManager/ContactManager/... 拆分）。
 *
 * 构造参数直接透传 4.x 原生 `ConnectionParameters`（`appKey`/`appId`/`apiUrl`/`url`/
 * `isHttpDNS`/`delivery`/`deviceId`/`autoReconnectNumMax`/`useOwnUploadFun` 等），
 * adapter 不裁剪 SDK 自身支持的配置——私有化部署的 `apiUrl`/`isHttpDNS:false` 即经此下发。
 */
export class Webim4Client {
  private _conn: Webim4Connection | null = null
  private _currentUserId = ''

  constructor(params: Webim4ConnectionParameters) {
    // eslint-disable-next-line new-cap -- 4.x 入口即小写 `new WebIM.connection(...)`，SDK API 约定
    this._conn = new WebIM.connection(params) as Webim4Connection
    patchPbMetaDecode(this._conn as unknown as PbPatchableConnection)
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

/** 创建 4.x 客户端（params 为 4.x 原生 ConnectionParameters，含 appKey 及私有化部署等全部连接配置） */
export function createClient(params: Webim4ConnectionParameters): Webim4Client {
  return new Webim4Client(params)
}

/**
 * 设置 4.x SDK 日志级别（`WebIM.logger.setLevel`，level：'TRACE'|'DEBUG'|'INFO'|'WARN'|'ERROR'|'SILENT' 或 0-5）。
 * 对应 5.x 的 `setLogLevel`；`SdkConfig.debug=true` 时 adapter.init 调本函数提升至 'DEBUG'。
 * 附注：4.x 另有官方日志订阅钩子 `WebIM.logger.onLog`（5.x 没有，sdk-log-capture 只能 hack），
 * 后续 SDK 日志捕获接入 4.x 时直接用，勿再包一层拦截。
 */
export function setSdkLogLevel(level: EasemobChat.Level, persist = false): void {
  try {
    WebIM.logger.setLevel(level, persist)
  }
  catch (err) {
    log.warn('setSdkLogLevel 失败', err)
  }
}
