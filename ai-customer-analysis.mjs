/**
 * AI 客戶分析服務
 * 
 * 功能：
 * 1. 從文本數據（CSV 互動記錄）生成初步消費者輪廓
 * 2. 從音檔數據（轉錄文本）豐富和更新消費者輪廓
 * 3. 生成雷達圖分數（6個維度）
 * 4. 生成銷售分析和建議策略
 * 5. 生成詳細分析報告
 */

import { callGeminiAPI } from './gemini-api.mjs';
import { cleanJsonString } from './fix-json-parsing.mjs';

/**
 * 從文本互動記錄生成消費者輪廓
 * @param {Object} params
 * @param {string} params.customerName - 客戶名稱
 * @param {string} params.productName - 產品名稱
 * @param {Array} params.interactions - 互動記錄數組
 * @param {Array} params.audioTranscriptions - 音檔轉錄文本數組（可選）
 * @returns {Promise<Object>} 消費者輪廓分析結果
 */
export async function generateCustomerProfile({ customerName, productName, interactions, audioTranscriptions = [] }) {
  try {
    // 準備分析材料
    const textInteractions = interactions.map(i => ({
      timestamp: i.timestamp,
      sender: i.sender_type,
      content: i.content
    }));
    
    // 構建提示詞
    const prompt = buildAnalysisPrompt({
      customerName,
      productName,
      textInteractions,
      audioTranscriptions
    });
    
    // 調用 Gemini API 進行分析
    const analysisResult = await callGeminiAPI(prompt, 0.7, 4000);
    
    // 解析分析結果
    const profile = parseAnalysisResult(analysisResult);
    
    return {
      success: true,
      profile,
      rawAnalysis: analysisResult
    };
  } catch (error) {
    console.error('❌ 生成消費者輪廓失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 構建 AI 分析提示詞
 */
function buildAnalysisPrompt({ customerName, productName, textInteractions, audioTranscriptions }) {
  let prompt = `你是一位專業的銷售分析師，請根據以下客戶互動資料，生成完整的消費者輪廓分析。

## 客戶基本資訊
- 客戶名稱：${customerName}
- 產品名稱：${productName}

## 文本互動記錄（${textInteractions.length} 筆）
`;

  // 添加文本互動記錄
  textInteractions.forEach((interaction, index) => {
    prompt += `\n### 互動 ${index + 1} (${interaction.timestamp || '未知時間'})
- 發送者：${interaction.sender}
- 內容：${interaction.content}
`;
  });

  // 添加音檔轉錄（如果有）
  if (audioTranscriptions.length > 0) {
    prompt += `\n## 音檔通話記錄（${audioTranscriptions.length} 筆）\n`;
    audioTranscriptions.forEach((audio, index) => {
      prompt += `\n### 通話 ${index + 1} (${audio.call_date} ${audio.call_time})
- 轉錄文本：${audio.transcription_text}
- 分析摘要：${audio.analysis_summary || '無'}
`;
    });
  }

  prompt += `

## 分析要求

請根據以上資料，生成以下分析內容（請使用 JSON 格式回覆）：

\`\`\`json
{
  "radar_scores": {
    "purchase_intention": 0-10,  // 購買意願分數（整數）
    "budget_capacity": 0-10,     // 預算能力分數（整數）
    "decision_urgency": 0-10,    // 決策急迫性分數（整數）
    "trust_level": 0-10,         // 信任程度分數（整數）
    "communication_quality": 0-10, // 溝通品質分數（整數）
    "repeat_potential": 0-10     // 回購潛力分數（整數）
  },
  "customer_info": {
    "company": "客戶公司名稱（如果提到）",
    "title": "客戶職稱（如果提到）",
    "phone": "客戶電話（如果提到）",
    "email": "客戶電子郵件（如果提到）",
    "address": "客戶地址（如果提到）"
  },
  "product_info": {
    "category": "產品類別",
    "specs": "產品規格或特殊需求"
  },
  "quote_info": {
    "amount": null,  // 報價金額（數字，如果提到）
    "date": null,    // 報價日期（YYYY-MM-DD，如果提到）
    "status": "pending/quoted/negotiating/accepted/rejected"
  },
  "decision_structure": {
    "decision_maker": "決策者姓名和角色",
    "influencers": ["影響者1", "影響者2"],
    "users": ["使用者1", "使用者2"]
  },
  "sales_analysis": {
    "closing_probability": 0-100,  // 成交機率（百分比）
    "key_concerns": ["關鍵顧慮1", "關鍵顧慮2"],
    "strengths": ["優勢1", "優勢2"],
    "weaknesses": ["劣勢1", "劣勢2"],
    "recommended_strategy": "建議的銷售策略（詳細描述）",
    "next_steps": ["下一步行動1", "下一步行動2"]
  },
  "detailed_report": "完整的分析報告（markdown 格式，包含：客戶背景、需求分析、溝通歷程、決策因素、風險評估、策略建議等）"
}
\`\`\`

**重要提示：**
1. 雷達圖分數（radar_scores）都是 0-10 的整數，10 分為滿分
2. 成交機率（closing_probability）是 0-100 的百分比
3. 如果某些資訊未在對話中提到，請填 null 或空字串
4. 雷達圖分數要基於實際對話內容，不要過度樂觀或悲觀
5. 銷售分析要具體、可執行，避免空泛的建議
6. 詳細報告要結構清晰，使用 markdown 格式
7. detailed_report 欄位中的文字必須正確轉義所有換行符為 \\n
8. 請只回覆 JSON，不要添加其他說明文字
`;

  return prompt;
}

/**
 * 解析 AI 分析結果
 */
function parseAnalysisResult(rawText) {
  try {
    // 使用新的 JSON 清理函數
    const cleanedJson = cleanJsonString(rawText);
    const parsed = JSON.parse(cleanedJson);
    
    // 驗證和標準化數據
    return {
      radar_scores: {
        purchase_intention: validateScore(parsed.radar_scores?.purchase_intention),
        budget_capacity: validateScore(parsed.radar_scores?.budget_capacity),
        decision_urgency: validateScore(parsed.radar_scores?.decision_urgency),
        trust_level: validateScore(parsed.radar_scores?.trust_level),
        communication_quality: validateScore(parsed.radar_scores?.communication_quality),
        repeat_potential: validateScore(parsed.radar_scores?.repeat_potential)
      },
      customer_info: parsed.customer_info || {},
      product_info: parsed.product_info || {},
      quote_info: parsed.quote_info || {},
      decision_structure: parsed.decision_structure || {},
      sales_analysis: parsed.sales_analysis || {},
      detailed_report: parsed.detailed_report || ''
    };
  } catch (error) {
    console.error('❌ 解析 AI 分析結果失敗:', error);
    console.error('原始文本:', rawText);
    
    // 返回默認值
    return {
      radar_scores: {
        purchase_intention: 5,
        budget_capacity: 5,
        decision_urgency: 5,
        trust_level: 5,
        communication_quality: 5,
        repeat_potential: 5
      },
      customer_info: {},
      product_info: {},
      quote_info: {},
      decision_structure: {},
      sales_analysis: {
        closing_probability: 50,
        key_concerns: [],
        strengths: [],
        weaknesses: [],
        recommended_strategy: '分析失敗，請手動檢查',
        next_steps: []
      },
      detailed_report: `# 分析失敗\n\n無法解析 AI 回應。原始回應：\n\n${rawText}`
    };
  }
}

/**
 * 驗證分數（確保在 0-10 範圍內）
 */
function validateScore(score) {
  const num = parseInt(score);
  if (isNaN(num)) return 5;  // 預設值（5 分）
  return Math.max(0, Math.min(10, num));
}

/**
 * 更新客戶輪廓（當有新的音檔數據時）
 * @param {Object} existingProfile - 現有的輪廓數據
 * @param {Array} newAudioTranscriptions - 新的音檔轉錄
 * @returns {Promise<Object>} 更新後的輪廓
 */
export async function updateCustomerProfileWithAudio(existingProfile, newAudioTranscriptions) {
  // 這個函數會在音檔上傳後調用，用於豐富現有輪廓
  // 實現邏輯類似 generateCustomerProfile，但會合併現有數據
  
  try {
    const prompt = `你是一位專業的銷售分析師。以下是客戶的現有輪廓分析和新的通話記錄，請更新分析結果。

## 現有輪廓分析
${JSON.stringify(existingProfile, null, 2)}

## 新的通話記錄
${newAudioTranscriptions.map((audio, index) => `
### 通話 ${index + 1} (${audio.call_date} ${audio.call_time})
- 轉錄文本：${audio.transcription_text}
- 分析摘要：${audio.analysis_summary || '無'}
`).join('\n')}

請根據新的通話記錄，更新雷達圖分數、銷售分析和詳細報告。請使用與之前相同的 JSON 格式回覆。
`;

    const analysisResult = await callGeminiAPI(prompt, {
      temperature: 0.7,
      maxTokens: 4000
    });
    
    const updatedProfile = parseAnalysisResult(analysisResult);
    
    return {
      success: true,
      profile: updatedProfile
    };
  } catch (error) {
    console.error('❌ 更新消費者輪廓失敗:', error);
    return {
      success: false,
      error: error.message,
      profile: existingProfile  // 返回原有輪廓
    };
  }
}
