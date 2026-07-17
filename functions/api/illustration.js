// AI 章節插圖：GET /api/illustration?book=<bookId>&chapter=<n>
// 流程：LLM 依書卷+章數寫出英文場景描述 → FLUX 產圖 → 邊緣快取（每章僅生成一次）
// 需要 wrangler.toml 的 [ai] binding（Workers AI，Pages 免金鑰）

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
  const hit = await cache.match(cacheKey)
  if (hit) return hit

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
  const res = new Response(bytes, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
  context.waitUntil(cache.put(cacheKey, res.clone()))
  return res
}
