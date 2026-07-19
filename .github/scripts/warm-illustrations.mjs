// 自動巡覽所有章節，觸發 /api/illustration 產圖
// - 已生成的章節（KV/快取命中）幾乎零成本，重跑會自動略過
// - Workers AI 有速率限制：單一請求會成功（見 debug-illustration.yml 驗證過
//   HTTP 200 / 500KB JPEG），但短時間內密集併發會被限流回 502。
//   因此這裡刻意單線程、逐一請求、每筆之間留間隔，並對暫時性 502 重試退避，
//   而不是一撞到 502 就整批放棄。
// - 若某章重試多次仍失敗，才視為真的用盡額度，提早收工、隔日 cron 續跑
import { readFileSync } from 'node:fs'

const BASE_URL = process.env.BASE_URL || 'https://new-bibble.pages.dev'
const REQUEST_DELAY_MS = 2000 // 每筆請求之間的間隔
const MAX_RETRIES = 3 // 單章遇到 502 的重試次數
const RETRY_BACKOFF_MS = [3000, 8000, 15000] // 各次重試前的等待
const MAX_CONSECUTIVE_HARD_FAILURES = 5 // 連續「重試用盡仍失敗」達此數才提早停止

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const bookIndex = JSON.parse(readFileSync('src/data/bookIndex.json', 'utf8'))

// 有地圖註解的章節前端不會請求插圖，略過
const annotated = new Set(['exodus-14', 'acts-13'])
try {
  const { readdirSync } = await import('node:fs')
  for (const f of readdirSync('src/data/annotations')) {
    annotated.add(f.replace(/\.json$/, ''))
  }
} catch {}

const targets = []
for (const book of bookIndex) {
  for (let ch = 1; ch <= book.chapterCount; ch++) {
    if (!annotated.has(`${book.id}-${ch}`)) targets.push({ book: book.id, chapter: ch })
  }
}
console.log(`chapters to warm: ${targets.length} (skipping ${annotated.size} annotated)`)

let ok = 0
let failed = 0
let consecutiveHardFailures = 0
let aborted = false

async function fetchOnce(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 90_000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    const type = res.headers.get('content-type') || ''
    return { ok: res.ok && type.startsWith('image/'), status: res.status, type }
  } finally {
    clearTimeout(timer)
  }
}

async function warmOne(book, chapter) {
  const url = `${BASE_URL}/api/illustration?book=${book}&chapter=${chapter}`
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await fetchOnce(url)
      if (result.ok) return { ok: true }
      if (attempt < MAX_RETRIES) {
        console.log(`RETRY ${book} ${chapter} (attempt ${attempt + 1}): HTTP ${result.status} ${result.type}`)
        await sleep(RETRY_BACKOFF_MS[attempt])
        continue
      }
      return { ok: false, reason: `HTTP ${result.status} ${result.type}` }
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS[attempt])
        continue
      }
      return { ok: false, reason: err.message }
    }
  }
}

for (let i = 0; i < targets.length; i++) {
  if (aborted) break
  const { book, chapter } = targets[i]
  const result = await warmOne(book, chapter)
  if (result.ok) {
    ok++
    consecutiveHardFailures = 0
  } else {
    failed++
    consecutiveHardFailures++
    console.log(`FAIL ${book} ${chapter} (after ${MAX_RETRIES} retries): ${result.reason}`)
    if (consecutiveHardFailures >= MAX_CONSECUTIVE_HARD_FAILURES) {
      aborted = true
      console.log('too many consecutive hard failures — AI quota likely exhausted, stopping for today')
    }
  }
  if ((ok + failed) % 25 === 0) {
    console.log(`progress: ${ok + failed}/${targets.length} (ok ${ok}, failed ${failed})`)
  }
  if (i < targets.length - 1 && !aborted) await sleep(REQUEST_DELAY_MS)
}

console.log('--- summary ---')
console.log(`ok: ${ok}, failed: ${failed}, remaining: ${targets.length - ok - failed}`)
if (!aborted && failed === 0) console.log('ALL CHAPTERS WARMED 🎉')
