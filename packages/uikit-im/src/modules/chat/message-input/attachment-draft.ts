export function hasHtmlImage(html: string): boolean {
  return /<img\b/i.test(html)
}

export interface ClipboardAttachmentFeatures {
  image: boolean
  video: boolean
  file: boolean
}

export function getClipboardAttachmentFiles(
  data: DataTransfer,
  features: ClipboardAttachmentFeatures,
): File[] {
  const files: File[] = []
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file')
      continue
    const file = item.getAsFile()
    if (!file)
      continue
    if (file.type.startsWith('image/') && features.image)
      files.push(file)
    else if (file.type.startsWith('video/') && features.video)
      files.push(file)
    else if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && features.file)
      files.push(file)
  }
  return files
}

export interface VideoMetadata {
  duration: number
  width?: number
  height?: number
}

export function readVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve({ duration: 1 })
      return
    }
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false
    const timeout = setTimeout(() => finish(), 5000)

    function finish() {
      if (settled)
        return
      settled = true
      clearTimeout(timeout)
      URL.revokeObjectURL(url)
      const duration = Math.max(1, Math.floor(video.duration || 0))
      const width = video.videoWidth || 0
      const height = video.videoHeight || 0
      resolve({
        duration,
        ...(width > 0 ? { width } : {}),
        ...(height > 0 ? { height } : {}),
      })
    }

    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.addEventListener('loadedmetadata', finish)
    video.addEventListener('error', finish)
    video.src = url
  })
}
