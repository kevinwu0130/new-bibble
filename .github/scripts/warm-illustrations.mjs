// 自動巡覽所有章節，觸發 /api/illustration 產圖
// - 已生成的章節（KV/快取命中）幾乎零成本，重跑會自動略過
// - Workers AI 免費額度用盡時（連續失敗）自動停止，隔日 cron 續跑
import { readFileSync } from 'node:fs'

const BASE_URL = process.env.BASE_URL || 'https://new-bibble.pages.dev'
const CONCURRENCY = 3
const MAX_CONSECUTIVE_FAILURES = 10

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
let consecutiveFailures = 0
let aborted = false
let cursor = 0

async function worker() {
  while (!aborted && cursor < targets.length) {
    const { book, chapter } = targets[cursor++]
    const url = `${BASE_URL}/api/illustration?book=${book}&chapter=${chapter}`
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 90_000)
      const res = await fetch(url, { signal: ctrl.signal })
      clearTimeout(timer)
      const type = res.headers.get('content-type') || ''
      if (res.ok && type.startsWith('image/')) {
        ok++
        consecutiveFailures = 0
      } else {
        failed++
        consecutiveFailures++
        console.log(`FAIL ${book} ${chapter}: HTTP ${res.status} ${type}`)
      }
    } catch (err) {
      failed++
      consecutiveFailures++
      console.log(`FAIL ${book} ${chapter}: ${err.message}`)
    }
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      aborted = true
      console.log('too many consecutive failures — AI quota likely exhausted, stopping for today')
    }
    if ((ok + failed) % 50 === 0) {
      console.log(`progress: ${ok + failed}/${targets.length} (ok ${ok}, failed ${failed})`)
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker))

console.log('--- summary ---')
console.log(`ok: ${ok}, failed: ${failed}, remaining: ${targets.length - ok - failed}`)
if (!aborted && failed === 0) console.log('ALL CHAPTERS WARMED 🎉')
