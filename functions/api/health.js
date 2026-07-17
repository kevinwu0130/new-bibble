export async function onRequestGet() {
  return new Response(
    JSON.stringify({ status: 'ok', service: 'new-bibble', time: new Date().toISOString() }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
