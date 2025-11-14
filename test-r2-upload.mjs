import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// 使用您提供的環境變數
const r2Client = new S3Client({
  region: 'auto',
  endpoint: 'https://14a73ec296e8619d856c15bf5290a433.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '677b4852e72ca070ef1d1fc2a2dd5555',
    secretAccessKey: '413ff78a56af0be1fdc866a4ee7ce9c111a9edbdec8ef4e531f389823a9161e8',
  },
});

async function testUpload() {
  try {
    console.log('開始測試 R2 上傳...');
    
    const testData = Buffer.from('Test audio file content');
    const fileKey = 'inphic-crm/customers/0004/test-audio-' + Date.now() + '.mp3';
    
    console.log('上傳參數：');
    console.log('  Bucket:', 'inphic-crm');
    console.log('  Key:', fileKey);
    console.log('  Size:', testData.length, 'bytes');
    
    const command = new PutObjectCommand({
      Bucket: 'inphic-crm',
      Key: fileKey,
      Body: testData,
      ContentType: 'audio/mpeg',
    });
    
    const result = await r2Client.send(command);
    
    console.log('✅ 上傳成功！');
    console.log('Response:', result);
    
    const publicUrl = `https://pub-8fa82e9fb0484d31af0f18314c139583.r2.dev/${fileKey}`;
    console.log('公開 URL:', publicUrl);
    
  } catch (error) {
    console.error('❌ 上傳失敗！');
    console.error('錯誤信息:', error.message);
    console.error('完整錯誤:', error);
  }
}

testUpload();
