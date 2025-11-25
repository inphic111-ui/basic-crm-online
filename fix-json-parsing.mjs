/**
 * JSON 清理函數
 * 修復 Gemini 返回的 JSON 中未轉義的換行符
 */

export function cleanJsonString(jsonText) {
  // 移除 markdown 代碼塊標記
  let cleaned = jsonText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  // 方法 1: 先嘗試直接解析
  try {
    JSON.parse(cleaned);
    console.log('✅ JSON 解析成功（無需清理）');
    return cleaned;
  } catch (e) {
    console.warn('⚠️ JSON 解析失敗，嘗試清理...', e.message);
  }
  
  // 方法 2: 使用更激進的方法 - 找到 detailed_report 並移除整個欄位
  try {
    // 找到 "detailed_report" 的位置
    const reportIndex = cleaned.indexOf('"detailed_report"');
    
    if (reportIndex !== -1) {
      // 找到這個欄位的開始（冒號後的引號）
      const colonIndex = cleaned.indexOf(':', reportIndex);
      const startQuoteIndex = cleaned.indexOf('"', colonIndex);
      
      if (startQuoteIndex !== -1) {
        // 從這裡開始，找到匹配的結束引號
        // 但要跳過轉義的引號 \"
        let endQuoteIndex = startQuoteIndex + 1;
        let escaped = false;
        
        while (endQuoteIndex < cleaned.length) {
          const char = cleaned[endQuoteIndex];
          
          if (escaped) {
            escaped = false;
          } else if (char === '\\') {
            escaped = true;
          } else if (char === '"') {
            // 找到結束引號
            break;
          }
          
          endQuoteIndex++;
        }
        
        // 如果找不到結束引號，直接移除整個 detailed_report 欄位
        if (endQuoteIndex >= cleaned.length) {
          console.warn('⚠️ 找不到 detailed_report 的結束引號，移除整個欄位');
          
          // 找到 detailed_report 欄位的開始（包括逗號）
          let fieldStart = reportIndex;
          // 向前查找，看看前面是否有逗號
          while (fieldStart > 0 && /\s/.test(cleaned[fieldStart - 1])) {
            fieldStart--;
          }
          if (fieldStart > 0 && cleaned[fieldStart - 1] === ',') {
            fieldStart--;
          }
          
          // 找到下一個逗號或右大括號
          let fieldEnd = cleaned.indexOf(',', reportIndex);
          const braceEnd = cleaned.indexOf('}', reportIndex);
          
          if (fieldEnd === -1 || (braceEnd !== -1 && braceEnd < fieldEnd)) {
            fieldEnd = braceEnd;
          }
          
          if (fieldEnd !== -1) {
            // 移除這個欄位
            const withoutReport = cleaned.substring(0, fieldStart) + cleaned.substring(fieldEnd);
            
            try {
              JSON.parse(withoutReport);
              console.log('✅ 移除 detailed_report 欄位後解析成功');
              return withoutReport;
            } catch (e2) {
              console.warn('⚠️ 移除欄位後仍然失敗');
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('⚠️ 清理過程出錯', e.message);
  }
  
  // 方法 3: 最後的手段 - 使用簡單替換
  try {
    // 直接將 detailed_report 設為空字串
    const simpleClean = cleaned.replace(
      /"detailed_report"\s*:\s*"[^"]*"/g,
      '"detailed_report": ""'
    );
    
    JSON.parse(simpleClean);
    console.log('✅ 簡單替換後解析成功');
    return simpleClean;
  } catch (e) {
    console.warn('⚠️ 簡單替換失敗');
  }
  
  // 方法 4: 提取核心 JSON
  try {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1);
      const finalClean = extracted.replace(
        /"detailed_report"\s*:\s*"[^"]*"/g,
        '"detailed_report": ""'
      );
      
      JSON.parse(finalClean);
      console.log('✅ 提取並清理後解析成功');
      return finalClean;
    }
  } catch (e) {
    console.error('❌ 所有清理方法都失敗了');
  }
  
  // 如果所有方法都失敗，拋出錯誤
  throw new Error('無法清理 JSON 字串');
}
