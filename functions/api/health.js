// ============================================================
// Cloudflare Pages Function - GET /api/health
// 健康檢查端點
// ============================================================

export async function onRequestGet(context) {
  const { env } = context;

  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      runtime: 'cloudflare-pages-functions',
      apiKeyConfigured: !!env.GEMINI_API_KEY,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
