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
  
  // 方法 1: 簡單粗暴 - 移除 detailed_report 欄位
  // 因為這個欄位最容易出現換行符問題
  try {
    // 先嘗試直接解析
    JSON.parse(cleaned);
    return cleaned; // 如果成功，直接返回
  } catch (e) {
    console.warn('⚠️ JSON 解析失敗，嘗試移除 detailed_report 欄位...');
    
    // 使用正則表達式移除 detailed_report 欄位
    const withoutReport = cleaned.replace(/"detailed_report"\s*:\s*"[^"]*(?:\\.[^"]*)*"/g, '"detailed_report": ""');
    
    try {
      JSON.parse(withoutReport);
      console.log('✅ 移除 detailed_report 後解析成功');
      return withoutReport;
    } catch (e2) {
      console.warn('⚠️ 仍然失敗，嘗試提取核心 JSON...');
      
      // 方法 2: 提取第一個 { 到最後一個 }
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        const extracted = cleaned.substring(firstBrace, lastBrace + 1);
        // 再次移除 detailed_report
        const finalCleaned = extracted.replace(/"detailed_report"\s*:\s*"[^"]*(?:\\.[^"]*)*"/g, '"detailed_report": ""');
        
        try {
          JSON.parse(finalCleaned);
          console.log('✅ 提取並清理後解析成功');
          return finalCleaned;
        } catch (e3) {
          console.error('❌ 所有清理方法都失敗了');
          throw e; // 拋出原始錯誤
        }
      }
      
      throw e;
    }
  }
}
