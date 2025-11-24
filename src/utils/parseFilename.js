/**
 * 音檔檔名解析工具
 * 
 * 檔名格式：202409230014_何雨達_封口機_1008_1416.mp3
 * 
 * 202409230014 = 客戶編號
 *   ├─ 2024 = 年份
 *   ├─ 09 = 月份
 *   ├─ 23 = 日期
 *   └─ 0014 = 第 14 位客戶（回頭客）
 * 
 * 何雨達 = 業務名
 * 封口機 = 詢問商品
 * 1008 = 撥打日期（10 月 8 號）
 * 1416 = 撥打時間（14:16）
 */

/**
 * 解析音檔檔名
 * @param {string} filename - 檔名（包含或不包含副檔名）
 * @returns {object} 解析結果
 * @throws {Error} 檔名格式不正確
 */
export function parseAudioFilename(filename) {
  // 移除副檔名
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // 分割檔名
  const parts = nameWithoutExt.split('_');
  
  if (parts.length < 5) {
    throw new Error('檔名格式不正確，應為：YYYYMMDDNNNN_業務名_產品名_MMDD_HHMM.mp3');
  }

  const [customerIdStr, salespersonName, productName, dateStr, timeStr] = parts;

  // 解析客戶編號
  if (customerIdStr.length !== 12) {
    throw new Error('客戶編號應為 12 位數字');
  }

  const year = customerIdStr.substring(0, 4);
  const month = customerIdStr.substring(4, 6);
  const day = customerIdStr.substring(6, 8);
  const customerId = customerIdStr.substring(8, 12);

  // 解析撥打日期（MMDD 格式）
  if (dateStr.length !== 4) {
    throw new Error('撥打日期應為 4 位數字（MMDD）');
  }

  const callMonth = dateStr.substring(0, 2);
  const callDay = dateStr.substring(2, 4);
  
  // 假設通話日期在當年（2025）
  const currentYear = new Date().getFullYear();
  const callDate = `${currentYear}-${callMonth}-${callDay}`;

  // 解析撥打時間（HHMM 格式）
  if (timeStr.length !== 4) {
    throw new Error('撥打時間應為 4 位數字（HHMM）');
  }

  const hour = timeStr.substring(0, 2);
  const minute = timeStr.substring(2, 4);
  const callTime = `${hour}:${minute}:00`;

  return {
    filename: filename,
    customer_id: customerId,
    customer_registration_date: `${year}-${month}-${day}`,
    salesperson_name: salespersonName,
    product_name: productName,
    call_date: callDate,
    call_time: callTime,
  };
}

/**
 * 驗證檔名格式
 * @param {string} filename - 檔名
 * @returns {boolean} 是否有效
 */
export function isValidAudioFilename(filename) {
  try {
    parseAudioFilename(filename);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * 獲取檔名解析錯誤信息
 * @param {string} filename - 檔名
 * @returns {string|null} 錯誤信息，如果有效則返回 null
 */
export function getFilenameError(filename) {
  try {
    parseAudioFilename(filename);
    return null;
  } catch (err) {
    return err.message;
  }
}
