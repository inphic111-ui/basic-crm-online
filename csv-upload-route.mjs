// CSV 上傳端點（插入到 server.mjs 中）
app.post('/api/csv/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '沒有選擇 CSV 檔案' });
    }

    const fileName = req.file.originalname;
    const fileContent = req.file.buffer.toString('utf-8');

    addLog("info", "開始處理 CSV 檔案", { fileName });

    // 解析 CSV 檔案
    const { metadata, conversations } = parseCSVFile(fileName, fileContent);
    
    const { customerId, customerName, productName } = metadata;

    if (!customerId) {
      return res.status(400).json({ error: '無法從檔案中提取客戶編號' });
    }

    addLog("info", "CSV 解析成功", { customerId, customerName, productName, totalConversations: conversations.length });

    // 連接資料庫
    const pool = pools.online;
    if (!pool) {
      return res.status(500).json({ error: '資料庫未連接' });
    }

    // 建立或取得客戶
    let customerDbId;
    const customerCheck = await pool.query(
      'SELECT id FROM ci_customers WHERE customer_id = $1',
      [customerId]
    );

    if (customerCheck.rows.length > 0) {
      customerDbId = customerCheck.rows[0].id;
      addLog("info", "客戶已存在", { customerId, customerDbId });
    } else {
      const customerInsert = await pool.query(
        `INSERT INTO ci_customers (customer_id, customer_name, product_name, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id`,
        [customerId, customerName, productName]
      );
      customerDbId = customerInsert.rows[0].id;
      addLog("info", "新客戶已建立", { customerId, customerDbId, customerName, productName });
    }

    // 處理對話記錄
    let newRecords = 0;
    let duplicateRecords = 0;
    let cannedMessages = 0;

    for (const conv of conversations) {
      const { senderType, senderName, timestamp, content } = conv;

      // 過濾罐頭訊息
      if (isCannedMessage(content)) {
        cannedMessages++;
        continue;
      }

      // 計算 SHA-256 hash
      const messageHash = calculateMessageHash(customerId, timestamp, content);

      // 檢查是否重複
      const hashCheck = await pool.query(
        'SELECT id FROM ci_interactions WHERE message_hash = $1',
        [messageHash]
      );

      if (hashCheck.rows.length > 0) {
        duplicateRecords++;
        continue;
      }

      // 插入新記錄
      await pool.query(
        `INSERT INTO ci_interactions 
         (ci_customer_id, sender_type, sender_name, timestamp, content, message_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [customerDbId, senderType, senderName, timestamp, content, messageHash]
      );

      newRecords++;
    }

    addLog("info", "CSV 匯入完成", { 
      fileName, 
      customerId, 
      totalRecords: conversations.length,
      newRecords, 
      duplicateRecords, 
      cannedMessages 
    });

    res.json({
      success: true,
      message: 'CSV 檔案已成功匯入',
      data: {
        customerId,
        customerName,
        productName,
        totalRecords: conversations.length,
        newRecords,
        duplicateRecords,
        cannedMessages,
      },
    });

  } catch (err) {
    addLog("error", "CSV 上傳失敗", { message: err.message, stack: err.stack });
    res.status(500).json({ error: err.message });
  }
});
