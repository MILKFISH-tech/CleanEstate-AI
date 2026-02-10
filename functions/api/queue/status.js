// ============================================================
// Cloudflare Pages Function - GET /api/queue/status
// Serverless 環境下的隊列狀態（簡化版）
// ============================================================

export async function onRequestGet() {
  // Cloudflare Workers/Pages Functions 是 serverless，
  // 沒有持久的 in-memory 隊列狀態。
  // 回傳「可用」，讓前端正常運作。
  return new Response(
    JSON.stringify({
      available: true,
      position: 0,
      estimatedWaitSec: 0,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
