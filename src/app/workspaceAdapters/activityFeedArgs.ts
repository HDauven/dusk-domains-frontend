import type { NamePreview } from './types'

export function buildActivityFeedArgs(namePreview: NamePreview) {
  return {
    defaultName: namePreview.displayName,
    defaultNode: namePreview.nodeHex,
  }
}
