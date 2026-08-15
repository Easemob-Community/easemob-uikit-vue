/**
 * 文件下载工具
 * 支持 PC/H5 多环境兼容，处理跨域、微信内嵌、iOS WebView 等场景
 */

/** 运行环境信息 */
export interface DownloadEnvironment {
  /** 是否微信内嵌浏览器 */
  isWechat: boolean
  /** 是否 iOS 设备 */
  isIOS: boolean
  /** 是否 Android 设备 */
  isAndroid: boolean
  /** 是否 PC */
  isPC: boolean
  /** 是否移动端 */
  isMobile: boolean
}

/** 下载选项 */
export interface DownloadOptions {
  /** 文件 URL */
  url: string
  /** 下载后的文件名 */
  filename: string
  /** 下载成功回调 */
  onSuccess?: () => void
  /** 下载失败回调 */
  onError?: (error: Error) => void
  /** 环境信息（不传则自动检测） */
  env?: DownloadEnvironment
}

/**
 * 检测当前运行环境
 */
export function detectEnvironment(): DownloadEnvironment {
  const ua = navigator.userAgent
  const isWechat = /MicroMessenger/i.test(ua)
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
  const isAndroid = /Android/i.test(ua)
  const isMobile = isIOS || isAndroid || /Mobile|Tablet/i.test(ua)
  const isPC = !isMobile

  return { isWechat, isIOS, isAndroid, isPC, isMobile }
}

/**
 * 判断 URL 是否跨域
 */
export function isCrossOrigin(url: string): boolean {
  try {
    const link = new URL(url, window.location.href)
    return link.origin !== window.location.origin
  } catch {
    return false
  }
}

/**
 * 通过 Blob 方式下载文件（可处理跨域）
 * 适用于 PC 现代浏览器和部分 H5 场景
 */
async function downloadViaBlob(url: string, filename: string): Promise<void> {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const blob = await response.blob()
  const blobUrl = window.URL.createObjectURL(blob)

  try {
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    // 延迟释放，避免下载未完成时 URL 被回收
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
  }
}

/**
 * 通过 iframe 方式下载（兼容部分旧浏览器）
 */
function downloadViaIframe(url: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  iframe.src = url
  document.body.appendChild(iframe)
  setTimeout(() => {
    document.body.removeChild(iframe)
  }, 5000)
}

/**
 * 通过新窗口打开（iOS / 部分 H5 的 fallback）
 */
function openInNewWindow(url: string): void {
  window.open(url, '_blank')
}

/**
 * 执行文件下载，自动根据环境选择最佳策略
 *
 * 策略优先级：
 * 1. PC 端：优先 Blob 下载（支持跨域），失败则 fallback 到 a.download
 * 2. 微信内嵌：提示用户用浏览器打开（平台限制无法直接下载）
 * 3. iOS WebView：新窗口打开（系统限制只能预览/分享）
 * 4. Android：优先 Blob 下载，失败则 fallback
 */
export async function downloadFile(options: DownloadOptions): Promise<void> {
  const { url, filename, onSuccess, onError } = options
  const env = options.env || detectEnvironment()

  if (!url) {
    const err = new Error('File URL is empty')
    onError?.(err)
    throw err
  }

  // 微信内嵌：直接下载不可行，抛出特定错误让上层处理
  if (env.isWechat) {
    const err = new Error('WechatWebView: download not supported')
    err.name = 'WechatNotSupported'
    onError?.(err)
    throw err
  }

  // iOS：系统限制，只能打开预览
  if (env.isIOS) {
    openInNewWindow(url)
    onSuccess?.()
    return
  }

  // PC / Android：尝试 Blob 下载（支持跨域）
  try {
    await downloadViaBlob(url, filename)
    onSuccess?.()
    return
  } catch (blobErr) {
    // Blob 失败（如 CORS 未允许），fallback 到 a.download
    try {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.target = '_blank'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      onSuccess?.()
    } catch (fallbackErr) {
      const err = fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr))
      onError?.(err)
      throw err
    }
  }
}

/**
 * 获取文件下载策略描述（用于调试或提示）
 */
export function getDownloadStrategy(env?: DownloadEnvironment): string {
  const e = env || detectEnvironment()
  if (e.isWechat) return 'wechat-not-supported'
  if (e.isIOS) return 'ios-open-preview'
  if (e.isPC) return 'pc-blob-download'
  if (e.isAndroid) return 'android-blob-download'
  return 'unknown'
}
