export interface ImageAttachmentInput {
  mimeType: 'image/jpeg' | 'image/png' | 'image/tiff' | 'image/bmp'
  base64: string
  fileName: string
}
