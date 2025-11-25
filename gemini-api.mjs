/**
 * Gemini API 輔助函數
 * 使用 HTTP 請求直接調用 Gemini API，不需要安裝 SDK
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * 調用 Gemini API
 * @param {string} prompt - 提示詞
 * @param {number} temperature - 溫度參數 (0-1)
 * @param {number} maxTokens - 最大 token 數
 * @returns {Promise<string>} - AI 回應文本
 */
export async function callGeminiAPI(prompt, temperature = 0.7, maxTokens = 2048) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY 環境變數未設定');
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API 錯誤: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  
  // 提取回應文本
  if (data.candidates && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
      return candidate.content.parts[0].text;
    }
  }

  throw new Error('Gemini API 返回的數據格式無效');
}

/**
 * 從文本中提取報價數字
 * @param {string} text - 要分析的文本
 * @returns {Promise<number>} - 提取的報價數字
 */
export async function extractQuotePrice(text) {
  const prompt = `請從以下對話文本中提取報價金額（單位：新台幣）。
如果有多個報價，請返回最新的或最主要的報價。
如果沒有明確的報價，請返回 0。
只返回數字，不要包含貨幣符號或其他文字。

對話文本：
${text}

報價金額：`;

  const response = await callGeminiAPI(prompt, 0.3, 100);
  const priceText = response.trim();
  
  // 提取數字
  const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
  return price;
}

/**
 * 分析客戶輪廓（完整版）
 * @param {string} text - 對話文本
 * @param {object} customerInfo - 客戶基本資訊
 * @returns {Promise<object>} - 分析結果
 */
export async function analyzeCustomerProfile(text, customerInfo) {
  const prompt = `你是一位專業的銷售分析師。請根據以下客戶對話記錄，進行深入的客戶輪廓分析。

客戶基本資訊：
- 客戶名稱：${customerInfo.customer_name || '未提供'}
- 產品名稱：${customerInfo.product_name || '未提供'}
- 來源：${customerInfo.source || '未提供'}

對話記錄：
${text}

請以 JSON 格式返回以下分析結果：
{
  "ai_summary": "AI 綜合評估（100-200 字，描述客戶的整體狀況、需求強度和潛力）",
  "conversion_rate": 成交機率（0-100 的數字），
  "key_needs": ["需求1", "需求2", "需求3"],
  "customer_type": "客戶類型（例如：決策者、使用者、影響者）",
  "company_info": {
    "company_type": "公司類型",
    "industry": "所屬產業",
    "capital": "資本額（如果提到）"
  },
  "decision_structure": [
    {
      "name": "人員姓名",
      "position": "職位",
      "role": "角色",
      "support_level": "對 INPHIC 支持度（高/中/低）",
      "notes": "備註"
    }
  ],
  "radar_scores": {
    "demand": 需求挖掘分數（0-10，評估是否深入了解客戶需求）,
    "value": 價值建立分數（0-10，評估是否有效傳達產品價值）,
    "objection": 異議處理分數（0-10，評估是否妥善處理客戶疑慮）,
    "action": 行動引導分數（0-10，評估是否引導客戶採取下一步行動）,
    "relationship": 關係建立分數（0-10，評估是否建立良好的客戶關係）,
    "closing": 成交推進分數（0-10，評估是否積極推進成交）
  },
  "sales_analysis": {
    "core_question_1": {
      "title": "客戶為什麼要買這個產品？",
      "answers": {
        "A1": { "detected": true/false, "keywords": ["關鍵詞"], "summary": "摘要" },
        "A2": { "detected": true/false, "keywords": ["關鍵詞"], "summary": "摘要" },
        "A3": { "detected": true/false, "keywords": ["關鍵詞"], "summary": "摘要" },
        "A4": { "detected": true/false, "keywords": ["關鍵詞"], "summary": "摘要" }
      }
    },
    "core_question_2": {
      "title": "客戶為什麼不肯付錢？",
      "answers": {
        "B1": { "detected": true/false, "keywords": ["關鍵詞"], "summary": "摘要" },
        "B2": { "detected": true/false, "keywords": ["關鍵詞"], "summary": "摘要" },
        "B3": { "detected": true/false, "keywords": ["關鍵詞"], "summary": "摘要" },
        "B4": { "detected": true/false, "keywords": ["關鍵詞"], "summary": "摘要" }
      }
    }
  },
  "improvement_suggestions": ["建議1", "建議2", "建議3"],
  "next_follow_up_date": "建議的下次跟進日期（YYYY-MM-DD 格式）"
}

請確保返回的是有效的 JSON 格式，不要包含任何其他文字。`;

  const response = await callGeminiAPI(prompt, 0.7, 4096);
  
  // 提取 JSON（移除可能的 markdown 代碼塊標記）
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
  const cleanJson = jsonMatch ? jsonMatch[1] : response;
  
  try {
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('JSON 解析失敗:', error);
    console.error('原始文本:', response);
    throw new Error('AI 返回的 JSON 格式無效');
  }
}

/**
 * 生成對話摘要
 * @param {string} text - 對話文本
 * @returns {Promise<string>} - 對話摘要
 */
export async function generateConversationSummary(text) {
  const prompt = `請為以下對話生成一個簡潔的摘要（50-100 字）：

對話內容：
${text}

摘要：`;

  const response = await callGeminiAPI(prompt, 0.5, 200);
  return response.trim();
}

/**
 * 分析音檔轉錄文本（用於替換 analyzeTranscription 函數）
 * @param {string} transcriptionText - 轉錄文本
 * @returns {Promise<object>} - 分析結果
 */
export async function analyzeTranscription(transcriptionText) {
  // 標籤詞庫
  const tagLibrary = [
    { name: "簽約", weight: 20 },
    { name: "急單", weight: 18 },
    { name: "試用", weight: 18 },
    { name: "決策", weight: 17 },
    { name: "高需求", weight: 14 },
    { name: "有預算", weight: 12 },
    { name: "明確", weight: 12 },
    { name: "老客戶", weight: 10 },
    { name: "感興趣", weight: 7 },
    { name: "諮詢", weight: 5 },
    { name: "了解中", weight: 3 },
    { name: "演示", weight: 10 },
    { name: "報價", weight: 10 },
    { name: "技術", weight: 8 },
    { name: "收集中", weight: 4 },
    { name: "評估中", weight: 3 },
    { name: "待反饋", weight: 2 },
    { name: "時間急", weight: -5 },
    { name: "模糊", weight: -5 },
    { name: "預算緊", weight: -4 },
    { name: "猶豫", weight: -12 },
    { name: "比較中", weight: -11 },
    { name: "低價", weight: -10 },
    { name: "競品", weight: -16 },
    { name: "低預算", weight: -18 },
    { name: "延期", weight: -20 }
  ];
  
  const tagNames = tagLibrary.map(t => t.name).join('、');
  
  const prompt = `你是一位專業的銷售分析專家。今天你接到了一份銷售通話的轉錄文本。
請分析轉錄文本，提取以下信息，並以 JSON 格式返回。
【重要】所有回應必須使用台灣繁體中文，不要使用簡體中文。

{
  "customer_id": "客戶編號（應為 1-9999 之間的整數，如果找不到則返回 0）",
  "business_name": "業務人員姓名",
  "product_name": "產品名稱",
  "analysis_summary": "銷售活動的簡要總結，描述 2-3 句",
  "ai_tags": ["標籤1", "標籤2", "標籤3"]
}

【AI 標籤要求】
- 必須從以下標籤中選擇：${tagNames}
- 最多 3 個標籤
- 根據轉錄文本的語意判斷最相關的標籤
- 選擇最能反映客戶需求強度的標籤

轉錄文本：
${transcriptionText}

請仅返回 JSON，不要有任何其他文本。`;
  
  const response = await callGeminiAPI(prompt, 0.7, 500);
  
  // 解析 JSON
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('不能解析 AI 响應為 JSON');
  }
  
  const analysisResult = JSON.parse(jsonMatch[0]);
  
  // 确保 customer_id 是整数
  if (analysisResult.customer_id) {
    analysisResult.customer_id = parseInt(analysisResult.customer_id) || 0;
  } else {
    analysisResult.customer_id = 0;
  }
  
  // 確保 AI 標籤符合格式要求（最多 3 個標籤）
  if (analysisResult.ai_tags && Array.isArray(analysisResult.ai_tags)) {
    analysisResult.ai_tags = analysisResult.ai_tags
      .slice(0, 3) // 最多 3 個標籤
      .map(tag => String(tag).trim())
      .filter(tag => tag.length > 0); // 移除空標籤
  }
  
  return analysisResult;
}
