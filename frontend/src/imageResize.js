import { hasHeicHeader, isHeic } from './moments.js'

// Opens the photo; iPhone HEIC photos only open natively in Safari, so other browsers
// convert them with heic-to (about 3 MB, so it is loaded only when needed).
// Some iPhone exports are HEIC named .JPG, so the file's content is checked too.
async function openPhoto(file) {
  try {
    return await createImageBitmap(file)
  } catch (error) {
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    if (!isHeic(file) && !hasHeicHeader(header)) throw error
    const { heicTo } = await import('heic-to')
    return heicTo({ blob: file, type: 'bitmap' })
  }
}

// Shrinks a photo to a JPEG before upload, so phone photos stay well under the 2 MB bucket limit.
export async function resizeToJpeg(file, maxSide = 1600, quality = 0.85) {
  const bitmap = await openPhoto(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  // Transparent PNGs get a white background instead of black
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not encode the photo')
  return blob
}
