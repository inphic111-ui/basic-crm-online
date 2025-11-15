/**
 * R2 上傳 API 實現參考
 * 
 * 這個文件展示了如何使用 AWS SDK 上傳文件到 Cloudflare R2
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// 初始化 R2 客戶端
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * 上傳音檔到 R2
 * @param {Buffer} fileBuffer - 文件內容
 * @param {string} filename - 原始檔名
 * @param {string} mimeType - MIME 類型
 * @returns {Promise<{url: string, key: string}>}
 */
export async function uploadAudioToR2(fileBuffer, filename, mimeType = "audio/mpeg") {
  try {
    // 生成唯一的 key（保留原始檔名以便識別）
    const timestamp = Date.now();
    const key = `audio/${timestamp}_${filename}`;

    // 上傳到 R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
      // 設置公開讀取權限
      ACL: "public-read",
    });

    await r2Client.send(command);

    // 構建公開 URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;

    return {
      success: true,
      key,
      url: publicUrl,
      filename: filename,
    };
  } catch (error) {
    console.error("R2 上傳失敗:", error);
    throw new Error(`R2 上傳失敗: ${error.message}`);
  }
}

/**
 * 使用示例（在 server.mjs 中）
 * 
 * app.post('/api/audio/upload', async (req, res) => {
 *   try {
 *     if (!req.file) {
 *       return res.status(400).json({ error: '沒有文件上傳' });
 *     }
 *
 *     const { originalname, buffer, mimetype } = req.file;
 *
 *     // 上傳到 R2
 *     const result = await uploadAudioToR2(buffer, originalname, mimetype);
 *
 *     res.json({
 *       success: true,
 *       message: '文件上傳成功',
 *       data: result
 *     });
 *   } catch (error) {
 *     console.error('上傳失敗:', error);
 *     res.status(500).json({ error: error.message });
 *   }
 * });
 */
