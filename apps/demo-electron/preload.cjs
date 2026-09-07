/**
 * demo-electron preload：contextBridge 暴露持久化桥与壳能力桥。
 *
 * - `window.uikitPersist`：登录信息传递（init/close）+ 通用 invoke 包装
 *   （方法名白名单在主进程 CHANNELS 注册表，这里只做转发）；
 * - `window.demoShell`：壳能力（断网模拟）。
 * 渲染进程侧类型声明见 apps/demo/src/types/electron-bridge.d.ts。
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('uikitPersist', {
  /** 登录后打开 / 切换持久化库（appKey + userId） */
  init: account => ipcRenderer.invoke('uikit-persist:init', account),
  /** 登出 / 切换账号前关闭当前库（库文件保留，企微语义） */
  close: () => ipcRenderer.invoke('uikit-persist:close'),
  /** 删库重开（破坏性测试入口）：删 userData 下当前账号库文件（含 -wal/-shm）后重载页面，登录页重新登录开库 */
  deleteDbAndRelaunch: () => ipcRenderer.invoke('uikit-persist:delete-db-and-relaunch'),
  /** 通用方法调用：method 为 CHANNELS 注册表键（如 'hooks.message.saveMessage'） */
  invoke: (method, ...args) => ipcRenderer.invoke(`uikit-persist:${method}`, ...args),
})

contextBridge.exposeInMainWorld('demoShell', {
  /** 断网模拟：true 切断全部网络连接并启用 offline 模拟，false 恢复 */
  setOffline: offline => ipcRenderer.invoke('demo-shell:set-offline', offline),
})
