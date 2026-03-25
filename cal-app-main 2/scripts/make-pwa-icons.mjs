/**
 * Writes solid-color PNGs for PWA / iOS (no extra npm deps).
 * Run: node scripts/make-pwa-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { deflateSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
  }
  return (c ^ 0xffffffff) >>> 0
}

function u32(n) {
  const b = Buffer.alloc(4)
  b.writeUInt32BE(n)
  return b
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const len = u32(data.length)
  const crc = u32(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}

/** RGBA #0f0f0f, #d4a853 accent bar at bottom */
function pngBuffer(size) {
  const w = size
  const h = size
  const raw = Buffer.alloc((w * 4 + 1) * h)
  let o = 0
  const bg = [0x0f, 0x0f, 0x0f, 0xff]
  const gold = [0xd4, 0xa8, 0x53, 0xff]
  const barY0 = Math.floor(h * 0.72)
  for (let y = 0; y < h; y++) {
    raw[o++] = 0 // filter None
    for (let x = 0; x < w; x++) {
      const c = y >= barY0 ? gold : bg
      raw[o++] = c[0]
      raw[o++] = c[1]
      raw[o++] = c[2]
      raw[o++] = c[3]
    }
  }
  const zlib = deflateSync(raw)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(publicDir, { recursive: true })
for (const s of [192, 512, 180]) {
  writeFileSync(join(publicDir, s === 180 ? 'apple-touch-icon.png' : `pwa-${s}x${s}.png`), pngBuffer(s))
}
console.log('Wrote public/pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png')
