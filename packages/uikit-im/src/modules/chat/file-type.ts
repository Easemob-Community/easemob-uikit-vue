export type FileTypeKey = 'pdf' | 'xls' | 'doc' | 'ppt' | 'md' | 'img' | 'video' | 'audio' | 'file'

export interface FileTypeInfo {
  key: FileTypeKey
  icon: string
}

const FILE_TYPE_RULES: Array<{ key: Exclude<FileTypeKey, 'file'>, icon: string, pattern: RegExp }> = [
  { key: 'pdf', icon: 'file/pdf', pattern: /\.pdf$/ },
  { key: 'xls', icon: 'file/xls', pattern: /\.(?:xls|xlsx|csv|et)$/ },
  { key: 'doc', icon: 'doc', pattern: /\.(?:doc|docx|txt|rtf|wps)$/ },
  { key: 'ppt', icon: 'file/ppt', pattern: /\.(?:ppt|pptx|dps)$/ },
  { key: 'md', icon: 'file/md', pattern: /\.(?:md|markdown)$/ },
  { key: 'img', icon: 'file/img', pattern: /\.(?:jpe?g|png|gif|webp|svg|bmp|ico|heic)$/ },
  { key: 'video', icon: 'file/video', pattern: /\.(?:mp4|mov|avi|mkv|webm|flv|wmv)$/ },
  { key: 'audio', icon: 'file/audio', pattern: /\.(?:mp3|wav|aac|flac|ogg|m4a|wma)$/ },
]

const FILE_TYPE_FALLBACKS: Record<'file' | 'video', FileTypeInfo> = {
  file: { key: 'file', icon: 'file/empty' },
  video: { key: 'video', icon: 'file/video' },
}

export function resolveFileType(fileName: string, fallback: 'file' | 'video' = 'file'): FileTypeInfo {
  const rule = FILE_TYPE_RULES.find(rule => rule.pattern.test(fileName.toLowerCase()))
  return rule ? { key: rule.key, icon: rule.icon } : FILE_TYPE_FALLBACKS[fallback]
}
