/**
 * Electron 桥类型声明（demo-electron preload.cjs 暴露的渲染进程侧形状）。
 *
 * demo 是 Web / Electron 双栖：所有桥调用必须先特性检测
 * （`window.uikitPersist` / `window.demoShell` 存在才走），Web 模式行为零变化。
 */

/** 持久化桥（uikit-persist:* IPC 通道的渲染进程侧包装） */
export interface UikitPersistBridge {
  /** 登录后打开 / 切换持久化库 */
  init: (account: { appKey: string, userId: string }) => Promise<void>
  /** 登出 / 切换账号前关闭当前库（库文件保留） */
  close: () => Promise<void>
  /** 删库重开（破坏性测试入口） */
  deleteDbAndRelaunch: () => Promise<void>
  /** 通用方法调用：method 为主进程 CHANNELS 注册表键（如 'hooks.message.saveMessage'） */
  invoke: (method: string, ...args: unknown[]) => Promise<unknown>
}

/** 壳能力桥（断网模拟等） */
export interface DemoShellBridge {
  /** 断网模拟：true 切断全部网络连接并启用 offline 模拟，false 恢复 */
  setOffline: (offline: boolean) => Promise<void>
}

declare global {
  interface Window {
    uikitPersist?: UikitPersistBridge
    demoShell?: DemoShellBridge
  }
}
