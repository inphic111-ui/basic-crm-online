/**
 * 檔名解析函數
 * 規則：202409230014_何雨達_封口機_1008_1416.mp3
 * 
 * 202409230014 = 客戶編號（2024年09月23日第14位客戶）
 * 何雨達 = 業務名
 * 封口機 = 詢問商品
 * 1008 = 撥打日期（10月8號）
 * 1416 = 撥打時間（14:16）
 */

function parseAudioFilename(filename) {
  // 移除副檔名
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // 按 _ 分割
  const parts = nameWithoutExt.split('_');
  
  if (parts.length !== 5) {
    throw new Error(`檔名格式不正確，預期 5 個部分，實際 ${parts.length} 個。檔名：${filename}`);
  }
  
  const [customerCode, salesperson, product, callDateCode, callTimeCode] = parts;
  
  // 1. 解析客戶編號
  // 202409230014 -> customer_id: 14, customer_registration_date: 2024-09-23
  const customerYear = customerCode.substring(0, 4);      // 2024
  const customerMonth = customerCode.substring(4, 6);     // 09
  const customerDay = customerCode.substring(6, 8);       // 23
  const customerId = parseInt(customerCode.substring(8), 10); // 14
  const customerRegistrationDate = `${customerYear}-${customerMonth}-${customerDay}`;
  
  // 2. 業務名
  const salespersonName = salesperson; // 何雨達
  
  // 3. 詢問商品
  const productName = product; // 封口機
  
  // 4. 撥打日期
  // 1008 -> 10月8號 -> 2025-10-08（今年是 2025）
  const callMonth = callDateCode.substring(0, 2);        // 10
  const callDay = callDateCode.substring(2, 4);          // 08
  const callDate = `2025-${callMonth}-${callDay}`;        // 2025-10-08
  
  // 5. 撥打時間
  // 1416 -> 14:16
  const callHour = callTimeCode.substring(0, 2);         // 14
  const callMinute = callTimeCode.substring(2, 4);       // 16
  const callTime = `${callHour}:${callMinute}:00`;        // 14:16:00
  
  return {
    filename,
    customerId,
    customerRegistrationDate,
    salespersonName,
    productName,
    callDate,
    callTime,
    // 方便查看的格式
    display: {
      customerInfo: `客戶編號 ${customerId}（${customerRegistrationDate} 建檔）`,
      salesperson: `業務：${salespersonName}`,
      product: `產品：${productName}`,
      callDateTime: `通話時間：${callDate} ${callTime}`
    }
  };
}

// 測試
const filename = '202409230014_何雨達_封口機_1008_1416.mp3';
console.log('📄 檔名：', filename);
console.log('');

try {
  const parsed = parseAudioFilename(filename);
  
  console.log('✅ 解析結果：');
  console.log('');
  console.log('📊 結構化數據：');
  console.log(JSON.stringify({
    customerId: parsed.customerId,
    customerRegistrationDate: parsed.customerRegistrationDate,
    salespersonName: parsed.salespersonName,
    productName: parsed.productName,
    callDate: parsed.callDate,
    callTime: parsed.callTime
  }, null, 2));
  
  console.log('');
  console.log('📋 顯示格式：');
  console.log(parsed.display.customerInfo);
  console.log(parsed.display.salesperson);
  console.log(parsed.display.product);
  console.log(parsed.display.callDateTime);
  
  console.log('');
  console.log('💾 數據庫欄位映射：');
  console.log(`
  customer_id: ${parsed.customerId}
  customer_registration_date: ${parsed.customerRegistrationDate}
  salesperson_name: ${parsed.salespersonName}
  product_name: ${parsed.productName}
  call_date: ${parsed.callDate}
  call_time: ${parsed.callTime}
  audio_url: /uploads/${filename}
  `);
} catch (err) {
  console.error('❌ 錯誤：', err.message);
}
