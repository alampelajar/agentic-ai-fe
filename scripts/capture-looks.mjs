// Takes the picture shown on each look's card in the Website Builder: a screenshot of
// the look's example website (made by `go run ./cmd/builder-samples` in the backend).
//
//   node scripts/capture-looks.mjs [gateway port]     default 8090
//
// SITE_PREVIEW_DOMAIN and SITE_PUBLIC_SCHEME as in the backend's .env: with https (a
// real domain behind a tunnel) the examples are opened at https://contoh-<look>.<domain>/.
//
// Writes public/looks/<look>.jpg. A look without an example is skipped; its card keeps
// the small drawing in its colours until the picture exists.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const LOOKS = ['warm-editorial', 'bold-industrial', 'quiet-luxury', 'fresh-clinic', 'playful-pop', 'nordic-minimal', 'night-studio', 'heritage-serif', 'tropical-sun', 'tech-precise', 'handmade-craft', 'street-market']
const port = process.argv[2] ?? '8090'
const previewDomain = process.env.SITE_PREVIEW_DOMAIN ?? 'preview.localhost'
const scheme = process.env.SITE_PUBLIC_SCHEME ?? 'http'
const origin = (look) => (scheme === 'https' ? `https://contoh-${look}.${previewDomain}/` : `http://contoh-${look}.${previewDomain}:${port}/`)

await mkdir('public/looks', { recursive: true })
const browser = await chromium.launch()
let taken = 0
for (const look of LOOKS) {
  // *.localhost names reach this computer without DNS; the gateway picks the example by name.
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  const response = await page.goto(origin(look), { waitUntil: 'networkidle' }).catch(() => null)
  if (!response || !response.ok()) {
    console.log(`${look.padEnd(16)} no example yet`)
    await context.close()
    continue
  }
  await page.screenshot({ path: `public/looks/${look}.jpg`, type: 'jpeg', quality: 70 })
  console.log(`${look.padEnd(16)} saved`)
  taken++
  await context.close()
}
await browser.close()
console.log(`${taken} picture(s) saved in public/looks`)
