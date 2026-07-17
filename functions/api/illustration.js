// AI 章節插圖：GET /api/illustration?book=<bookId>&chapter=<n>
// 流程：KV（若有綁定）→ 邊緣快取 → LLM 場景描述 → FLUX 產圖 → 寫回 KV + 快取
// 需要 wrangler.toml 的 [ai] binding（Workers AI，Pages 免金鑰）
// 選配：KV binding「ILLUSTRATIONS」— 有綁定時圖片永久儲存、全球通用；
//       沒有時退回邊緣快取（各機房各自生成、可能被回收）

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export async function onRequestGet(context) {
  const { request, env } = context
  const url = new URL(request.url)
  const book = url.searchParams.get('book') || ''
  const chapter = parseInt(url.searchParams.get('chapter') || '', 10)

  if (!/^[a-z0-9-]{2,24}$/.test(book) || !(chapter >= 1 && chapter <= 150)) {
    return json({ error: 'invalid params' }, 400)
  }
  if (!env.AI) {
    return json({ error: 'AI binding unavailable' }, 503)
  }

  // 以固定 URL 作為快取鍵，同一章全站共用同一張圖
  const cache = caches.default
  const cacheKey = new Request(`https://cache.new-bibble.internal/illustration/${book}/${chapter}`)
  const kvKey = `${book}/${chapter}`

  const hit = await cache.match(cacheKey)
  if (hit) {
    // KV 綁定後，把先前只存在邊緣快取的圖回填成永久儲存
    if (env.ILLUSTRATIONS) {
      const backfill = hit.clone()
      context.waitUntil(
        (async () => {
          const exists = await env.ILLUSTRATIONS.get(kvKey, 'stream')
          if (!exists) await env.ILLUSTRATIONS.put(kvKey, await backfill.arrayBuffer())
        })(),
      )
    }
    return hit
  }
  const imageHeaders = {
    'Content-Type': 'image/jpeg',
    'Cache-Control': 'public, max-age=31536000, immutable',
  }

  // KV 命中：永久儲存的圖直接回傳（並回填邊緣快取）
  if (env.ILLUSTRATIONS) {
    const stored = await env.ILLUSTRATIONS.get(kvKey, 'arrayBuffer')
    if (stored) {
      const res = new Response(stored, { headers: imageHeaders })
      context.waitUntil(cache.put(cacheKey, res.clone()))
      return res
    }
  }

  // 1) 讓 LLM 描述本章最具代表性的場景（英文 prompt 對圖像模型效果較好）
  let prompt =
    `Ancient Near-Eastern biblical scene from the book of ${book}, chapter ${chapter}, ` +
    'cinematic warm light, painterly, wide shot, no text'
  try {
    const llm = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content:
            'You write single-sentence English prompts for an image generator that illustrates Bible chapters. Reply with the prompt only, no preamble.',
        },
        {
          role: 'user',
          content:
            `Bible book (slug): "${book}", chapter ${chapter}. ` +
            'Describe the most iconic scene of this chapter in one sentence. ' +
            'Style: ancient Near-Eastern biblical scene, cinematic warm light, painterly, wide shot. ' +
            'The image must contain no text or letters.',
        },
      ],
      max_tokens: 120,
    })
    if (llm && typeof llm.response === 'string' && llm.response.trim()) {
      prompt = llm.response.trim().slice(0, 500)
    }
  } catch {
    // LLM 失敗就用預設 prompt，仍能出圖
  }

  // 2) FLUX 產圖（回傳 base64 JPEG）
  let out
  try {
    out = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt, steps: 6 })
  } catch (err) {
    return json({ error: 'image generation failed', detail: String(err) }, 502)
  }
  if (!out || !out.image) {
    return json({ error: 'empty image response' }, 502)
  }

  const bytes = Uint8Array.from(atob(out.image), (c) => c.charCodeAt(0))
  const res = new Response(bytes, { headers: imageHeaders })
  context.waitUntil(cache.put(cacheKey, res.clone()))
  if (env.ILLUSTRATIONS) {
    context.waitUntil(env.ILLUSTRATIONS.put(kvKey, bytes.buffer))
  }
  return res
}
