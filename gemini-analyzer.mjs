import { GoogleGenerativeAI } from '@google/generative-ai';

// 初始化 Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * 從文本中提取報價數字
 * @param {string} text - 要分析的文本
 * @returns {Promise<number>} - 提取的報價數字
 */
export async function extractQuotePrice(text) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const prompt = `請從以下對話文本中提取報價金額（單位：新台幣）。
如果有多個報價，請返回最新的或最主要的報價。
如果沒有明確的報價，請返回 0。
只返回數字，不要包含貨幣符號或其他文字。

對話文本：
${text}

報價金額：`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const priceText = response.text().trim();
  
  // 提取數字
  const price = parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0;
  return price;
}

/**
 * 分析客戶輪廓
 * @param {string} text - 對話文本
 * @param {object} customerInfo - 客戶基本資訊
 * @returns {Promise<object>} - 分析結果
 */
export async function analyzeCustomerProfile(text, customerInfo) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const prompt = `你是一位專業的銷售分析師。請根據以下客戶對話記錄，進行深入的客戶輪廓分析。

客戶基本資訊：
- 客戶名稱：${customerInfo.customer_name || '未提供'}
- 產品名稱：${customerInfo.product_name || '未提供'}
- 來源：${customerInfo.source || '未提供'}

對話記錄：
${text}

請以 JSON 格式返回以下分析結果：
{
  "ai_summary": "AI 綜合評估（100-200 字）",
  "conversion_rate": 成交機率（0-100 的數字）,
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
    "demand": 需求挖掘分數（0-10）,
    "value": 價值建立分數（0-10）,
    "objection": 異議處理分數（0-10）,
    "action": 行動引導分數（0-10）,
    "relationship": 關係建立分數（0-10）,
    "closing": 成交推進分數（0-10）
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

請確保返回的是有效的 JSON 格式。`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const jsonText = response.text().trim();
  
  // 提取 JSON（移除可能的 markdown 代碼塊標記）
  const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
  const cleanJson = jsonMatch ? jsonMatch[1] : jsonText;
  
  try {
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('JSON 解析失敗:', error);
    console.error('原始文本:', jsonText);
    throw new Error('AI 返回的 JSON 格式無效');
  }
}

/**
 * 生成對話摘要
 * @param {string} text - 對話文本
 * @returns {Promise<string>} - 對話摘要
 */
export async function generateConversationSummary(text) {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const prompt = `請為以下對話生成一個簡潔的摘要（50-100 字）：

對話內容：
${text}

摘要：`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}
