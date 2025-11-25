import crypto from 'crypto';

/**
 * 移除 UTF-8 BOM 標記
 */
function removeBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    return content.slice(1);
  }
  return content;
}

/**
 * 解析 CSV 行（支援多行訊息）
 */
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

/**
 * 從檔案名稱或 User senderName 中提取客戶資訊
 */
function extractCustomerInfo(filename, userSenderName) {
  // 優先從 User senderName 中提取
  if (userSenderName) {
    const match = userSenderName.match(/^(\d{12})(.*)/);
    if (match) {
      const customerId = match[1];
      const afterId = match[2];

      // 嘗試匹配稱謂結尾的名稱
      const nameWithTitleMatch = afterId.match(/^([\u4e00-\u9fff]{1,4}(?:小姐|先生|女士|經理|主任))/);
      if (nameWithTitleMatch) {
        const customerName = nameWithTitleMatch[1];
        const productName = afterId.substring(customerName.length);
        return { customerId, customerName, productName };
      }

      // 沒有稱謂，嘗試匹配 2-3 個中文字
      const nameMatch = afterId.match(/^([\u4e00-\u9fff]{2,3})/);
      if (nameMatch) {
        let customerName = nameMatch[1];
        
        // 檢查第 3 個字是否是產品關鍵字
        if (customerName.length === 3) {
          const thirdChar = customerName[2];
          const productKeywords = ['打', '爆', '食', '包', '雞', '機', '展', '模'];
          if (productKeywords.includes(thirdChar)) {
            customerName = customerName.substring(0, 2);
          }
        }
        
        const productName = afterId.substring(customerName.length);
        return { customerId, customerName, productName };
      }
    }
  }

  // 從檔案名稱提取
  const filenameMatch = filename.match(/(\d{12})([^\d]+)/);
  if (filenameMatch) {
    const customerId = filenameMatch[1];
    const afterId = filenameMatch[2].replace('.csv', '');

    const nameWithTitleMatch = afterId.match(/^([\u4e00-\u9fff]{1,4}(?:小姐|先生|女士|經理|主任))/);
    if (nameWithTitleMatch) {
      const customerName = nameWithTitleMatch[1];
      const productName = afterId.substring(customerName.length);
      return { customerId, customerName, productName };
    }

    const nameMatch = afterId.match(/^([\u4e00-\u9fff]{2,3})/);
    if (nameMatch) {
      let customerName = nameMatch[1];
      
      if (customerName.length === 3) {
        const thirdChar = customerName[2];
        const productKeywords = ['打', '爆', '食', '包', '雞', '機', '展', '模'];
        if (productKeywords.includes(thirdChar)) {
          customerName = customerName.substring(0, 2);
        }
      }
      
      const productName = afterId.substring(customerName.length);
      return { customerId, customerName, productName };
    }
  }

  return { customerId: '', customerName: '', productName: '' };
}

/**
 * 解析 CSV 檔案
 */
export function parseCSVFile(filename, content) {
  content = removeBOM(content);
  
  const lines = content.split(/\r?\n/);
  const conversations = [];
  let userSenderName = null;

  // 跳過前 4 行元數據
  for (let i = 4; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);
    if (fields.length < 5) continue;

    const [senderType, senderName, date, time, message] = fields;

    // 提取第一個 User 的 senderName
    if (senderType === 'User' && !userSenderName) {
      userSenderName = senderName;
    }

    const timestamp = new Date(`${date} ${time}`);

    conversations.push({
      senderType,
      senderName,
      timestamp,
      content: message,
    });
  }

  // 提取客戶資訊
  const { customerId, customerName, productName } = extractCustomerInfo(filename, userSenderName);

  return {
    metadata: {
      customerId,
      customerName,
      productName,
    },
    conversations,
  };
}

/**
 * 計算訊息的 SHA-256 hash
 */
export function calculateMessageHash(customerId, timestamp, content) {
  const data = `${customerId}|${timestamp.toISOString()}|${content}`;
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * 判斷是否為罐頭訊息
 */
export function isCannedMessage(content) {
  const cannedPatterns = [
    /^貼圖已傳送$/,
    /^照片已傳送$/,
    /^影片已傳送$/,
    /^檔案已傳送$/,
    /^語音訊息已傳送$/,
    /^位置資訊已傳送$/,
    /^聯絡人已傳送$/,
    /^已收回訊息$/,
  ];

  return cannedPatterns.some(pattern => pattern.test(content.trim()));
}
