export function resolveVideoPlaybackUrl(url: string): string {
  return url.includes('?')
    ? `${url}&origin-file=true`
    : `${url}?em-redirect=true&origin-file=true`
}
