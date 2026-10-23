import { hasHeicHeader, heifIsIncomplete, isHeic } from './moments.js'

// Thrown for a HEIC file that is cut short: it would decode with green blocks where data is missing
export class IncompletePhotoError extends Error {}
export const incompletePhotoMessage = 'This photo file is incomplete (part of it is missing), so it would show green blocks. Copy it from your phone again, or choose another photo.'

// Opens the photo; iPhone HEIC photos only open natively in Safari, so other browsers
// convert them with heic-to (about 3 MB, so it is loaded only when needed).
// Some iPhone exports are HEIC named .JPG, so the file's content is checked too.
async function openPhoto(file) {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const heic = isHeic(file) || hasHeicHeader(header)
  if (heic && await heifIsIncomplete(file)) throw new IncompletePhotoError()
  try {
    return await createImageBitmap(file)
  } catch (error) {
    if (!heic) throw error
    const { heicTo } = await import('heic-to')
    return heicTo({ blob: file, type: 'bitmap' })
  }
}

async function canvasToJpeg(canvas, quality) {
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('Could not encode the photo')
  return blob
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
  return canvasToJpeg(canvas, quality)
}

// Profile photos: the centred square of the photo, size × size (about 30 KB at 400 px).
export async function resizeToSquareJpeg(file, size = 400, quality = 0.85) {
  const bitmap = await openPhoto(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  bitmap.close?.()
  return canvasToJpeg(canvas, quality)
}
