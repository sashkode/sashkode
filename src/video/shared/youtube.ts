/**
 * Get the YouTube thumbnail URL from a video ID
 * Uses maxresdefault for highest quality, falls back to hqdefault
 */
export function getYoutubeThumbnailUrl(videoId: string): `https://${string}` {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
