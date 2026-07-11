import { useCallback, useEffect, useRef } from 'react'
import { uploadImageFile } from './useImageDrop'

const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml']

type InsertImageUrl = (url: string) => void

interface UseClipboardImagePasteOptions {
  containerRef: React.RefObject<HTMLDivElement | null>
  vaultPath?: string
  onImageUrl?: InsertImageUrl
  editable?: boolean
}

/**
 * Extracts the first image file from clipboard paste event data.
 * Checks both `files` and `items` for image data.
 */
function extractClipboardImage(event: ClipboardEvent): File | null {
  const dt = event.clipboardData
  if (!dt) return null

  // 1. Check files array first (most direct)
  for (let i = 0; i < dt.files.length; i++) {
    const file = dt.files.item(i)
    if (file && IMAGE_MIME_TYPES.includes(file.type)) {
      return file
    }
  }

  // 2. Check items for image types (common for clipboard screenshots)
  for (let i = 0; i < dt.items.length; i++) {
    const item = dt.items[i]
    if (item.kind === 'file' && IMAGE_MIME_TYPES.includes(item.type)) {
      return item.getAsFile()
    }
  }

  return null
}

/**
 * Hook that intercepts Ctrl+V paste events and saves clipboard images
 * to the vault's attachments/ directory, then calls onImageUrl with the
 * resulting asset URL for insertion into the editor.
 */
export function useClipboardImagePaste({
  containerRef,
  vaultPath,
  onImageUrl,
  editable = true,
}: UseClipboardImagePasteOptions): void {
  const vaultPathRef = useRef(vaultPath)
  useEffect(() => { vaultPathRef.current = vaultPath }, [vaultPath])

  const onImageUrlRef = useRef(onImageUrl)
  useEffect(() => { onImageUrlRef.current = onImageUrl }, [onImageUrl])

  const handlePaste = useCallback((event: ClipboardEvent) => {
    if (!editable) return

    const imageFile = extractClipboardImage(event)
    if (!imageFile) return

    // We have a clipboard image — prevent default paste and save to vault
    event.preventDefault()
    event.stopPropagation()

    const currentVaultPath = vaultPathRef.current
    const insertUrl = onImageUrlRef.current

    void uploadImageFile(imageFile, currentVaultPath).then((result) => {
      const url = typeof result === 'string' ? result : result?.props?.url ?? '';
      insertUrl?.(url)
    }).catch((error) => {
      console.warn('[clipboard-image-paste] Failed to upload pasted image:', error)
    })
  }, [editable])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Use capture phase to intercept before BlockNote's own handler
    container.addEventListener('paste', handlePaste, { capture: true })

    return () => {
      container.removeEventListener('paste', handlePaste, { capture: true })
    }
  }, [containerRef, handlePaste])
}
