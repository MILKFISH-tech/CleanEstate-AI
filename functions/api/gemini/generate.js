// ============================================================
// Cloudflare Pages Function - POST /api/gemini/generate
// 代理 Gemini AI API，隱藏 API Key
// ============================================================

const CONFIG = {
  AI_MODEL: 'gemini-2.5-flash-image',
  MAX_BASE64_SIZE: 35_000_000,  // ~25MB 圖片
  MAX_PROMPT_LENGTH: 5000,
  VALID_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  GEMINI_API_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
};

/**
 * 呼叫 Gemini REST API (直接用 fetch，不依賴 SDK)
 */
async function callGeminiAPI(apiKey, imageData, mimeType, prompt) {
  const url = `${CONFIG.GEMINI_API_BASE}/${CONFIG.AI_MODEL}:generateContent`;

  const body = {
    contents: [
      {
        parts: [
          { inlineData: { data: imageData, mimeType } },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`Gemini API ${response.status}: ${errorText.substring(0, 200)}`);
    error.status = response.status;
    throw error;
  }

  return await response.json();
}

/**
 * POST /api/gemini/generate
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  const jsonResponse = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    // --- 檢查 API Key ---
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonResponse({ success: false, error: 'Server: GEMINI_API_KEY 未設定' }, 500);
    }

    // --- 解析請求 ---
    const { imageData, mimeType, prompt, userId } = await request.json();

    // --- 輸入驗證 ---
    if (!imageData || typeof imageData !== 'string') {
      return jsonResponse({ success: false, error: '缺少圖片資料 (imageData)' }, 400);
    }
    if (!prompt || typeof prompt !== 'string') {
      return jsonResponse({ success: false, error: '缺少處理指令 (prompt)' }, 400);
    }
    if (prompt.length > CONFIG.MAX_PROMPT_LENGTH) {
      return jsonResponse({ success: false, error: `指令過長，上限 ${CONFIG.MAX_PROMPT_LENGTH} 字元` }, 400);
    }
    if (imageData.length > CONFIG.MAX_BASE64_SIZE) {
      return jsonResponse({ success: false, error: '圖片資料過大，上限約 25MB' }, 400);
    }

    const safeMimeType = CONFIG.VALID_MIME_TYPES.includes(mimeType) ? mimeType : 'image/jpeg';

    // --- 呼叫 Gemini API ---
    const result = await callGeminiAPI(apiKey, imageData, safeMimeType, prompt);

    // --- 解析回應 ---
    const parts = result.candidates?.[0]?.content?.parts;
    if (!parts) {
      return jsonResponse({ success: false, error: 'AI 未產生任何內容' }, 500);
    }

    for (const part of parts) {
      if (part.inlineData?.data) {
        return jsonResponse({
          success: true,
          resultDataUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
        });
      }
    }

    return jsonResponse({ success: false, error: 'AI 回傳了文字而非圖片，請調整指令後重試' }, 500);

  } catch (error) {
    const msg = (error.message || '').toLowerCase();
    console.error('[Gemini Proxy Error]', error.message || error);

    // --- 分類錯誤回應 ---
    if (msg.includes('429') || msg.includes('quota') || msg.includes('exhausted') || msg.includes('resource')) {
      return jsonResponse({ success: false, error: '系統繁忙 (AI Quota)，請稍後再試' }, 429);
    }
    if (msg.includes('403') || msg.includes('api key') || msg.includes('permission')) {
      return jsonResponse({ success: false, error: 'API 金鑰無效或已過期' }, 403);
    }
    if (msg.includes('safety') || msg.includes('blocked')) {
      return jsonResponse({ success: false, error: '圖片觸發安全審查，請調整選取範圍' }, 400);
    }
    if (msg.includes('timeout')) {
      return jsonResponse({ success: false, error: 'AI 處理超時，請重試或選擇較小的圖片' }, 504);
    }

    return jsonResponse({ success: false, error: '系統錯誤，請稍後再試' }, 500);
  }
}
